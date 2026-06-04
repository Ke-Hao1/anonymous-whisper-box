-- 毕业季不署名信箱 Supabase 数据库初始化脚本
-- 没有任何自定义敏感词设置。
-- 想改主人口令：把下面所有 '123456' 改成你自己的口令，再运行。

create extension if not exists pgcrypto;

create table if not exists public.whispers (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz not null default now()
);

-- 如果你之前运行过 120 字版本，这里会把旧字数限制改成 160。
alter table public.whispers drop constraint if exists whispers_content_check;
alter table public.whispers drop constraint if exists whispers_content_length_check;
alter table public.whispers add constraint whispers_content_length_check check (char_length(content) between 1 and 160);

alter table public.whispers enable row level security;

drop policy if exists "anyone can send a whisper" on public.whispers;

create policy "anyone can send a whisper"
on public.whispers
for insert
to anon
with check (char_length(content) between 1 and 160);

grant usage on schema public to anon;
grant insert on public.whispers to anon;

create or replace function public.owner_can_access(input_key text)
returns boolean
language sql
stable
as $$
  select input_key = '123456';
$$;

create or replace function public.get_whispers(input_key text)
returns table (id uuid, content text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.owner_can_access(input_key) then
    raise exception 'invalid owner key';
  end if;

  return query
  select w.id, w.content, w.created_at
  from public.whispers as w
  order by w.created_at desc
  limit 500;
end;
$$;

create or replace function public.delete_whisper(input_key text, whisper_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.owner_can_access(input_key) then
    raise exception 'invalid owner key';
  end if;

  delete from public.whispers where id = whisper_id;
end;
$$;

create or replace function public.clear_whispers(input_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.owner_can_access(input_key) then
    raise exception 'invalid owner key';
  end if;

  delete from public.whispers;
end;
$$;

revoke all on function public.get_whispers(text) from public;
revoke all on function public.delete_whisper(text, uuid) from public;
revoke all on function public.clear_whispers(text) from public;

grant execute on function public.get_whispers(text) to anon;
grant execute on function public.delete_whisper(text, uuid) to anon;
grant execute on function public.clear_whispers(text) to anon;

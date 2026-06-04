-- 毕业匿名留言板 v6：单页面多人公开留言板
-- 功能：每个人创建独立留言板；留言可公开或仅主人可见；留言人可匿名或署名。
-- 没有自定义敏感词系统。

create extension if not exists pgcrypto;

create table if not exists public.grad_boards (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 40),
  owner_key_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.grad_board_messages (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.grad_boards(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 160),
  author_name text not null default '匿名同学' check (char_length(author_name) between 1 and 20),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists grad_board_messages_public_idx
on public.grad_board_messages(board_id, is_public, created_at desc);

create index if not exists grad_board_messages_owner_idx
on public.grad_board_messages(board_id, created_at desc);

alter table public.grad_boards enable row level security;
alter table public.grad_board_messages enable row level security;

-- 不允许匿名用户直接读写表，全部通过安全函数。
revoke all on public.grad_boards from public, anon;
revoke all on public.grad_board_messages from public, anon;
grant usage on schema public to anon;

create or replace function public.v6_hash_owner_key(input_key text)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(input_key, ''), 'sha256'), 'hex');
$$;

create or replace function public.v6_create_board(mailbox_title text, input_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  clean_title text;
begin
  clean_title := left(trim(coalesce(mailbox_title, '我的毕业留言板')), 40);
  if clean_title = '' then
    clean_title := '我的毕业留言板';
  end if;

  if char_length(coalesce(input_key, '')) < 8 then
    raise exception 'owner key too short';
  end if;

  insert into public.grad_boards(title, owner_key_hash)
  values (clean_title, public.v6_hash_owner_key(input_key))
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.v6_owner_can_access(input_mailbox_id uuid, input_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.grad_boards b
    where b.id = input_mailbox_id
      and b.owner_key_hash = public.v6_hash_owner_key(input_key)
  );
$$;

create or replace function public.v6_get_board_public(input_mailbox_id uuid)
returns table (id uuid, title text, created_at timestamptz, public_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.title, b.created_at,
    (select count(*) from public.grad_board_messages m where m.board_id = b.id and m.is_public = true) as public_count
  from public.grad_boards b
  where b.id = input_mailbox_id
  limit 1;
$$;

create or replace function public.v6_get_public_messages(input_mailbox_id uuid, page_limit int default 80, page_offset int default 0)
returns table (id uuid, content text, author_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.content, m.author_name, m.created_at
  from public.grad_board_messages m
  where m.board_id = input_mailbox_id
    and m.is_public = true
  order by m.created_at desc
  limit least(greatest(page_limit, 1), 100)
  offset greatest(page_offset, 0);
$$;

create or replace function public.v6_send_message(input_mailbox_id uuid, message_content text, message_author text, message_is_public boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_content text;
  clean_author text;
begin
  clean_content := left(trim(coalesce(message_content, '')), 160);
  clean_author := left(trim(coalesce(message_author, '匿名同学')), 20);

  if clean_author = '' then
    clean_author := '匿名同学';
  end if;

  if not exists (select 1 from public.grad_boards where id = input_mailbox_id) then
    raise exception 'board not found';
  end if;

  if char_length(clean_content) < 1 or char_length(clean_content) > 160 then
    raise exception 'invalid content length';
  end if;

  insert into public.grad_board_messages(board_id, content, author_name, is_public)
  values (input_mailbox_id, clean_content, clean_author, coalesce(message_is_public, true));
end;
$$;

create or replace function public.v6_get_owner_messages(input_mailbox_id uuid, input_key text, page_limit int default 500, page_offset int default 0)
returns table (id uuid, content text, author_name text, is_public boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.v6_owner_can_access(input_mailbox_id, input_key) then
    raise exception 'invalid owner key';
  end if;

  return query
  select m.id, m.content, m.author_name, m.is_public, m.created_at
  from public.grad_board_messages m
  where m.board_id = input_mailbox_id
  order by m.created_at desc
  limit least(greatest(page_limit, 1), 500)
  offset greatest(page_offset, 0);
end;
$$;

create or replace function public.v6_set_message_public(input_mailbox_id uuid, input_key text, message_id uuid, next_is_public boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.v6_owner_can_access(input_mailbox_id, input_key) then
    raise exception 'invalid owner key';
  end if;

  update public.grad_board_messages
  set is_public = coalesce(next_is_public, false)
  where board_id = input_mailbox_id
    and id = message_id;
end;
$$;

create or replace function public.v6_delete_message(input_mailbox_id uuid, input_key text, message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.v6_owner_can_access(input_mailbox_id, input_key) then
    raise exception 'invalid owner key';
  end if;

  delete from public.grad_board_messages
  where board_id = input_mailbox_id
    and id = message_id;
end;
$$;

revoke all on function public.v6_hash_owner_key(text) from public;
revoke all on function public.v6_create_board(text, text) from public;
revoke all on function public.v6_owner_can_access(uuid, text) from public;
revoke all on function public.v6_get_board_public(uuid) from public;
revoke all on function public.v6_get_public_messages(uuid, int, int) from public;
revoke all on function public.v6_send_message(uuid, text, text, boolean) from public;
revoke all on function public.v6_get_owner_messages(uuid, text, int, int) from public;
revoke all on function public.v6_set_message_public(uuid, text, uuid, boolean) from public;
revoke all on function public.v6_delete_message(uuid, text, uuid) from public;

grant execute on function public.v6_create_board(text, text) to anon;
grant execute on function public.v6_get_board_public(uuid) to anon;
grant execute on function public.v6_get_public_messages(uuid, int, int) to anon;
grant execute on function public.v6_send_message(uuid, text, text, boolean) to anon;
grant execute on function public.v6_get_owner_messages(uuid, text, int, int) to anon;
grant execute on function public.v6_set_message_public(uuid, text, uuid, boolean) to anon;
grant execute on function public.v6_delete_message(uuid, text, uuid) to anon;

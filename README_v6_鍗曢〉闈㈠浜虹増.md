# 毕业匿名留言板 v6：单页面多人版

## 这版实现的需求

- 所有人只访问一个页面：`index.html`
- 每个人都可以创建自己的独立留言板
- 创建后只需要分享一个留言链接：`?box=留言板ID`
- 朋友打开链接后直接进入该用户的留言界面
- 朋友可以继续点击“我也创建”生成自己的留言板，方便传播
- 留言默认公开，留言人可以取消公开，改成仅主人可见
- 留言人可以匿名，也可以留下自己的名字
- 主人输入自己的密钥后，可以查看全部留言、删除留言、隐藏/公开留言
- 页面内提供“分享给微信”按钮：复制文案、微信内分享提示、生成二维码海报

## 上传到 GitHub 替换这些文件

- index.html
- style.css
- script.js
- config.js
- manifest.json
- sw.js
- share.png

v6 不再需要 inbox.html。

## Supabase 配置

1. 打开 Supabase 项目。
2. 进入 SQL Editor。
3. 完整运行 `supabase_setup.sql`。
4. 在 Supabase 项目设置里复制：
   - Project URL
   - anon public key / publishable key
5. 填到 `config.js`：

```js
window.MAILBOX_CONFIG = {
  SUPABASE_URL: "你的 Supabase URL",
  SUPABASE_PUBLISHABLE_KEY: "你的 Supabase anon public key"
};
```

## 测试地址

上传后用这个地址强制刷新新版：

```text
https://ke-hao1.github.io/anonymous-whisper-box/?v=6
```

## 使用流程

1. 用户打开首页。
2. 输入昵称/留言板名字。
3. 点击创建。
4. 页面生成：
   - 留言链接
   - 主人密钥
5. 用户截图保存主人密钥。
6. 用户点击“分享到微信”，复制文案或生成二维码海报。
7. 朋友打开链接后留言，可以选择公开/仅主人可见，也可以匿名/署名。
8. 主人打开同一个链接，点“我是主人”，输入密钥管理留言。

## 注意

- 没有注册登录，所以主人密钥忘记后无法找回。
- 数据库不保存明文密钥，只保存密钥哈希。
- 微信内网页不能用普通按钮强制弹出分享好友/朋友圈面板；低成本方案是复制文案、提示右上角分享、生成二维码海报。
- 第一版先不限制创建次数，后续如果被刷，可以加 Cloudflare Turnstile 或 Supabase Edge Function 限流。

## 兼容说明

本版的 Supabase RPC 函数使用 `v6_` 前缀，不会和之前 v4/v5 版本的同名函数冲突。

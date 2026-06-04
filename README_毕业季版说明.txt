毕业季不署名信箱 - 第 3 版

这版改动：
1. 移除了自定义敏感词拦截。
2. 页面主题改成毕业季。
3. 字数上限从 120 改成 160。
4. 增加了 3 个毕业季快捷文案按钮。
5. Supabase SQL 也同步改成 160 字上限。

需要上传到 GitHub 替换的文件：
- index.html
- inbox.html
- style.css
- script.js
- config.js
- manifest.json
- sw.js
- share.png

如果你已经接好了 Supabase：
1. 把旧 config.js 里的 SUPABASE_URL 和 SUPABASE_PUBLISHABLE_KEY 复制到新版 config.js。
2. 如果原数据库还是 120 字上限，去 Supabase 的 SQL Editor 运行 supabase_setup.sql；它会把旧限制改成 160。
3. 上传文件后用 ?v=3 测试，避免缓存。

测试地址示例：
首页：https://ke-hao1.github.io/anonymous-whisper-box/?v=3
主人页：https://ke-hao1.github.io/anonymous-whisper-box/inbox.html?key=123456&v=3

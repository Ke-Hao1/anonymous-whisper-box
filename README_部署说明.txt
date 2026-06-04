不署名信箱 - 第一版网页演示

你会得到这些文件：
- index.html：别人留言的首页
- inbox.html：主人查看悄悄话的页面
- style.css：页面样式
- script.js：交互逻辑
- manifest.json：手机添加到主屏幕用
- sw.js：缓存文件
- share.png：微信分享/网站图标

怎么上传到 GitHub Pages：
1. 新建一个 GitHub 仓库，推荐名字：anonymous-whisper-box
2. 把这个压缩包里的所有文件上传到仓库根目录，不要再套一层文件夹。
3. 进入仓库 Settings -> Pages。
4. Source 选择 Deploy from a branch。
5. Branch 选择 main，文件夹选择 /root，然后 Save。
6. 等几十秒到几分钟，打开：
   https://你的GitHub用户名.github.io/anonymous-whisper-box/

如果你的仓库名字不是 anonymous-whisper-box：
需要打开 index.html，把 head 里面这几个网址改成你的真实网址：
- og:image
- og:image:secure_url
- og:url
- twitter:image

主人查看入口：
https://你的GitHub用户名.github.io/anonymous-whisper-box/inbox.html?key=123456

修改主人口令：
打开 script.js，找到：
const OWNER_KEY = "123456";
把 123456 改成你自己的数字。

非常重要：
这个第一版只是“网页外壳 + 本机演示版”。
它把消息存在当前浏览器里，所以别人手机上发的消息，不会自动出现在你手机里的 inbox.html。
下一步要接 Supabase / LeanCloud / Cloudflare Workers 之类的云数据库，才能真正跨设备收匿名悄悄话。

# OAuth Worker（可选组件）

这个子目录是**方案 A（Cloudflare Pages + GitHub OAuth 代理）**所需的 Cloudflare Worker。
它的作用是让 Decap CMS 后台能够通过 GitHub 完成登录并向你的仓库提交内容，
**且不依赖 Netlify**。

只有当你的托管用 Cloudflare Pages、且希望社员用 GitHub 账号登录后台时才需要部署它。
如果你选择用 Netlify（git-gateway），则**无需**此目录，直接看主 README 的方案 B 即可。

## 部署步骤
1. 安装并登录 Wrangler：`npm i -g wrangler` → `wrangler login`
2. 在 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：
   - Homepage URL：填你的站点地址，如 `https://your-site.pages.dev`
   - Authorization callback URL：填 `https://你的worker名.workers.dev/callback`（先部署，再回来改）
3. 配置并部署：
   ```bash
   cd oauth-worker
   wrangler secret put GITHUB_CLIENT_SECRET
   # 编辑 wrangler.toml，在 vars 里写入 GITHUB_CLIENT_ID = "你的Client ID"
   wrangler deploy
   ```
4. 回到上一步的 OAuth App，把 callback 改成实际 worker 域名。
5. 在 `static/admin/config.yml` 里 `base_url: https://你的worker名.workers.dev`。

## 本地测试
```bash
cd oauth-worker
wrangler dev
```
浏览器访问 `http://localhost:8787/auth` 应跳转到 GitHub 登录页。

## 安全：来源白名单（重要）
Worker 只在**白名单内的站点 origin** 上回发授权结果（`postMessage` 不再使用 `"*"`），
`/auth` 会校验请求来源、`/callback` 会从 `state` 取回并**再次校验**该 origin。

- 配置项：Worker 变量 `ALLOWED_ORIGINS`（逗号分隔，例如
  `"https://yuyipages-beta.pages.dev,https://yuyi.example.cn"`）。
- 未配置时会回退到 `src/index.js` 里的 `DEFAULT_ALLOWED_ORIGINS`（默认是
  `https://yuyipages-beta.pages.dev`）。
- **绑定自定义域名后，务必把新域名加入 `ALLOWED_ORIGINS` 并重新部署**，否则后台登录会被拒绝。

> 修改 Worker 代码或变量后需要**重新部署**才会生效：
> 网页方式：Worker → Edit code 粘贴最新 `src/index.js` → Save and Deploy；
> 命令行方式：`wrangler deploy`。

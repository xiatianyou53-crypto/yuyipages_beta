# 辽宁省实验中学校园语意报社 · 官网

基于 **Hugo（静态站）+ Decap CMS（后台）+ Cloudflare Pages（托管）+ GitHub（仓库）** 的
校园社团官网。清新简约风格，支持手机与电脑，后台可视化上传校报与文章。

> **快速入口**
> - 管理员/技术负责人：见 **[docs/部署指南.md](docs/部署指南.md)**（上线全流程 + 验证清单 + 排查）。
> - 发布内容的社员：见 **[docs/操作指南.md](docs/操作指南.md)**（登录 + 上传校报 PDF + 发文章）。
> - 让 /admin/ 后台真正可用：见 **[docs/后台部署指南.md](docs/后台部署指南.md)**（OAuth App + Worker + Cloudflare Access + 邀请社员）。
> - 想自己改外观/文字/配色/导航：见 **[docs/前端修改指南.md](docs/前端修改指南.md)**。
> - `oauth-worker/` 为可选组件（Cloudflare 方案 A 的后台登录 Worker）。

> 目录说明：源码在仓库根目录；`public/` 为本地构建产物，不提交。

---

## 一、技术栈与目录

```
config.yaml              # Hugo 配置（标题/菜单/分页/中文等）
content/                 # 内容（Markdown）
  newspaper/             # 校报归档（示例 3 期）
  posts/                 # 文章（示例 3 篇）
  about.md               # 关于页
layouts/                 # 自研轻量布局（清新校园风，无外部主题依赖）
assets/css/main.css      # 主题样式
static/
  admin/config.yml       # Decap CMS 后台配置
  admin/index.html       # 后台入口
  images/                # logo、轮播、示例封面（SVG 占位）
  uploads/               # 上传的 PDF / 图片（含示例 PDF）
oauth-worker/            # (可选) Cloudflare Worker OAuth 代理，供后台登录
```

## 二、本地预览（开发）

1. 安装 [Hugo Extended](https://gohugo.io/installation/)（要求 0.128 及以上；项目在 0.165 验证）。
2. 在项目根目录运行：
   ```bash
   hugo server            # 访问 http://localhost:1313
   ```
3. 生产构建（Cloudflare 也用它）：
   ```bash
   hugo --minify          # 输出到 public/
   ```

> 示例内容里校报 PDF 为占位文件；封面/轮播用本地 SVG 占位，可在后台或
> `config.yaml` 的 `params.carousel` 中换成真实照片（照片放 `static/images/` 更合适）。

---

## 三、部署到 Cloudflare Pages

### 步骤 1：创建 GitHub 仓库并推送
```bash
git init
git add -A
git commit -m "init 校园语意报社官网"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

### 步骤 2：Cloudflare Pages 连接仓库并配置构建
1. Cloudflare 控制台 → **Workers & Pages → Create → Pages → Connect to Git**，授权并选择该仓库。
2. 构建配置：
   - **Production branch**: `main`
   - **Build command**: `hugo --minify`
   - **Build output directory**: `public`
   - **Framework preset**: Hugo（会自动填入以上项；如未显示请手动填）
   - **Environment variables**：无需必须项；如需修改 baseURL 可使用 `HUGO_ENV` 等。
3. 点击 **Save and Deploy**。首次构建成功后得到形如 `xxx.pages.dev` 的地址。
   > 若拉取不到 Hugo：在 Pages 里可添加 `HUGO_VERSION` 环境变量（如 `0.165.0`）以锁定版本。

### 步骤 3：（推荐）绑定自定义域名
在 Pages → 你的项目 → **Custom domains** → 添加域名，并按提示在 DNS 处加 CNAME 记录。
国内访问建议绑定可用的自定义域名，`pages.dev` 默认域名在国内访问可能不稳定。

### 步骤 4：（必做）把正式域名写入配置
编辑 `config.yaml` 中的 `baseURL`，并同步到 `static/admin/config.yml` 的 `site_url`，再次推送触发部署。

### 步骤 5：后台登录 —— 三选一（推荐 A）

**方案 A：Cloudflare Pages + GitHub OAuth 代理 Worker（免费、社员用 GitHub 登录）**
1. 按 `oauth-worker/README.md` 部署 Worker，并创建 GitHub OAuth App。
2. 在 `static/admin/config.yml` 取消注释并填写 `base_url` 指向你的 Worker：
   ```yaml
   backend:
     name: github
     repo: <用户名>/<仓库名>      # ← 改成你的仓库
     branch: main
     base_url: https://你的worker名.workers.dev
     auth_endpoint: auth
   ```
3. （可选，强烈建议）用 **Cloudflare Access** 保护 `/admin/*`：在
   Zero Trust → Access → Applications 里新建 **Self-hosted**，子域选 Pages 域名，
   Path 填 `/admin`，Policy 填"邮箱/社交登录"并只允许你邀请的社员邮箱。
   这样即使用户有 GitHub 权限，也需要先过 Access 这道门。
4. 推送后，`https://你的站点/admin/` 即为后台入口。

**方案 B：改用 Netlify（最省事，含一键登录与 git 提交，无需自建 Worker）**
> 若你更看重"零维护"，可把站点托管到 Netlify 并只把后台跑在 Netlify（或整体迁移）。
1. 把 `static/admin/config.yml` 顶部 backend 换成：
   ```yaml
   backend:
     name: git-gateway
     branch: main
   publish_mode: editorial_workflow
   ```
2. Netlify 后台 → **Identity → Enable** → 注册测试账号 → **Invite users** 添加社员邮箱。
   社员会收到邀请邮件，用邮箱密码登录 `/admin/` 即可。
> 代价：登录与自动提交依赖 Netlify Identity，站点数据仍可留在 Cloudflare Pages 或迁移。

**方案 C：本地写内容 / 直接改 Markdown 提交**
不登录后台，直接编辑 `content/` 里的 Markdown 并 push 到 main，同样会自动触发部署。

> 权限建议：初期"所有被邀请的登录用户均可发布"。若需"管理员审核后才上线"，
> 用方案 B 并开启 `editorial_workflow`；或约束 GitHub 的 push 权限，仅给少数人写权限。

---

## 四、社员日常使用（后台）

1. 访问 `https://你的站点/admin/`，登录。
2. **新建/更新一期校报**：Collections → 校报 → New。填写期数、日期、
   上传 PDF（`拖入即可`，自动上传到 `static/uploads`）、可选封面上传、可选简介 → Save。
3. **发布文章**：Collections → 文章 → New。填标题、日期、正文（可视化/Markdown）、封面 → Save。
4. 保存后 Decap 会自动向 Git 仓库提交，**Cloudflare Pages 自动重新构建并上线**（一般几十秒）。
5. 首页会自动把最新一期校报放在显眼位置，文章列表也会自动更新。

### 上传文件注意事项
- PDF 单文件建议 **< 10MB**（Git 与构建均友好）。
- 若某期 PDF 很大，建议用 **Cloudflare R2**（免费 10GB）：
  把文件传到 R2 桶，设为公开读，再在后台校报的 `pdf` 字段填入 R2 的公开 URL 即可，
  前端 `<iframe>` 与下载链接均会正常工作（需 R2 开启自定义域以利国内访问）。

## 五、PDF 预览与下载说明
- 校报详情页用 `<iframe src="{{ .Params.pdf }}">` 预览，同源 PDF 会调用浏览器内置阅读器。
- 若 PDF 位于其它域（如 R2/跨域 CDN），部分浏览器可能不显示预览 —— 页面已提供
  "下载 PDF"按钮与提示文字作为兜底。移动端建议直接下载后用 App 打开。

## 六、常见问题
- **中文乱码**：所有文件均 UTF-8；请勿用 GBK 另存。
- **改了后台不生效**：确认 `repo`、`branch`、`base_url` 与实际一致；Cloudflare Pages 需部署成功。
- **想换配色**：编辑 `assets/css/main.css` 顶部 `:root` 里的变量即可。
- **新增栏目/菜单**：改 `config.yaml` 的 `menu.main`，再建对应 `content/<栏目>/` 目录与 `_index.md`。

## 七、文件编码与维护
本项目无外部 Hugo 主题依赖（布局自研），离线也能 `hugo server` 预览；
后台 `/admin/` 页面需联网加载 Decap CMS 脚本。升级 Hugo 或改模板均简单。

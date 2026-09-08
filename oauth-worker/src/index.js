// Cloudflare Worker —— Decap CMS 的 GitHub OAuth 代理
// 实现 Decap 期望的两个端点：/auth 与 /callback
// 1) /auth    ：重定向到 GitHub 授权页
// 2) /callback：用 code 换取 token，并通过 window.postMessage 交还给后台登录弹窗
//
// 部署前设置：
//   - 变量      GITHUB_CLIENT_ID     （GitHub OAuth App 的 Client ID）
//   - 机密      GITHUB_CLIENT_SECRET （wrangler secret put GITHUB_CLIENT_SECRET）
//   - 变量      GITHUB_SCOPE         默认 public_repo；若仓库为私有改为 repo

const CLIENT_ID = GITHUB_CLIENT_ID; // eslint-disable-line no-undef
const CLIENT_SECRET = GITHUB_CLIENT_SECRET; // eslint-disable-line no-undef
const SCOPE = (typeof GITHUB_SCOPE !== 'undefined' ? GITHUB_SCOPE : 'public_repo');

function html(title, msg) {
  return new Response(
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>' +
      title + '</title></head><body style="font-family:sans-serif;text-align:center;padding-top:60px">' +
      '<h2>' + msg + '</h2><p>此窗口可关闭。</p></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;
    const id = env.GITHUB_CLIENT_ID || CLIENT_ID;
    const secret = env.GITHUB_CLIENT_SECRET || CLIENT_SECRET;
    const scope = (env.GITHUB_SCOPE || SCOPE);
    const callback = origin + '/callback';

    // ---------- 授权入口 ----------
    if (url.pathname === '/auth') {
      const state = url.searchParams.get('state') || 'decap';
      const target =
        'https://github.com/login/oauth/authorize' +
        '?client_id=' + encodeURIComponent(id) +
        '&redirect_uri=' + encodeURIComponent(callback) +
        '&scope=' + encodeURIComponent(scope) +
        '&state=' + encodeURIComponent(state);
      return Response.redirect(target, 302);
    }

    // ---------- 回调换 token ----------
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') || 'decap';
      if (!code) return html('出错了', '缺少授权 code，请重试。');

      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: id,
          client_secret: secret,
          code: code,
          redirect_uri: callback,
        }),
      });
      const data = await res.json();

      if (!data.access_token) {
        return html('登录失败', (data.error_description || data.error || '未获得访问令牌') + '，请关闭重试。');
      }

      // 将 token 交还给打开本弹窗的 Decap 后台页面，然后关闭窗口
      const page =
        '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
        '<title>登录成功</title></head><body>' +
        '<script>' +
        'var token = ' + JSON.stringify(data.access_token) + ';' +
        'if (window.opener) {' +
        '  window.opener.postMessage({ token: token, provider: "github" }, "*");' +
        '  window.close();' +
        '} else {' +
        '  document.write("无法返回后台，请关闭此窗口并重试登录。");' +
        '}' +
        '</script></body></html>';
      return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return html('404', '路径不存在，请访问 /admin/ 进行登录。');
  },
};

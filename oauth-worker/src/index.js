// Cloudflare Worker —— Decap CMS 的 GitHub OAuth 代理
// 端点：/auth（跳转 GitHub 授权）、/callback（换 token 交还后台弹窗）
// 配置全部来自 Worker 变量/机密（env），不要在代码里写死密钥：
//   GITHUB_CLIENT_ID     变量
//   GITHUB_CLIENT_SECRET 机密
//   GITHUB_SCOPE         变量（公开仓库 public_repo，私有仓库 repo）

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;
    const id = env.GITHUB_CLIENT_ID || '';
    const secret = env.GITHUB_CLIENT_SECRET || '';
    const scope = env.GITHUB_SCOPE || 'repo';
    const callback = origin + '/callback';

    function page(title, msg) {
      return new Response(
        '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + title +
        '</title></head><body style="font-family:sans-serif;text-align:center;padding-top:60px"><h2>' +
        msg + '</h2><p>此窗口可关闭。</p></body></html>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // ---------- /auth 授权入口 ----------
    if (url.pathname === '/auth') {
      if (!id) return page('配置错误', '缺少 GITHUB_CLIENT_ID 变量。');
      const state = url.searchParams.get('state') || 'decap';
      const target =
        'https://github.com/login/oauth/authorize' +
        '?client_id=' + encodeURIComponent(id) +
        '&redirect_uri=' + encodeURIComponent(callback) +
        '&scope=' + encodeURIComponent(scope) +
        '&state=' + encodeURIComponent(state);
      return Response.redirect(target, 302);
    }

    // ---------- /callback 回调换 token ----------
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return page('出错了', '缺少授权 code，请重试。');
      if (!secret) return page('配置错误', '缺少 GITHUB_CLIENT_SECRET 机密。');

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
      let data = {};
      try { data = await res.json(); } catch (e) { /* ignore */ }

      if (!data.access_token) {
        return page('登录失败', (data.error_description || data.error || '未获得访问令牌') + '，请关闭重试。');
      }

      // 把 token 交还给打开本弹窗的 Decap 后台页面，然后关闭窗口
      const pageContent =
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
      return new Response(pageContent, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return page('404', '路径不存在，请访问 /admin/ 进行登录。');
  },
};


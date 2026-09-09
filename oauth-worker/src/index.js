// Cloudflare Worker —— Decap CMS 的 GitHub 授权服务器（Netlify 兼容握手协议）
//
// 与 Decap 后台 GitHub 登录端（NetlifyAuthenticator）的通信协议：
//   1) 后台打开弹窗  <base_url>/auth?provider=github&scope=repo
//   2) /auth 页面先向后台发握手  "authorizing:github"
//   3) 后台收到握手后切换为监听授权结果，并回发 "authorizing:github"
//   4) /auth 页面跳转到 GitHub 授权；GitHub 回跳到 /callback
//   5) /callback 用 code 换 token，向后台回传：
//       成功  "authorization:github:success:<json: {token}>"
//       失败  "authorization:github:error:<json: {message}>"
//
// 配置（Worker 变量/机密）：
//   GITHUB_CLIENT_ID      变量
//   GITHUB_CLIENT_SECRET  机密
//   GITHUB_SCOPE          变量（默认 repo）

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;
    const path = url.pathname;
    const provider = url.searchParams.get('provider') || 'github';
    const id = env.GITHUB_CLIENT_ID || '';
    const secret = env.GITHUB_CLIENT_SECRET || '';
    const callback = origin + '/callback';

    // ---------- /callback：GitHub 授权后回跳，换 token 并回传授权结果 ----------
    if (path === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return postResult(provider, true, '缺少授权 code，请重试。');
      if (!secret) return postResult(provider, true, '缺少 GITHUB_CLIENT_SECRET 机密。');

      let data = {};
      try {
        const res = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: id,
            client_secret: secret,
            code: code,
            redirect_uri: callback,
          }),
        });
        data = await res.json();
      } catch (e) { /* ignore */ }

      if (!data.access_token) {
        const msg = data.error_description || data.error || '未获得访问令牌';
        return postResult(provider, true, msg);
      }
      return postResult(provider, false, '', data.access_token);
    }

    // ---------- /auth：授权弹窗首页，先握手再跳转 GitHub ----------
    if (path === '/auth') {
      if (!id) return postResult(provider, true, '缺少 GITHUB_CLIENT_ID 变量。');
      const scope = url.searchParams.get('scope') || env.GITHUB_SCOPE || 'repo';
      const authUrl =
        'https://github.com/login/oauth/authorize' +
        '?client_id=' + encodeURIComponent(id) +
        '&redirect_uri=' + encodeURIComponent(callback) +
        '&scope=' + encodeURIComponent(scope) +
        '&state=' + encodeURIComponent('decap');
      return authPage(provider, authUrl);
    }

    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};

// 握手并跳转 GitHub 的弹窗页面
function authPage(provider, authUrl) {
  const js =
    'var provider=' + JSON.stringify(provider) + ';' +
    'var authUrl=' + JSON.stringify(authUrl) + ';' +
    'var handshake="authorizing:"+provider;' +
    'var sent=false;' +
    'function go(){ if(sent){return;} sent=true; window.location.replace(authUrl); }' +
    'if(window.opener){' +
    '  window.addEventListener("message",function(e){' +
    '    if(e.source===window.opener && e.data===handshake){ go(); }' +
    '  });' +
    '  window.opener.postMessage(handshake,"*");' +
    '  setTimeout(go,2000);' +
    '} else { go(); }';
  return pageHtml(
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>跳转中</title></head><body>' +
    '<script>' + js + '</script><p>正在连接 GitHub…</p></body></html>'
  );
}

// 向后台回传授权成功/失败结果并关闭弹窗
function postResult(provider, isError, message, token) {
  let payload;
  if (isError) {
    payload = JSON.stringify({ message: message || '登录失败' });
  } else {
    payload = JSON.stringify({ token: token });
  }
  const msg = (isError ? 'authorization:' : 'authorization:') +
    provider + (isError ? ':error:' : ':success:') + payload;
  const js =
    'var msg=' + JSON.stringify(msg) + ';' +
    'if(window.opener){' +
    '  window.opener.postMessage(msg,"*");' +
    '  window.close();' +
    '} else { document.write("授权完成，请关闭此窗口返回后台。"); }';
  return pageHtml(
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>登录</title></head><body>' +
    '<script>' + js + '</script></body></html>'
  );
}

function pageHtml(body) {
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}



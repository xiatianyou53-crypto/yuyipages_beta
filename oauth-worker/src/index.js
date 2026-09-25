// Cloudflare Worker —— Decap CMS 的 GitHub 授权服务器（Netlify 兼容握手协议）
//
// 安全说明：
//   回发给后台弹窗的消息只用「白名单内的站点 origin」作为 targetOrigin（不再用 "*"）。
//   - /auth     从请求的 Referer/Origin 推断来源，必须在白名单内，否则拒绝；
//   - /callback 从 state 取回该 origin 并再次校验，不通过则中止（不回发任何消息）。
//
// 变量（Worker 变量/机密）：
//   GITHUB_CLIENT_ID      变量
//   GITHUB_CLIENT_SECRET  机密
//   GITHUB_SCOPE          变量（默认 public_repo）
//   ALLOWED_ORIGINS       变量，逗号分隔的允许来源，例如
//                         "https://yuyipages-beta.pages.dev,https://你的自定义域名"
//                         （留空则回退到下面的默认值）

// 默认允许来源（部署后请改成你的真实站点域名；也可用 ALLOWED_ORIGINS 覆盖）
const DEFAULT_ALLOWED_ORIGINS = ['https://yuyipages-beta.pages.dev'];

function allowedOrigins(env) {
  const raw = env && env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS) : '';
  const list = raw.split(',')
    .map(function (s) { return s.trim().replace(/\/+$/, ''); })
    .filter(Boolean);
  return list.length ? list : DEFAULT_ALLOWED_ORIGINS.slice();
}

function originFromRequest(request) {
  const ref = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!ref) return '';
  try { return new URL(ref).origin; } catch (e) { return ''; }
}

function isAllowed(origin, list) {
  return !!origin && list.indexOf(origin) !== -1;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const provider = url.searchParams.get('provider') || 'github';
    const id = env.GITHUB_CLIENT_ID || '';
    const secret = env.GITHUB_CLIENT_SECRET || '';
    const callback = url.origin + '/callback';
    const list = allowedOrigins(env);

    // ---------- /callback：GitHub 授权后回跳，换 token 并按白名单回发结果 ----------
    if (path === '/callback') {
      let targetOrigin = '';
      try { targetOrigin = (JSON.parse(url.searchParams.get('state') || '') || {}).o || ''; } catch (e) {}

      if (!isAllowed(targetOrigin, list)) {
        return pageHtml(
          '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>已中止</title></head>' +
          '<body><p>来源未授权，登录已中止。请从站点后台重新发起登录。</p></body></html>'
        );
      }

      const code = url.searchParams.get('code');
      if (!code) return postResult(provider, targetOrigin, true, '缺少授权 code，请重试。');
      if (!secret) return postResult(provider, targetOrigin, true, '缺少 GITHUB_CLIENT_SECRET 机密。');

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
        return postResult(provider, targetOrigin, true, msg);
      }
      return postResult(provider, targetOrigin, false, '', data.access_token);
    }

    // ---------- /auth：授权弹窗首页，校验来源后再握手并跳转 GitHub ----------
    if (path === '/auth') {
      if (!id) return plainText('配置错误：缺少 GITHUB_CLIENT_ID 变量。');

      const refererOrigin = originFromRequest(request);
      // 带了来源但不在白名单 → 直接拒绝；完全无来源时（单一白名单）才兜底放行
      const targetOrigin = refererOrigin
        ? (isAllowed(refererOrigin, list) ? refererOrigin : '')
        : (list.length === 1 ? list[0] : '');
      if (!targetOrigin) {
        return plainText('来源未授权：请从站点后台（/admin/）发起登录。');
      }

      const scope = url.searchParams.get('scope') || env.GITHUB_SCOPE || 'public_repo';
      const state = encodeURIComponent(JSON.stringify({ o: targetOrigin }));
      const authUrl =
        'https://github.com/login/oauth/authorize' +
        '?client_id=' + encodeURIComponent(id) +
        '&redirect_uri=' + encodeURIComponent(callback) +
        '&scope=' + encodeURIComponent(scope) +
        '&state=' + state;
      return authPage(provider, authUrl, targetOrigin);
    }

    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};

// 握手并跳转 GitHub 的弹窗页面（postMessage 只发给 targetOrigin）
function authPage(provider, authUrl, targetOrigin) {
  const js =
    'var provider=' + JSON.stringify(provider) + ';' +
    'var authUrl=' + JSON.stringify(authUrl) + ';' +
    'var target=' + JSON.stringify(targetOrigin) + ';' +
    'var handshake="authorizing:"+provider;' +
    'var sent=false;' +
    'function go(){ if(sent){return;} sent=true; window.location.replace(authUrl); }' +
    'if(window.opener){' +
    '  window.addEventListener("message",function(e){' +
    '    if(e.source===window.opener && e.data===handshake){ go(); }' +
    '  });' +
    '  window.opener.postMessage(handshake,target);' +
    '  setTimeout(go,2000);' +
    '} else { go(); }';
  return pageHtml(
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>跳转中</title></head><body>' +
    '<script>' + js + '</script><p>正在连接 GitHub…</p></body></html>'
  );
}

// 向后台回传授权成功/失败结果并关闭弹窗（只发给 targetOrigin）
function postResult(provider, targetOrigin, isError, message, token) {
  let payload;
  if (isError) {
    payload = JSON.stringify({ message: message || '登录失败' });
  } else {
    payload = JSON.stringify({ token: token });
  }
  const msg = 'authorization:' + provider + (isError ? ':error:' : ':success:') + payload;
  const js =
    'var msg=' + JSON.stringify(msg) + ';' +
    'var target=' + JSON.stringify(targetOrigin) + ';' +
    'if(window.opener){' +
    '  window.opener.postMessage(msg,target);' +
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

function plainText(text) {
  return new Response(text, { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}


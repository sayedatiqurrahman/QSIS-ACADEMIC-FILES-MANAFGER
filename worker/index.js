const ALLOWED_EMAIL_REGEX = /^q\d{5,8}@ugrad\.iiuc\.ac\.bd$/i;
const RATE_LIMIT = new Map();
const SESSION_TTL = 15 * 24 * 60 * 60;

function corsHeaders(origin, env, extra = {}) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...extra
  };
}

function jsonResponse(origin, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) }
  });
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000;
  const maxReqs = 15;
  if (!RATE_LIMIT.has(ip)) RATE_LIMIT.set(ip, []);
  const hits = RATE_LIMIT.get(ip).filter(t => now - t < windowMs);
  RATE_LIMIT.set(ip, hits);
  if (hits.length >= maxReqs) return false;
  hits.push(now);
  return true;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function exchangeCode(code, env) {
  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUBCLIENTID,
        client_secret: env.GITHUBCLIENTSECRET,
        code: code
      })
    });
    const text = await tokenRes.text();
    try {
      tokenData = JSON.parse(text);
    } catch (e) {
      throw new Error('GitHub returned an invalid response. Try again.');
    }
  } catch (e) {
    throw new Error('Could not reach GitHub. Check your connection.');
  }

  if (tokenData.error) {
    var desc = tokenData.error_description || tokenData.error;
    if (desc.includes('code') && desc.includes('expir')) {
      throw new Error('Login code expired. Please try again.');
    }
    if (desc.includes('incorrect')) {
      throw new Error('Login failed. Please try again.');
    }
    throw new Error(desc || 'GitHub login failed');
  }

  if (!tokenData.access_token) {
    throw new Error('No access token received from GitHub. Please try again.');
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': 'token ' + tokenData.access_token,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  const user = await userRes.json();
  return {
    access_token: tokenData.access_token,
    user: {
      login: user.login,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      name: user.name,
      id: user.id,
      bio: user.bio,
      company: user.company,
      location: user.location,
      email: user.email,
      created_at: user.created_at
    }
  };
}

function getSpaOrigin(url) {
  return url.searchParams.get('origin') || 'http://localhost:5500';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (!checkRateLimit(ip)) {
      return jsonResponse(origin, env, { error: 'Rate limit exceeded' }, 429);
    }

    try {
      if (url.pathname === '/callback' && request.method === 'GET') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const spaOrigin = getSpaOrigin(url);

        if (error) {
          return new Response(null, { status: 302, headers: { Location: spaOrigin + '/#/callback?error=' + encodeURIComponent(error) } });
        }
        if (!code) {
          return new Response(null, { status: 302, headers: { Location: spaOrigin + '/#/callback?error=no_code' } });
        }

        try {
          const result = await exchangeCode(code, env);
          const sessionToken = generateSessionToken();

          await env.SESSIONS.put('session:' + sessionToken, JSON.stringify({
            access_token: result.access_token,
            user: result.user,
            created_at: Date.now()
          }), { expirationTtl: SESSION_TTL });

          var payload = encodeURIComponent(JSON.stringify({
            access_token: result.access_token,
            user: result.user,
            session: sessionToken
          }));
          return new Response(null, { status: 302, headers: { Location: spaOrigin + '/#/callback?data=' + payload } });
        } catch (err) {
          var errMsg = err.message || 'Unknown error';
          if (errMsg.includes('Request') || errMsg.includes('fetch')) {
            errMsg = 'Network error. Check connection and try again.';
          }
          return new Response(null, { status: 302, headers: { Location: spaOrigin + '/#/callback?error=' + encodeURIComponent(errMsg) } });
        }
      }

      if (url.pathname === '/api/session-validate' && request.method === 'POST') {
        const body = await request.json();
        const { session } = body;
        if (!session) return jsonResponse(origin, env, { error: 'No session token' }, 401);
        const sessionData = await env.SESSIONS.get('session:' + session);
        if (!sessionData) return jsonResponse(origin, env, { error: 'Session expired' }, 401);
        const sess = JSON.parse(sessionData);
        await env.SESSIONS.put('session:' + session, sessionData, { expirationTtl: SESSION_TTL });
        return jsonResponse(origin, env, { valid: true, user: sess.user, access_token: sess.access_token, created_at: sess.created_at });
      }

      if (url.pathname === '/api/logout' && request.method === 'POST') {
        const body = await request.json();
        if (body.session) await env.SESSIONS.delete('session:' + body.session);
        return jsonResponse(origin, env, { success: true });
      }

      if (url.pathname === '/api/verify-email' && request.method === 'POST') {
        const body = await request.json();
        if (!body.email) return jsonResponse(origin, env, { error: 'Missing email' }, 400);
        if (!ALLOWED_EMAIL_REGEX.test(body.email)) return jsonResponse(origin, env, { error: 'Invalid email' }, 400);
        const code = generateCode();
        await env.SESSIONS.put('verify:' + body.email, code, { expirationTtl: 600 });
        return jsonResponse(origin, env, { success: true, _dev_code: code });
      }

      if (url.pathname === '/api/check-email' && request.method === 'POST') {
        const body = await request.json();
        if (!body.email || !body.code) return jsonResponse(origin, env, { error: 'Missing fields' }, 400);
        const stored = await env.SESSIONS.get('verify:' + body.email);
        if (stored !== body.code) return jsonResponse(origin, env, { error: 'Invalid code' }, 400);
        await env.SESSIONS.delete('verify:' + body.email);
        return jsonResponse(origin, env, { success: true, email: body.email, verified: true });
      }

      if (url.pathname === '/api/health') {
        return jsonResponse(origin, env, { status: 'ok' });
      }

      return jsonResponse(origin, env, { error: 'Not found' }, 404);

    } catch (err) {
      return jsonResponse(origin, env, { error: err.message || 'Unknown error' }, 500);
    }
  }
};

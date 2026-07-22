const ALLOWED_EMAIL_REGEX = /^q\d{5,8}@ugrad\.iiuc\.ac\.bd$/i;
const RATE_LIMIT = new Map();

function corsHeaders(origin, extra = {}) {
  const allowed = (ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...extra
  };
}

function jsonResponse(origin, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!checkRateLimit(ip)) {
      return jsonResponse(origin, { error: 'Rate limit exceeded. Try again in 1 minute.' }, 429);
    }

    try {
      if (url.pathname === '/api/exchange-token' && request.method === 'POST') {
        const body = await request.json();
        const { code } = body;
        if (!code) return jsonResponse(origin, { error: 'Missing code parameter' }, 400);

        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code
          })
        });

        const tokenData = await tokenRes.json();
        if (tokenData.error) {
          return jsonResponse(origin, { error: tokenData.error_description || tokenData.error }, 400);
        }

        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${tokenData.access_token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        const user = await userRes.json();

        return jsonResponse(origin, {
          access_token: tokenData.access_token,
          user: {
            login: user.login,
            avatar_url: user.avatar_url,
            html_url: user.html_url,
            name: user.name,
            id: user.id
          }
        });
      }

      if (url.pathname === '/api/verify-email' && request.method === 'POST') {
        const body = await request.json();
        const { email } = body;
        if (!email) return jsonResponse(origin, { error: 'Missing email' }, 400);
        if (!ALLOWED_EMAIL_REGEX.test(email)) {
          return jsonResponse(origin, {
            error: 'Invalid email. Only IIUC university emails (q{number}@ugrad.iiuc.ac.bd) are allowed.'
          }, 400);
        }

        const code = generateCode();
        await env.put(`verify:${email}`, code, { expirationTtl: 600 });

        return jsonResponse(origin, {
          success: true,
          message: `Verification code sent to ${email}. Code expires in 10 minutes.`,
          _dev_code: code
        });
      }

      if (url.pathname === '/api/check-email' && request.method === 'POST') {
        const body = await request.json();
        const { email, code } = body;
        if (!email || !code) return jsonResponse(origin, { error: 'Missing email or code' }, 400);

        const stored = await env.get(`verify:${email}`);
        if (!stored || stored !== code) {
          return jsonResponse(origin, { error: 'Invalid or expired verification code.' }, 400);
        }

        await env.delete(`verify:${email}`);

        return jsonResponse(origin, {
          success: true,
          email: email,
          verified: true
        });
      }

      if (url.pathname === '/api/health') {
        return jsonResponse(origin, { status: 'ok', timestamp: Date.now() });
      }

      return jsonResponse(origin, { error: 'Not found' }, 404);

    } catch (err) {
      return jsonResponse(origin, { error: 'Internal server error: ' + err.message }, 500);
    }
  }
};

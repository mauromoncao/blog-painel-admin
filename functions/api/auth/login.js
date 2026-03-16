// CF Pages Function — /api/auth/login
// Translates REST POST /api/auth/login → tRPC POST /api/trpc/auth.login on VPS
// Falls back to local JWT auth if VPS is unavailable
// Configure env vars: VPS_API_URL, JWT_SECRET, ADMIN_PASS_1, ADMIN_PASS_2, ADMIN_PASS_3

export async function onRequestPost(context) {
  const VPS_API = context.env.VPS_API_URL || 'http://181.215.135.202:3040'
  const JWT_SECRET = context.env.JWT_SECRET

  let body
  try {
    body = await context.request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const { email, password } = body || {}

  // --- Try VPS via tRPC ---
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 6000)

    // tRPC format: POST /api/trpc/auth.login with direct JSON body
    const vpsResponse = await fetch(`${VPS_API}/api/trpc/auth.login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Proto': 'https',
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    })
    clearTimeout(tid)

    if (vpsResponse.ok) {
      const vpsData = await vpsResponse.json()
      // tRPC response: { result: { data: { id, name, email, role, token } } }
      const userData = vpsData?.result?.data
      if (userData && userData.token) {
        return jsonResponse(userData, 200, userData.token)
      }
    } else {
      // VPS returned error (wrong credentials etc.)
      try {
        const errData = await vpsResponse.json()
        const errMsg = errData?.[0]?.error?.message
          || errData?.error?.message
          || errData?.message
          || 'Credenciais inválidas'
        return jsonResponse({ error: errMsg }, 401)
      } catch {
        return jsonResponse({ error: 'Credenciais inválidas' }, 401)
      }
    }
  } catch {
    // VPS is down — fall through to local fallback
  }

  // --- Local fallback auth (when VPS is offline) ---
  if (!JWT_SECRET) {
    return jsonResponse({ error: 'Server not configured (JWT_SECRET missing)' }, 503)
  }

  const ALLOWED_EMAILS = [
    'admin@mauromoncao.adv.br',
    'mauromoncaoestudos@gmail.com',
    'mauromoncaoadv.escritorio@gmail.com',
    'assistente@mauromoncao.adv.br',
  ]

  const adminPasswords = [
    context.env.ADMIN_PASS_1,
    context.env.ADMIN_PASS_2,
    context.env.ADMIN_PASS_3,
  ].filter(Boolean)

  const assistPasswords = [context.env.ASSIST_PASS_1].filter(Boolean)

  if (!email || !password) {
    return jsonResponse({ error: 'Email e senha obrigatórios' }, 400)
  }

  const emailLower = email.toLowerCase()

  if (!ALLOWED_EMAILS.includes(emailLower)) {
    return jsonResponse({ error: 'Email não autorizado' }, 401)
  }

  const allPasswords = [...adminPasswords, ...assistPasswords]
  if (allPasswords.length === 0 || !allPasswords.includes(password)) {
    return jsonResponse({ error: 'Credenciais inválidas' }, 401)
  }

  const role = adminPasswords.includes(password) ? 'admin' : 'assistente'
  const name = emailLower === 'admin@mauromoncao.adv.br' ? 'Mauro Moncao' :
    emailLower === 'mauromoncaoestudos@gmail.com' ? 'Mauro Estudos' : 'Admin'

  const payload = {
    id: 1,
    email: emailLower,
    name,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    fallback: true,
  }

  const token = await signJWT(payload, JWT_SECRET)
  return jsonResponse({ id: 1, name, email: emailLower, role, token }, 200, token)
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders('POST, OPTIONS'),
  })
}

// ─── Helpers ────────────────────────────────────────────────────

function corsHeaders(methods = 'GET, POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Credentials': 'true',
  }
}

function jsonResponse(data, status = 200, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(),
  }
  if (token) {
    headers['Set-Cookie'] = `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
  }
  return new Response(JSON.stringify(data), { status, headers })
}

async function signJWT(payload, secret) {
  const b64 = (s) => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64(JSON.stringify(payload))
  const sigInput = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigInput))
  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${sigInput}.${b64Sig}`
}

// CF Pages Function — /api/auth/login
// Translates REST POST /api/auth/login → tRPC POST /api/trpc/auth.login on VPS
// Falls back to local JWT auth if VPS is unavailable
// Configure CF Pages env vars: VPS_API_URL, JWT_SECRET, ADMIN_PASS_1, ADMIN_PASS_2, ADMIN_PASS_3

const ALLOWED_EMAILS = [
  'admin@mauromoncao.adv.br',
  'mauromoncaoestudos@gmail.com',
  'mauromoncaoadv.escritorio@gmail.com',
  'assistente@mauromoncao.adv.br',
]

const EMAIL_NAMES = {
  'admin@mauromoncao.adv.br': 'Mauro Moncao',
  'mauromoncaoestudos@gmail.com': 'Mauro Estudos',
  'mauromoncaoadv.escritorio@gmail.com': 'Mauro Escritório',
  'assistente@mauromoncao.adv.br': 'Assistente',
}

export async function onRequestPost(context) {
  // VPS_API_URL via [vars] no wrangler.toml ou CF Pages Dashboard
  // Usa HTTPS via api-gateway (api.mauromoncao.adv.br/blog) para CF Workers poderem acessar
  const VPS_API    = context.env.VPS_API_URL || 'https://api.mauromoncao.adv.br/blog'
  const JWT_SECRET = context.env.JWT_SECRET

  let body
  try {
    body = await context.request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const { email, password } = body || {}

  if (!email || !password) {
    return jsonResponse({ error: 'Email e senha obrigatórios' }, 400)
  }

  // ── 1. Tentar VPS via tRPC ─────────────────────────────────────
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 6000)

    const vpsResponse = await fetch(`${VPS_API}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    })
    clearTimeout(tid)

    if (vpsResponse.ok) {
      const vpsData = await vpsResponse.json()
      const userData = vpsData?.result?.data
      if (userData && userData.token) {
        return jsonResponse(userData, 200, userData.token)
      }
    } else {
      let errMsg = 'Credenciais inválidas'
      try {
        const errData = await vpsResponse.json()
        errMsg = errData?.[0]?.error?.message
          || errData?.error?.message
          || errData?.message
          || errMsg
      } catch { /* ignore */ }
      return jsonResponse({ error: errMsg }, 401)
    }
  } catch {
    // VPS indisponível — usar fallback local
  }

  // ── 2. Fallback local via env vars ─────────────────────────────
  if (!JWT_SECRET) {
    return jsonResponse({ error: 'Serviço temporariamente indisponível. Configure JWT_SECRET no CF Pages.' }, 503)
  }

  const emailLower = email.toLowerCase().trim()

  if (!ALLOWED_EMAILS.includes(emailLower)) {
    return jsonResponse({ error: 'Email não autorizado' }, 401)
  }

  const isAssistente = emailLower === 'assistente@mauromoncao.adv.br'
  const validPasses = isAssistente
    ? [context.env.ASSIST_PASS_1].filter(Boolean)
    : [context.env.ADMIN_PASS_1, context.env.ADMIN_PASS_2, context.env.ADMIN_PASS_3].filter(Boolean)

  if (validPasses.length === 0 || !validPasses.includes(password)) {
    return jsonResponse({ error: 'Credenciais inválidas' }, 401)
  }

  const role = isAssistente ? 'assistente' : 'admin'
  const name = EMAIL_NAMES[emailLower] || 'Admin'
  const id   = emailLower === 'admin@mauromoncao.adv.br' ? 1 : 2

  const payload = {
    id, email: emailLower, name, role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    fallback: true,
  }

  const token = await signJWT(payload, JWT_SECRET)
  return jsonResponse({ id, name, email: emailLower, role, token }, 200, token)
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders('POST, OPTIONS') })
}

// ─── Helpers ─────────────────────────────────────────────────────

function corsHeaders(methods = 'GET, POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Credentials': 'true',
  }
}

function jsonResponse(data, status = 200, token = null) {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders() }
  if (token) {
    headers['Set-Cookie'] = `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
  }
  return new Response(JSON.stringify(data), { status, headers })
}

async function signJWT(payload, secret) {
  const b64 = s => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const hdr = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const bdy = b64(JSON.stringify(payload))
  const sigInput = `${hdr}.${bdy}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigInput))
  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${sigInput}.${b64Sig}`
}

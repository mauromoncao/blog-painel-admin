// CF Pages Function — /api/auth/me
// Validates JWT token and returns user info
// VPS auth.me reads token from Cookie (admin_token), NOT from Authorization header

export async function onRequestGet(context) {
  const VPS_API = context.env.VPS_API_URL || 'https://api.mauromoncao.adv.br/blog'
  const JWT_SECRET = context.env.JWT_SECRET

  const authHeader = context.request.headers.get('Authorization') || ''
  const cookieHeader = context.request.headers.get('Cookie') || ''

  let token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    const match = cookieHeader.match(/admin_token=([^;]+)/)
    if (match) token = match[1]
  }

  if (!token) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // ── 1. Try VPS via tRPC auth.me (pass token as Cookie) ─────────
  // VPS reads JWT from Cookie "admin_token", not from Authorization header
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 6000)

    const vpsResponse = await fetch(`${VPS_API}/api/trpc/auth.me`, {
      method: 'GET',
      headers: {
        'Cookie': `admin_token=${token}`,
        'X-Forwarded-Proto': 'https',
      },
      signal: controller.signal,
    })
    clearTimeout(tid)

    if (vpsResponse.ok) {
      const vpsData = await vpsResponse.json()
      // tRPC response: { result: { data: { id, name, email, role } } }
      const item = Array.isArray(vpsData) ? vpsData[0] : vpsData
      const userData = item?.result?.data?.json || item?.result?.data
      if (userData && userData.id) {
        return jsonResponse(userData, 200)
      }
    }
  } catch { /* VPS down or timeout → fallback */ }

  // ── 2. Fallback: validate JWT locally ──────────────────────────
  if (!JWT_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')

    const sigInput = `${parts[0]}.${parts[1]}`
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )

    const b64Sig = parts[2].replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - b64Sig.length % 4) % 4
    const sigBytes = atob(b64Sig + '='.repeat(pad))
    const sigArray = new Uint8Array(sigBytes.split('').map(c => c.charCodeAt(0)))

    const valid = await crypto.subtle.verify('HMAC', key, sigArray, new TextEncoder().encode(sigInput))
    if (!valid) throw new Error('Invalid signature')

    const b64Pay = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padP = (4 - b64Pay.length % 4) % 4
    const payload = JSON.parse(atob(b64Pay + '='.repeat(padP)))

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }

    // VPS JWT only contains { id, iat, exp } — enrich with known data
    // If name/email not in token, return minimal info (frontend will use cached login response)
    return jsonResponse({
      id: payload.id || 1,
      name: payload.name || 'Admin',
      email: payload.email || null,
      role: payload.role || 'admin',
    }, 200)
  } catch (err) {
    return jsonResponse({ error: err.message || 'Unauthorized' }, 401)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders('GET, OPTIONS'),
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  })
}

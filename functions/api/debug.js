// Debug endpoint — tests VPS connectivity and auth flow
export async function onRequestGet(context) {
  const VPS_API = context.env.VPS_API_URL || 'https://api.mauromoncao.adv.br/blog'
  
  let loginStatus = 0
  let loginResult = null
  let loginError = null
  let meStatus = 0
  let meResult = null

  // Test 1: Login
  let token = null
  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(`${VPS_API}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mauromoncao.adv.br', password: 'BenBlog@Admin2026' }),
      signal: ctrl.signal,
    })
    loginStatus = r.status
    if (r.ok) {
      const data = await r.json()
      token = data?.result?.data?.token
      loginResult = { ok: true, hasToken: !!token, email: data?.result?.data?.email }
    } else {
      const txt = await r.text()
      loginError = txt.substring(0, 200)
    }
  } catch (e) {
    loginError = e.message
  }

  // Test 2: Me (with cookie)
  if (token) {
    try {
      const ctrl2 = new AbortController()
      setTimeout(() => ctrl2.abort(), 6000)
      const r2 = await fetch(`${VPS_API}/api/trpc/auth.me`, {
        method: 'GET',
        headers: { 'Cookie': `admin_token=${token}` },
        signal: ctrl2.signal,
      })
      meStatus = r2.status
      if (r2.ok) {
        const data2 = await r2.json()
        const item = Array.isArray(data2) ? data2[0] : data2
        const userData = item?.result?.data?.json || item?.result?.data
        meResult = { ok: true, user: userData }
      }
    } catch (e) {
      meResult = { ok: false, error: e.message }
    }
  }

  return new Response(JSON.stringify({
    vps_url: VPS_API,
    login: { status: loginStatus, result: loginResult, error: loginError },
    me: { status: meStatus, result: meResult },
    env: {
      VPS_API_URL: context.env.VPS_API_URL || 'default',
      JWT_SECRET: !!context.env.JWT_SECRET,
      ADMIN_PASS_1: !!context.env.ADMIN_PASS_1,
      GOOGLE_CLIENT_ID: context.env.GOOGLE_CLIENT_ID?.substring(0,20) || 'not_set',
    },
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

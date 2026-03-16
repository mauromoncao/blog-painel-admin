// Debug endpoint — tests real login via VPS
export async function onRequestGet(context) {
  const VPS_API = context.env.VPS_API_URL || 'https://api.mauromoncao.adv.br/blog'
  
  let vpsResult = 'not_tested'
  let vpsStatus = 0
  let vpsError = null
  let loginResult = null

  // Test with real credentials
  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(`${VPS_API}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mauromoncao.adv.br', password: 'BenBlog@Admin2026' }),
      signal: ctrl.signal,
    })
    vpsStatus = r.status
    const txt = await r.text()
    vpsResult = txt.substring(0, 300)
    
    if (r.ok) {
      try {
        const data = JSON.parse(txt)
        loginResult = { ok: true, hasToken: !!data?.result?.data?.token, email: data?.result?.data?.email }
      } catch(e) { loginResult = { ok: false, parseError: e.message } }
    }
  } catch (e) {
    vpsError = e.message
    vpsResult = 'fetch_error'
  }

  return new Response(JSON.stringify({
    vps_url: VPS_API,
    vps_status: vpsStatus,
    vps_result_preview: vpsResult,
    vps_error: vpsError,
    login_result: loginResult,
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

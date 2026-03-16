// Debug endpoint — shows CF Function network capabilities
// Remove after debugging
export async function onRequestGet(context) {
  const VPS_API = context.env.VPS_API_URL || 'https://api.mauromoncao.adv.br/blog'
  
  let vpsResult = 'not_tested'
  let vpsStatus = 0
  let vpsError = null
  let envVars = {
    VPS_API_URL: !!context.env.VPS_API_URL,
    JWT_SECRET: !!context.env.JWT_SECRET,
    ADMIN_PASS_1: !!context.env.ADMIN_PASS_1,
    GOOGLE_CLIENT_ID: context.env.GOOGLE_CLIENT_ID || 'not_set',
  }

  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(`${VPS_API}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
      signal: ctrl.signal,
    })
    vpsStatus = r.status
    const txt = await r.text()
    vpsResult = txt.substring(0, 200)
  } catch (e) {
    vpsError = e.message
    vpsResult = 'fetch_error'
  }

  return new Response(JSON.stringify({
    vps_url: VPS_API,
    vps_status: vpsStatus,
    vps_result: vpsResult,
    vps_error: vpsError,
    env_vars: envVars,
    cf_worker: true,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

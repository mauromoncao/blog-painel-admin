export async function onRequest(context) {
  const VPS_API = context.env.VPS_API_URL || 'http://181.215.135.202:3040'
  const url = new URL(context.request.url)
  const targetUrl = VPS_API + url.pathname + url.search
  try {
    const response = await fetch(targetUrl, {
      method: context.request.method,
      headers: context.request.headers,
      body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
    })
    return new Response(response.body, { status: response.status, headers: response.headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'proxy error' }), { status: 502 })
  }
}

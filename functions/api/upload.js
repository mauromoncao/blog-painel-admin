// CF Pages Function — proxy /api/upload to VPS backend (blog-painel port 3040)
export async function onRequest(context) {
  const VPS_API = context.env.VPS_API_URL || 'http://181.215.135.202:3040'

  const url = new URL(context.request.url)
  const targetUrl = VPS_API + '/api/upload' + url.search

  const headers = new Headers(context.request.headers)
  headers.set('X-Forwarded-Host', url.hostname)
  headers.set('X-Forwarded-Proto', 'https')
  headers.delete('cf-connecting-ip')

  try {
    const response = await fetch(targetUrl, {
      method: context.request.method,
      headers,
      body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
    })

    const respHeaders = new Headers(response.headers)
    respHeaders.set('Access-Control-Allow-Origin', '*')
    respHeaders.set('Access-Control-Allow-Credentials', 'true')

    return new Response(response.body, {
      status: response.status,
      headers: respHeaders
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Upload proxy error', detail: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

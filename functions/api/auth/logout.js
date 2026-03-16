// CF Pages Function — /api/auth/logout
// Clears auth cookie and optionally notifies VPS via tRPC

export async function onRequestPost(context) {
  const VPS_API = context.env.VPS_API_URL || 'https://api.mauromoncao.adv.br/blog'

  // Try to notify VPS logout via tRPC (fire-and-forget)
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 3000)
    await fetch(`${VPS_API}/api/trpc/auth.logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': context.request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    })
  } catch { /* VPS down, proceed with local logout */ }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Set-Cookie': 'admin_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

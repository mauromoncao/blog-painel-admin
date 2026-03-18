// CF Pages Function — /api/upload
// Recebe JSON {name, type, size, data: base64} do PostEditor
// Tenta: 1) Imgur CDN  2) Cloudinary  3) proxy para VPS (fallback)
// Retorna {filename, originalName, mimeType, size, url, fileKey}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  // ── AUTH ──────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization') || '';
  const cookieHeader = request.headers.get('Cookie') || '';
  const hasAuth = authHeader.startsWith('Bearer ') || cookieHeader.includes('admin_token=');
  if (!hasAuth) return json({ error: 'Não autorizado' }, 401);

  // ── PARSE BODY ────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body JSON inválido' }, 400);
  }

  const { name, type, size, data: b64 } = body ?? {};
  if (!b64 || !name || !type) {
    return json({ error: 'Campos obrigatórios: name, type, data' }, 400);
  }
  if (size > 5 * 1024 * 1024) {
    return json({ error: 'Arquivo excede 5MB' }, 400);
  }
  if (!type.startsWith('image/')) {
    return json({ error: 'Apenas imagens são permitidas' }, 400);
  }

  // Extrair base64 puro (sem prefixo "data:...")
  const pureB64 = b64.startsWith('data:') ? b64.split(',')[1] : b64;
  const key = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  let publicUrl = null;

  // ── 1) Imgur CDN ──────────────────────────────────────────────
  const IMGUR_CLIENT_ID = env.IMGUR_CLIENT_ID || '546c25a59c58ad7';
  try {
    const imgurRes = await Promise.race([
      fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: pureB64, type: 'base64', name: key }),
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ]);
    if (imgurRes.ok) {
      const imgurData = await imgurRes.json();
      if (imgurData?.data?.link) {
        publicUrl = imgurData.data.link;
        console.log('[Upload] Imgur OK:', publicUrl);
      }
    } else {
      const errText = await imgurRes.text().catch(() => '');
      console.error('[Upload] Imgur HTTP', imgurRes.status, errText.slice(0, 200));
    }
  } catch (imgurErr) {
    console.error('[Upload] Imgur error:', imgurErr.message);
  }

  // ── 2) Cloudinary (se configurado) ───────────────────────────
  if (!publicUrl && env.CLOUDINARY_UPLOAD_PRESET && env.CLOUDINARY_CLOUD_NAME) {
    try {
      const dataUrl = `data:${type};base64,${pureB64}`;
      const formBody = new URLSearchParams();
      formBody.append('file', dataUrl);
      formBody.append('upload_preset', env.CLOUDINARY_UPLOAD_PRESET);
      const cdnRes = await Promise.race([
        fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formBody,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
      ]);
      if (cdnRes.ok) {
        const cdnData = await cdnRes.json();
        if (cdnData?.secure_url) {
          publicUrl = cdnData.secure_url;
          console.log('[Upload] Cloudinary OK:', publicUrl);
        }
      }
    } catch (cdnErr) {
      console.error('[Upload] Cloudinary error:', cdnErr.message);
    }
  }

  // ── 3) Fallback: proxy para VPS (que aceita JSON base64) ──────
  if (!publicUrl) {
    const VPS_API = env.VPS_API_URL || 'https://api.mauromoncao.adv.br/blog';
    try {
      const vpsRes = await Promise.race([
        fetch(`${VPS_API}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || `Bearer fallback`,
            'X-Forwarded-Host': new URL(request.url).hostname,
            'X-Forwarded-Proto': 'https',
          },
          body: JSON.stringify({ name, type, size, data: b64 }),
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
      ]);
      if (vpsRes.ok) {
        const vpsData = await vpsRes.json();
        if (vpsData?.url) {
          // VPS retorna URL relativa como /uploads/xxx.jpg — transformar em URL absoluta
          const rawUrl = vpsData.url;
          publicUrl = rawUrl.startsWith('http') ? rawUrl : `${VPS_API}${rawUrl}`;
          console.log('[Upload] VPS OK:', publicUrl);
          // Retornar resposta do VPS diretamente (já tem todos os campos)
          return json({ ...vpsData, url: publicUrl });
        }
      }
    } catch (vpsErr) {
      console.error('[Upload] VPS error:', vpsErr.message);
    }
  }

  // ── 4) Último recurso: salvar como data URL no banco via VPS tRPC ──
  if (!publicUrl) {
    // Guardar como data URL — o banco armazena e listPublic marca como '__base64__'
    // Isso evita erro mas a imagem não aparece no site público
    publicUrl = `data:${type};base64,${pureB64}`;
    console.warn('[Upload] FALLBACK base64 — imagem não aparecerá no site público');
  }

  const record = {
    filename: key,
    originalName: name,
    mimeType: type,
    size: size ?? 0,
    url: publicUrl,
    fileKey: key,
  };

  return json(record);
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
  });
}

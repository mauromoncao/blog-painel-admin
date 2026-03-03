// Login direto — página HTML sem depender do React/tRPC
// Acesse: /api/login-direto

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const HASH = process.env.ADMIN_PASSWORD_HASH ?? "";

const USERS = [
  { id: 1, email: "mauromoncaoestudos@gmail.com",       name: "Mauro Monção" },
  { id: 2, email: "mauromoncaoadv.escritorio@gmail.com", name: "Escritório Mauro Monção" },
];

export default async function handler(req, res) {
  // ── POST: processar login ─────────────────────────────────
  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { email, password } = body ?? {};

    const user = USERS.find(u => u.email?.toLowerCase() === email?.toLowerCase()?.trim());
    if (!user) return res.redirect("/api/login-direto?erro=credenciais");

    const ok = await bcrypt.compare(password, HASH);
    if (!ok) return res.redirect("/api/login-direto?erro=credenciais");

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    // Salvar cookie HttpOnly
    res.setHeader("Set-Cookie", `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax; Secure`);
    // Redirecionar para o painel com token na URL (frontend vai salvar no localStorage)
    return res.redirect(`/login-success?token=${token}`);
  }

  // ── GET: mostrar formulário HTML ──────────────────────────
  const erro = req.query?.erro;
  const erroMsg = erro === "credenciais" ? 
    `<div style="background:#fee2e2;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;">❌ E-mail ou senha incorretos. Tente novamente.</div>` : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel Administrativo — Login</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center;
           background: linear-gradient(135deg, #19385C 0%, #0f2240 100%); font-family: system-ui, sans-serif; }
    .card { background: white; border-radius: 16px; overflow: hidden; width: 100%; max-width: 420px; margin: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #19385C, #0f2240); padding: 32px 32px 24px; text-align: center; }
    .icon { width: 64px; height: 64px; background: #E8B84B; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .header h1 { color: white; font-size: 22px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 4px; }
    .body { padding: 32px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    input { width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px;
            outline: none; transition: border-color 0.2s; margin-bottom: 16px; color: #111; }
    input:focus { border-color: #E8B84B; }
    button { width: 100%; padding: 14px; background: linear-gradient(135deg, #E8B84B, #d4a039);
             color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700;
             cursor: pointer; transition: opacity 0.2s; }
    button:hover { opacity: 0.9; }
    .footer { padding: 0 32px 24px; text-align: center; }
    .footer p { font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1>Painel Administrativo</h1>
      <p>Mauro Monção Advogados Associados</p>
    </div>
    <div class="body">
      ${erroMsg}
      <form method="POST" action="/api/login-direto">
        <label>E-mail</label>
        <input type="email" name="email" placeholder="seu@email.com" required autofocus>
        <label>Senha</label>
        <input type="password" name="password" placeholder="••••••••" required>
        <button type="submit">Entrar no Painel</button>
      </form>
    </div>
    <div class="footer">
      <p>🔒 Acesso restrito — apenas administradores autorizados</p>
    </div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(html);
}

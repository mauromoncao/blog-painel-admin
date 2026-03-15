// api/auth/google/callback.js — Cloudflare Pages Function
// Callback do Google OAuth — SEM BANCO DE DADOS
// Usa usuários fixos igual ao api/index.js

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me";

// Mesmos usuários do api/index.js — sem banco necessário
const USERS = [
  { id: 1, email: "mauromoncaoestudos@gmail.com",        name: "Mauro Monção",           role: "admin" },
  { id: 2, email: "mauromoncaoadv.escritorio@gmail.com", name: "Escritório Mauro Monção", role: "admin" },
];

export default async function handler(req, res) {
  const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect("/login?error=google_denied");
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect("/login?error=google_not_configured");
  }

  try {
    // Base URL dinâmica — usa CORS_ORIGIN (Cloudflare Pages env) ou x-forwarded-host
    const baseUrl = process.env.CORS_ORIGIN
      ?? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // 1. Trocar code por access_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[Google OAuth] Token error:", await tokenRes.text());
      return res.redirect("/login?error=google_token_failed");
    }

    const tokens = await tokenRes.json();

    // 2. Buscar perfil do usuário no Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      return res.redirect("/login?error=google_token_failed");
    }

    const profile = await profileRes.json();
    const email   = profile.email?.toLowerCase().trim() ?? "";

    // 3. Verificar se email está na lista autorizada (sem banco!)
    const user = USERS.find(u => u.email === email);
    if (!user) {
      console.warn(`[Google OAuth] Acesso negado: ${email}`);
      return res.redirect("/login?error=email_not_authorized");
    }

    // 4. Gerar JWT e setar cookie HttpOnly (sem banco!)
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.setHeader("Set-Cookie",
      `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax; Secure`
    );

    // 5. Também salvar token na URL para o frontend guardar no localStorage
    return res.redirect(`/login-success?token=${encodeURIComponent(token)}`);

  } catch (err) {
    console.error("[Google OAuth] Erro interno:", err);
    return res.redirect("/login?error=google_internal_error");
  }
}

// api/auth/google/callback.js — Vercel Serverless Function
// Callback do Google OAuth — troca code por token, verifica email, gera JWT

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, getAdminByEmail, createAdminUser, updateLastSignedIn } from "../../../server/db.js";

const ALLOWED_EMAILS = [
  "mauromoncaoestudos@gmail.com",
  "mauromoncaoadv.escritorio@gmail.com",
];

export default async function handler(req, res) {
  const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const JWT_SECRET           = process.env.JWT_SECRET            ?? "change-me";

  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect("/login?error=google_denied");
  }

  try {
    // Base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

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

    // 2. Buscar perfil do usuário
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      return res.redirect("/login?error=google_profile_failed");
    }

    const profile = await profileRes.json();
    const email   = profile.email?.toLowerCase().trim() ?? "";

    // 3. Verificar whitelist
    if (!ALLOWED_EMAILS.includes(email)) {
      console.warn(`[Google OAuth] Acesso negado: ${email}`);
      return res.redirect("/login?error=email_not_authorized");
    }

    // 4. Buscar ou criar usuário admin
    let user = await getAdminByEmail(email);
    if (!user) {
      const randomPassword = Math.random().toString(36) + Date.now().toString(36);
      const hash = await bcrypt.hash(randomPassword, 12);
      user = await createAdminUser({
        email,
        name: profile.name ?? email.split("@")[0],
        passwordHash: hash,
        role: "admin",
        isActive: true,
      });
    }

    if (!user.isActive) {
      return res.redirect("/login?error=account_inactive");
    }

    await updateLastSignedIn(user.id);

    // 5. Gerar JWT e setar cookie
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.setHeader("Set-Cookie", [
      `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax; Secure`,
    ]);

    return res.redirect("/dashboard");

  } catch (err) {
    console.error("[Google OAuth] Erro interno:", err);
    return res.redirect("/login?error=google_internal_error");
  }
}

// api/auth/google.js — Cloudflare Pages Function
// Inicia o fluxo Google OAuth

export default function handler(req, res) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";

  if (!GOOGLE_CLIENT_ID) {
    return res.redirect("/login?error=google_not_configured");
  }

  // Base URL — usa CORS_ORIGIN (Cloudflare Pages env) ou x-forwarded-host
  const baseUrl = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN
    : `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const scope = encodeURIComponent("openid email profile");
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString("base64");

  const googleUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${state}` +
    `&prompt=select_account`;

  return res.redirect(googleUrl);
}

// api/index.js — Login simples sem banco de dados
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

// ── Usuários fixos no código ──────────────────────────────────
const USERS = [
  {
    id: 1,
    email: "mauromoncaoestudos@gmail.com",
    name: "Mauro Monção",
    role: "admin",
    passwordHash: process.env.ADMIN_PASSWORD_HASH ?? "",
  },
  {
    id: 2,
    email: "mauromoncaoadv.escritorio@gmail.com",
    name: "Escritório Mauro Monção",
    role: "admin",
    passwordHash: process.env.ADMIN_PASSWORD_HASH ?? "",
  },
];

function setAuthCookie(res, token) {
  res.setHeader("Set-Cookie", `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax`);
}

function getUserFromToken(req) {
  // 1. Tentar Authorization header (Bearer token do localStorage)
  const authHeader = req.headers.authorization ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // 2. Tentar cookie HttpOnly
  const cookie = req.headers.cookie ?? "";
  const match = cookie.match(/admin_token=([^;]+)/);
  const cookieToken = match?.[1] ?? null;

  const token = bearerToken ?? cookieToken;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return USERS.find(u => u.id === payload.id) ?? null;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url ?? "";

  // ── POST /api/auth/login ──────────────────────────────────
  if (url.includes("/api/trpc/auth.login") || url.includes("/api/auth/login")) {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const input = body?.json ?? body?.input ?? body;
      const { email, password } = input ?? {};

      const user = USERS.find(u => u.email?.toLowerCase() === email?.toLowerCase());
      if (!user) return res.status(200).json({ error: { message: "Credenciais inválidas" } });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(200).json({ error: { message: "Credenciais inválidas" } });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
      setAuthCookie(res, token);
      // Retornar token no body também (para localStorage no frontend)
      return res.status(200).json({
        result: {
          data: {
            json: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              token, // ← JWT no body para localStorage
            }
          }
        }
      });
    } catch (e) {
      return res.status(500).json({ error: { message: "Erro interno: " + e.message } });
    }
  }

  // ── GET /api/auth/me ──────────────────────────────────────
  if (url.includes("/api/trpc/auth.me") || url.includes("/api/auth/me")) {
    const user = getUserFromToken(req);
    if (!user) return res.status(200).json({ result: { data: { json: null } } });
    return res.status(200).json({ result: { data: { json: { id: user.id, name: user.name, email: user.email, role: user.role } } } });
  }

  // ── POST /api/auth/logout ─────────────────────────────────
  if (url.includes("/api/trpc/auth.logout") || url.includes("/api/auth/logout")) {
    res.setHeader("Set-Cookie", "admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    return res.status(200).json({ result: { data: { json: { ok: true } } } });
  }

  // ── Rotas protegidas — verificar token ────────────────────
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(200).json({ error: { code: "UNAUTHORIZED", message: "Não autorizado" } });
  }

  // ── Rotas de blog (mock simples) ──────────────────────────
  if (url.includes("blog.list") || url.includes("dashboard.recentPosts")) {
    return res.status(200).json({ result: { data: { json: [] } } });
  }
  if (url.includes("dashboard.stats")) {
    return res.status(200).json({ result: { data: { json: { posts: 0, leads: 0, categories: 0 } } } });
  }
  if (url.includes("dashboard.recentLeads")) {
    return res.status(200).json({ result: { data: { json: [] } } });
  }
  if (url.includes("categories.list")) {
    return res.status(200).json({ result: { data: { json: [] } } });
  }
  if (url.includes("leads.list")) {
    return res.status(200).json({ result: { data: { json: [] } } });
  }
  if (url.includes("settings.list")) {
    return res.status(200).json({ result: { data: { json: [] } } });
  }
  if (url.includes("media.list")) {
    return res.status(200).json({ result: { data: { json: [] } } });
  }
  if (url.includes("faq.list")) {
    return res.status(200).json({ result: { data: { json: [] } } });
  }

  // ── Default ───────────────────────────────────────────────
  return res.status(200).json({ result: { data: { json: null } } });
}

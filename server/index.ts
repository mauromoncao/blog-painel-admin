import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers.js";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import fs from "fs";
import { nanoid } from "nanoid";
import type { Request, Response } from "express";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(compression());
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://localhost:3001",
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith(".vercel.app")) {
      return cb(null, true);
    }
    cb(null, true); // permissivo em produção — restringir pelo env se necessário
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── tRPC ──────────────────────────────────────────────────────
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
  })
);

// ── File Upload ───────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid(12)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  const url = `/uploads/${req.file.filename}`;
  res.json({
    filename:     req.file.filename,
    originalName: req.file.originalname,
    mimeType:     req.file.mimetype,
    size:         req.file.size,
    url,
    fileKey:      req.file.filename,
  });
});

app.use("/uploads", express.static(uploadsDir));

// ── Google OAuth ─────────────────────────────────────────────
const ALLOWED_GOOGLE_EMAILS = [
  "mauromoncaoestudos@gmail.com",
  "mauromoncaoadv.escritorio@gmail.com",
];

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const JWT_SECRET_OAUTH     = process.env.JWT_SECRET            ?? "change-me-in-production";

// Determinar base URL dinamicamente
function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `${req.protocol}://${req.get("host")}`;
}

// Rota 1: Iniciar fluxo Google OAuth
app.get("/api/auth/google", (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.redirect("/login?error=google_not_configured");
  }
  const baseUrl    = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const scope      = encodeURIComponent("openid email profile");
  const state      = Buffer.from(JSON.stringify({ ts: Date.now() })).toString("base64");
  const googleUrl  =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${state}` +
    `&prompt=select_account`;
  return res.redirect(googleUrl);
});

// Rota 2: Callback Google OAuth
app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query as { code?: string; error?: string };

  if (error || !code) {
    return res.redirect("/login?error=google_denied");
  }

  try {
    const baseUrl     = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Trocar code por token
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

    const tokens = await tokenRes.json() as { access_token?: string; id_token?: string };

    // Buscar perfil do usuário
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      return res.redirect("/login?error=google_profile_failed");
    }

    const profile = await profileRes.json() as { email?: string; name?: string; picture?: string };
    const email   = profile.email?.toLowerCase().trim() ?? "";

    // ── Whitelist check ─────────────────────────────────────
    if (!ALLOWED_GOOGLE_EMAILS.includes(email)) {
      console.warn(`[Google OAuth] Acesso negado: ${email}`);
      return res.redirect("/login?error=email_not_authorized");
    }

    // Buscar ou criar admin no banco
    const { db: dbModule, getAdminByEmail, createAdminUser, updateLastSignedIn } = await import("./db.js");
    let user = await getAdminByEmail(email);

    if (!user) {
      // Criar admin automaticamente para email autorizado
      const bcrypt = await import("bcryptjs");
      const randomPassword = Math.random().toString(36) + Date.now().toString(36);
      const hash = await bcrypt.default.hash(randomPassword, 12);
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

    // Gerar JWT e setar cookie
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign({ id: user.id }, JWT_SECRET_OAUTH, { expiresIn: "7d" });

    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 86400 * 1000,
    });

    return res.redirect("/dashboard");

  } catch (err) {
    console.error("[Google OAuth] Erro:", err);
    return res.redirect("/login?error=google_internal_error");
  }
});

// ── Static Frontend ───────────────────────────────────────────
const distPublic = path.join(__dirname, "public");
if (process.env.NODE_ENV === "production" && fs.existsSync(distPublic)) {
  app.use(express.static(distPublic));
  app.get("*", (_req, res) => res.sendFile(path.join(distPublic, "index.html")));
}

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const httpServer = createServer(app);

export default app;

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Admin API running on port ${PORT}`);
  });
}

// api/index.js — Painel Admin Mauro Monção — CRUD completo com PostgreSQL VPS
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import postgres from "postgres";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

// ── Banco de dados ─────────────────────────────────────────────
let _sql = null;
function isDbAvailable() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || dbUrl === "postgresql://usuario:senha@host:5432/nome_do_banco") return false;
  return true;
}
function getDb() {
  if (_sql) return _sql;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL não configurada");
  _sql = postgres(dbUrl, { max: 3, idle_timeout: 5, connect_timeout: 5, max_lifetime: 60 });
  return _sql;
}

// ── Usuários fixos (fallback) ──────────────────────────────────
const FALLBACK_USERS = [
  { id: 1, email: "mauromoncaoestudos@gmail.com",        name: "Mauro Monção",              role: "admin", isActive: true, passwordHash: process.env.ADMIN_PASSWORD_HASH ?? "" },
  { id: 2, email: "mauromoncaoadv.escritorio@gmail.com", name: "Escritório Mauro Monção",    role: "admin", isActive: true, passwordHash: process.env.ADMIN_PASSWORD_HASH ?? "" },
];

// ── Auth helpers ───────────────────────────────────────────────
function setAuthCookie(res, token) {
  res.setHeader("Set-Cookie", `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax; Secure`);
}
function getTokenFromReq(req) {
  const auth = req.headers.authorization ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookie = req.headers.cookie ?? "";
  const m = cookie.match(/admin_token=([^;]+)/);
  return bearer ?? m?.[1] ?? null;
}
async function getUserFromToken(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const fallback = FALLBACK_USERS.find(u => u.id === payload.id);
    if (fallback) return fallback;
    if (isDbAvailable()) {
      try {
        const sql = getDb();
        const rows = await sql`SELECT id, email, name, role, "isActive" FROM admin_users WHERE id = ${payload.id} LIMIT 1`;
        const u = rows[0];
        if (u && u.isActive) return u;
      } catch { /* banco indisponível */ }
    }
    return null;
  } catch { return null; }
}

// ── withTimeout ────────────────────────────────────────────────
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("DB timeout " + ms + "ms")), ms))]);

// ── Criar tabelas ──────────────────────────────────────────────
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, "passwordHash" VARCHAR(255), name VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'admin', "isActive" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "lastSignedIn" TIMESTAMPTZ)`;
  await sql`CREATE TABLE IF NOT EXISTS blog_posts (id SERIAL PRIMARY KEY, slug VARCHAR(255) NOT NULL UNIQUE, title VARCHAR(255) NOT NULL, subtitle VARCHAR(500), excerpt TEXT, content TEXT, "coverImage" TEXT, "coverImageAlt" VARCHAR(255), "videoUrl" VARCHAR(500), "authorName" VARCHAR(255), category VARCHAR(128), tags VARCHAR(500), "metaTitle" VARCHAR(255), "metaDescription" TEXT, "metaKeywords" VARCHAR(500), "ogImage" TEXT, "ctaText" VARCHAR(255), "ctaUrl" VARCHAR(500), status VARCHAR(50) NOT NULL DEFAULT 'draft', "isFeatured" BOOLEAN NOT NULL DEFAULT FALSE, "isPublished" BOOLEAN NOT NULL DEFAULT FALSE, "publishedAt" TIMESTAMPTZ, "scheduledAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS blog_categories (id SERIAL PRIMARY KEY, slug VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, description TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS faq_items (id SERIAL PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, category VARCHAR(128), "isPublished" BOOLEAN NOT NULL DEFAULT TRUE, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(320), phone VARCHAR(20), message TEXT, source VARCHAR(128), status VARCHAR(50) NOT NULL DEFAULT 'new', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS media_files (id SERIAL PRIMARY KEY, filename VARCHAR(255) NOT NULL, "originalName" VARCHAR(255) NOT NULL, "mimeType" VARCHAR(128) NOT NULL, size INTEGER NOT NULL, url TEXT NOT NULL, "fileKey" VARCHAR(500) NOT NULL, alt VARCHAR(255), "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS site_settings (id SERIAL PRIMARY KEY, "settingKey" VARCHAR(128) NOT NULL UNIQUE, "settingValue" TEXT, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  tablesEnsured = true;
}

// ── Converter resultado postgres.js para array puro ───────────
function toArr(result) {
  if (!result) return [];
  // Forçar serialização/deserialização para garantir array JS puro
  try {
    const serialized = JSON.stringify(result);
    const parsed = JSON.parse(serialized);
    if (Array.isArray(parsed)) return parsed;
    // Se por algum motivo virou objeto, tentar converter
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed).filter(k => !isNaN(Number(k)));
      if (keys.length > 0) return keys.map(k => parsed[k]);
    }
  } catch {}
  return [];
}

// ── Executar uma única query tRPC ──────────────────────────────
async function execEndpoint(endpoint, input, sql) {
  if (endpoint === "dashboard.stats") {
    const [p, pub, dr, sc, ar, cat, med, lea, nlea, faq] = await Promise.all([
      sql`SELECT COUNT(*) c FROM blog_posts`,
      sql`SELECT COUNT(*) c FROM blog_posts WHERE status='published'`,
      sql`SELECT COUNT(*) c FROM blog_posts WHERE status='draft'`,
      sql`SELECT COUNT(*) c FROM blog_posts WHERE status='scheduled'`,
      sql`SELECT COUNT(*) c FROM blog_posts WHERE status='archived'`,
      sql`SELECT COUNT(*) c FROM blog_categories`,
      sql`SELECT COUNT(*) c FROM media_files`,
      sql`SELECT COUNT(*) c FROM leads`,
      sql`SELECT COUNT(*) c FROM leads WHERE status='new'`,
      sql`SELECT COUNT(*) c FROM faq_items`,
    ]);
    return { totalPosts: Number(p[0].c), published: Number(pub[0].c), drafts: Number(dr[0].c), scheduled: Number(sc[0].c), archived: Number(ar[0].c), totalCategories: Number(cat[0].c), totalMedia: Number(med[0].c), totalLeads: Number(lea[0].c), newLeads: Number(nlea[0].c), totalFaq: Number(faq[0].c) };
  }
  if (endpoint === "dashboard.recentPosts") return toArr(await sql`SELECT * FROM blog_posts ORDER BY "createdAt" DESC LIMIT 5`);
  if (endpoint === "dashboard.recentLeads") return toArr(await sql`SELECT * FROM leads ORDER BY "createdAt" DESC LIMIT 5`);

  if (endpoint === "blog.list") return toArr(await sql`SELECT * FROM blog_posts ORDER BY "createdAt" DESC`);
  if (endpoint === "blog.getById") {
    const id = Number(input?.id);
    if (!id) return null;
    const rows = await sql`SELECT * FROM blog_posts WHERE id=${id} LIMIT 1`;
    return rows[0] ?? null;
  }
  if (endpoint === "blog.upsert") {
    const d = input;
    const isPub = d.status === "published";
    const pubAt = isPub ? (d.publishedAt ? new Date(d.publishedAt) : new Date()) : (d.publishedAt ? new Date(d.publishedAt) : null);
    const schAt = d.scheduledAt ? new Date(d.scheduledAt) : null;
    if (d.id) {
      const rows = await sql`UPDATE blog_posts SET slug=${d.slug},title=${d.title},subtitle=${d.subtitle??null},excerpt=${d.excerpt??null},content=${d.content??null},"coverImage"=${d.coverImage??null},"coverImageAlt"=${d.coverImageAlt??null},"videoUrl"=${d.videoUrl??null},"authorName"=${d.authorName??null},category=${d.category??null},tags=${d.tags??null},"metaTitle"=${d.metaTitle??null},"metaDescription"=${d.metaDescription??null},"metaKeywords"=${d.metaKeywords??null},"ogImage"=${d.ogImage??null},"ctaText"=${d.ctaText??null},"ctaUrl"=${d.ctaUrl??null},status=${d.status??'draft'},"isFeatured"=${d.isFeatured??false},"isPublished"=${isPub},"publishedAt"=${pubAt},"scheduledAt"=${schAt},"updatedAt"=NOW() WHERE id=${d.id} RETURNING *`;
      return rows[0];
    }
    const rows = await sql`INSERT INTO blog_posts (slug,title,subtitle,excerpt,content,"coverImage","coverImageAlt","videoUrl","authorName",category,tags,"metaTitle","metaDescription","metaKeywords","ogImage","ctaText","ctaUrl",status,"isFeatured","isPublished","publishedAt","scheduledAt") VALUES (${d.slug},${d.title},${d.subtitle??null},${d.excerpt??null},${d.content??null},${d.coverImage??null},${d.coverImageAlt??null},${d.videoUrl??null},${d.authorName??null},${d.category??null},${d.tags??null},${d.metaTitle??null},${d.metaDescription??null},${d.metaKeywords??null},${d.ogImage??null},${d.ctaText??null},${d.ctaUrl??null},${d.status??'draft'},${d.isFeatured??false},${isPub},${pubAt},${schAt}) RETURNING *`;
    return rows[0];
  }
  if (endpoint === "blog.delete") {
    await sql`DELETE FROM blog_posts WHERE id=${Number(input?.id)}`;
    return { ok: true };
  }

  if (endpoint === "categories.list") return toArr(await sql`SELECT * FROM blog_categories ORDER BY "sortOrder" ASC, name ASC`);
  if (endpoint === "categories.upsert") {
    const d = input;
    if (d.id) {
      const rows = await sql`UPDATE blog_categories SET slug=${d.slug},name=${d.name},description=${d.description??null},"sortOrder"=${d.sortOrder??0} WHERE id=${d.id} RETURNING *`;
      return rows[0];
    }
    const rows = await sql`INSERT INTO blog_categories (slug,name,description,"sortOrder") VALUES (${d.slug},${d.name},${d.description??null},${d.sortOrder??0}) RETURNING *`;
    return rows[0];
  }
  if (endpoint === "categories.delete") {
    await sql`DELETE FROM blog_categories WHERE id=${Number(input?.id)}`;
    return { ok: true };
  }

  if (endpoint === "faq.list") return toArr(await sql`SELECT * FROM faq_items ORDER BY "sortOrder" ASC, id ASC`);
  if (endpoint === "faq.upsert") {
    const d = input;
    if (d.id) {
      const rows = await sql`UPDATE faq_items SET question=${d.question},answer=${d.answer},category=${d.category??null},"isPublished"=${d.isPublished??true},"sortOrder"=${d.sortOrder??0},"updatedAt"=NOW() WHERE id=${d.id} RETURNING *`;
      return rows[0];
    }
    const rows = await sql`INSERT INTO faq_items (question,answer,category,"isPublished","sortOrder") VALUES (${d.question},${d.answer},${d.category??null},${d.isPublished??true},${d.sortOrder??0}) RETURNING *`;
    return rows[0];
  }
  if (endpoint === "faq.delete") {
    await sql`DELETE FROM faq_items WHERE id=${Number(input?.id)}`;
    return { ok: true };
  }

  if (endpoint === "leads.list") return toArr(await sql`SELECT * FROM leads ORDER BY "createdAt" DESC`);
  if (endpoint === "leads.updateStatus") {
    const rows = await sql`UPDATE leads SET status=${input.status},"updatedAt"=NOW() WHERE id=${Number(input?.id)} RETURNING *`;
    return rows[0];
  }
  if (endpoint === "leads.delete") {
    await sql`DELETE FROM leads WHERE id=${Number(input?.id)}`;
    return { ok: true };
  }

  if (endpoint === "media.list") return toArr(await sql`SELECT * FROM media_files ORDER BY "createdAt" DESC`);
  if (endpoint === "media.upload") {
    const d = input;
    const rows = await sql`INSERT INTO media_files (filename,"originalName","mimeType",size,url,"fileKey",alt) VALUES (${d.filename},${d.originalName},${d.mimeType},${d.size},${d.url},${d.fileKey},${d.alt??null}) RETURNING *`;
    return rows[0];
  }
  if (endpoint === "media.delete") {
    const rows = await sql`SELECT * FROM media_files WHERE id=${Number(input?.id)} LIMIT 1`;
    await sql`DELETE FROM media_files WHERE id=${Number(input?.id)}`;
    return rows[0] ?? null;
  }

  if (endpoint === "settings.list") return toArr(await sql`SELECT * FROM site_settings`);
  if (endpoint === "settings.upsert") {
    await sql`INSERT INTO site_settings ("settingKey","settingValue","updatedAt") VALUES (${input.key},${input.value},NOW()) ON CONFLICT ("settingKey") DO UPDATE SET "settingValue"=EXCLUDED."settingValue","updatedAt"=NOW()`;
    return { ok: true };
  }
  if (endpoint === "settings.upsertMany") {
    const items = Array.isArray(input) ? input : [];
    for (const item of items) {
      await sql`INSERT INTO site_settings ("settingKey","settingValue","updatedAt") VALUES (${item.key},${item.value},NOW()) ON CONFLICT ("settingKey") DO UPDATE SET "settingValue"=EXCLUDED."settingValue","updatedAt"=NOW()`;
    }
    return { ok: true };
  }

  return null;
}

// ── Handler principal ──────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url ?? "";
  const rawBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});

  // ── ROTAS PÚBLICAS (sem autenticação) ────────────────────
  // blog.listPublic — posts publicados para o site institucional
  if (url.includes("blog.listPublic") || url.includes("/api/blog/public")) {
    try {
      if (!isDbAvailable()) return res.status(200).json({ result: { data: { json: [] } } });
      await withTimeout(ensureTables(), 4000);
      const sql = getDb();
      const posts = await withTimeout(
        sql`SELECT id,slug,title,subtitle,excerpt,content,"coverImageAlt","videoUrl","authorName",category,tags,"metaTitle","metaDescription","metaKeywords","ogImage","ctaText","ctaUrl",status,"isFeatured","isPublished","publishedAt","scheduledAt","createdAt","updatedAt",
            CASE WHEN "coverImage" IS NULL THEN NULL
                 WHEN "coverImage" LIKE 'data:%' THEN NULL
                 ELSE "coverImage" END AS "coverImage"
            FROM blog_posts WHERE status='published' AND "isPublished"=true ORDER BY "publishedAt" DESC, "createdAt" DESC`,
        5000
      );
      const arr = toArr(posts);
      // Formato compatível com tRPC batch ou direto
      if (url.includes("batch=1") || url.includes("?batch")) {
        return res.status(200).json([{ result: { data: { json: arr } } }]);
      }
      return res.status(200).json({ result: { data: arr } });
    } catch (e) {
      console.error("[blog.listPublic]", e.message);
      return res.status(200).json({ result: { data: [] } });
    }
  }

  // blog.getBySlug — post individual pelo slug (público)
  if (url.includes("blog.getBySlug") || url.includes("/api/blog/slug/")) {
    try {
      // Extrair slug da URL ou do query string
      let slug = null;
      const slugMatch = url.match(/blog\.getBySlug[?&].*input=([^&]+)/);
      if (slugMatch) {
        try { slug = JSON.parse(decodeURIComponent(slugMatch[1]))?.json ?? null; } catch {}
      }
      if (!slug) {
        const pathMatch = url.match(/\/api\/blog\/slug\/([^?/]+)/);
        if (pathMatch) slug = decodeURIComponent(pathMatch[1]);
      }
      if (!slug) {
        const bodySlug = rawBody?.slug ?? rawBody?.[0]?.json?.slug;
        if (bodySlug) slug = bodySlug;
      }
      if (!slug || !isDbAvailable()) return res.status(200).json({ result: { data: null } });
      await withTimeout(ensureTables(), 4000);
      const sql = getDb();
      const rows = await withTimeout(
        sql`SELECT id,slug,title,subtitle,excerpt,content,"coverImageAlt","videoUrl","authorName",category,tags,"metaTitle","metaDescription","metaKeywords","ogImage","ctaText","ctaUrl",status,"isFeatured","isPublished","publishedAt","scheduledAt","createdAt","updatedAt",
            CASE WHEN "coverImage" IS NULL THEN NULL
                 WHEN "coverImage" LIKE 'data:%' THEN NULL
                 ELSE "coverImage" END AS "coverImage"
            FROM blog_posts WHERE slug=${slug} AND status='published' AND "isPublished"=true LIMIT 1`,
        5000
      );
      const post = toArr(rows)[0] ?? null;
      return res.status(200).json({ result: { data: post } });
    } catch (e) {
      console.error("[blog.getBySlug]", e.message);
      return res.status(200).json({ result: { data: null } });
    }
  }

  // faq.listPublic — FAQs publicadas para o site institucional
  if (url.includes("faq.listPublic") || url.includes("/api/faq/public")) {
    try {
      if (!isDbAvailable()) return res.status(200).json({ result: { data: { json: [] } } });
      await withTimeout(ensureTables(), 4000);
      const sql = getDb();
      const faqs = await withTimeout(
        sql`SELECT * FROM faq_items WHERE "isPublished"=true ORDER BY "sortOrder" ASC, id ASC`,
        5000
      );
      const arr = toArr(faqs);
      if (url.includes("batch=1") || url.includes("?batch")) {
        return res.status(200).json([{ result: { data: { json: arr } } }]);
      }
      return res.status(200).json({ result: { data: arr } });
    } catch (e) {
      console.error("[faq.listPublic]", e.message);
      return res.status(200).json({ result: { data: [] } });
    }
  }

  // settings.list público (sem auth) — para o site ler configurações
  if (url.includes("settings.list") && req.method === "GET" && !url.includes("Authorization") ) {
    // Verificar se tem token — se não tiver, retornar settings públicas
    const hasToken = req.headers?.authorization || req.headers?.cookie?.includes("admin_token");
    if (!hasToken) {
      try {
        if (!isDbAvailable()) return res.status(200).json({ result: { data: [] } });
        await withTimeout(ensureTables(), 4000);
        const sql = getDb();
        const settings = await withTimeout(sql`SELECT * FROM site_settings`, 4000);
        const arr = toArr(settings);
        if (url.includes("batch=1")) return res.status(200).json([{ result: { data: { json: arr } } }]);
        return res.status(200).json({ result: { data: arr } });
      } catch (e) {
        return res.status(200).json({ result: { data: [] } });
      }
    }
  }

  // ── /api/upload ───────────────────────────────────────────
  if (url.includes("/api/upload") && req.method === "POST") {
    try {
      const uploadUser = await getUserFromToken(req);
      if (!uploadUser) return res.status(401).json({ error: "Não autorizado" });
      const { name, type, size, data: b64 } = rawBody;
      if (!b64 || !name || !type) return res.status(400).json({ error: "Campos obrigatórios: name, type, data" });
      if (size > 5 * 1024 * 1024) return res.status(400).json({ error: "Arquivo excede 5MB" });
      if (!type.startsWith("image/")) return res.status(400).json({ error: "Apenas imagens permitidas" });
      const dataUrl = b64.startsWith("data:") ? b64 : `data:${type};base64,${b64}`;
      const key = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const record = { id: Date.now(), filename: key, originalName: name, mimeType: type, size: size ?? 0, url: dataUrl, fileKey: key, alt: name, createdAt: new Date().toISOString() };
      if (isDbAvailable()) {
        try {
          await withTimeout(ensureTables(), 4000);
          const sql = getDb();
          const rows = await withTimeout(sql`INSERT INTO media_files (filename,"originalName","mimeType",size,url,"fileKey",alt) VALUES (${key},${name},${type},${size ?? 0},${dataUrl},${key},${name}) RETURNING *`, 4000);
          Object.assign(record, rows[0]);
        } catch (dbErr) {
          console.error("[Upload] DB:", dbErr.message);
        }
      }
      return res.status(200).json(record);
    } catch (e) {
      return res.status(500).json({ error: "Erro no upload: " + e.message });
    }
  }

  // ── auth.login (REST + tRPC) ───────────────────────────────
  if (url.includes("auth.login") || (url.includes("/api/auth/login") && !url.includes("trpc"))) {
    try {
      const body = url.includes("/api/auth/login") && !url.includes("trpc") ? rawBody : (rawBody?.["0"]?.json ?? rawBody?.["0"] ?? rawBody);
      const { email, password } = body ?? {};
      if (!email || !password) {
        const msg = "Email e senha são obrigatórios";
        if (url.includes("/api/auth/login") && !url.includes("trpc")) return res.status(400).json({ error: msg });
        return res.status(200).json([{ error: { json: { message: msg } } }]);
      }
      let user = FALLBACK_USERS.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
      if (!user && isDbAvailable()) {
        try {
          await withTimeout(ensureTables(), 4000);
          const sql = getDb();
          const rows = await withTimeout(sql`SELECT * FROM admin_users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`, 4000);
          user = rows[0] ?? null;
        } catch { /* banco fora do ar */ }
      }
      if (!user || !user.passwordHash) {
        const msg = "Credenciais inválidas";
        if (url.includes("/api/auth/login") && !url.includes("trpc")) return res.status(401).json({ error: msg });
        return res.status(200).json([{ error: { json: { message: msg } } }]);
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        const msg = "Credenciais inválidas";
        if (url.includes("/api/auth/login") && !url.includes("trpc")) return res.status(401).json({ error: msg });
        return res.status(200).json([{ error: { json: { message: msg } } }]);
      }
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
      setAuthCookie(res, token);
      try { const sql = getDb(); await sql`UPDATE admin_users SET "lastSignedIn"=NOW() WHERE id=${user.id}`; } catch {}
      const payload = { id: user.id, name: user.name, email: user.email, role: user.role, token };
      if (url.includes("/api/auth/login") && !url.includes("trpc")) return res.status(200).json(payload);
      return res.status(200).json([{ result: { data: { json: payload } } }]);
    } catch (e) {
      return res.status(500).json({ error: "Erro interno: " + e.message });
    }
  }

  // ── auth.me ───────────────────────────────────────────────
  if (url.includes("auth.me") || (url.includes("/api/auth/me") && !url.includes("trpc"))) {
    const u = await getUserFromToken(req);
    const data = u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
    if (url.includes("/api/auth/me") && !url.includes("trpc")) return res.status(200).json(data);
    return res.status(200).json([{ result: { data: { json: data } } }]);
  }

  // ── auth.logout ───────────────────────────────────────────
  if (url.includes("auth.logout") || url.includes("/api/auth/logout")) {
    res.setHeader("Set-Cookie", "admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    if (url.includes("/api/auth/logout") && !url.includes("trpc")) return res.status(200).json({ ok: true });
    return res.status(200).json([{ result: { data: { json: { ok: true } } } }]);
  }

  // ── auth.setup ────────────────────────────────────────────
  if (url.includes("auth.setup")) {
    try {
      await ensureTables();
      const sql = getDb();
      const [{ c }] = await sql`SELECT COUNT(*) as c FROM admin_users`;
      if (Number(c) > 0) return res.status(200).json([{ error: { json: { message: "Admin já existe" } } }]);
      const input = rawBody?.["0"]?.json ?? rawBody;
      const { email, password, name } = input ?? {};
      if (!email || !password || !name) return res.status(200).json([{ error: { json: { message: "Dados incompletos" } } }]);
      const hash = await bcrypt.hash(password, 12);
      const rows = await sql`INSERT INTO admin_users (email,"passwordHash",name,role,"isActive") VALUES (${email},${hash},${name},'admin',TRUE) RETURNING id,name,email,role`;
      return res.status(200).json([{ result: { data: { json: rows[0] } } }]);
    } catch (e) {
      return res.status(200).json([{ error: { json: { message: "Erro: " + e.message } } }]);
    }
  }

  // ── Rotas protegidas — suporte a BATCH MULTI-ENDPOINT ─────
  const user = await getUserFromToken(req);
  if (!user) {
    return res.status(200).json([{ error: { json: { message: "Não autorizado", code: "UNAUTHORIZED" } } }]);
  }

  // Conectar ao banco
  if (!isDbAvailable()) {
    return res.status(200).json([{ error: { json: { message: "Banco não configurado. Configure DATABASE_URL no Vercel." } } }]);
  }
  let sql;
  try {
    await withTimeout(ensureTables(), 5000);
    sql = getDb();
  } catch (dbErr) {
    return res.status(200).json([{ error: { json: { message: "Banco indisponível: " + dbErr.message } } }]);
  }

  try {
    // Extrair os endpoints da URL: /api/trpc/endpoint1,endpoint2?batch=1
    const [pathOnly, qs] = url.split("?");
    const pathPart = pathOnly.replace(/^.*\/api\/trpc\//, "");
    const endpoints = pathPart.split(",").map(e => e.trim()).filter(Boolean);

    // Parsear query string para GET requests
    const queryParams = {};
    if (qs) {
      for (const part of qs.split("&")) {
        const [k, v] = part.split("=");
        if (k && v) queryParams[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    }

    // Extrair inputs: GET usa query string ?input=JSON, POST usa body
    let inputs = {};

    // 1. Tentar do body (mutations POST)
    if (rawBody && typeof rawBody === "object" && Object.keys(rawBody).length > 0) {
      for (const key of Object.keys(rawBody)) {
        const idx = parseInt(key);
        if (!isNaN(idx)) {
          const item = rawBody[key];
          inputs[idx] = item?.json ?? item?.input ?? item ?? {};
        }
      }
    }

    // 2. Tentar da query string (queries GET) — formato: input={"0":{"json":{...}}}
    if (Object.keys(inputs).length === 0 && queryParams["input"]) {
      try {
        const parsed = JSON.parse(queryParams["input"]);
        if (parsed && typeof parsed === "object") {
          for (const key of Object.keys(parsed)) {
            const idx = parseInt(key);
            if (!isNaN(idx)) {
              const item = parsed[key];
              inputs[idx] = item?.json ?? item?.input ?? item ?? {};
            }
          }
        }
      } catch { /* input malformado — ignora */ }
    }

    // Executar cada endpoint em paralelo
    const results = await Promise.all(
      endpoints.map(async (endpoint, idx) => {
        const input = inputs[idx] ?? {};
        try {
          const data = await execEndpoint(endpoint, input, sql);
          return { result: { data: { json: data ?? null } } };
        } catch (e) {
          console.error(`[API] Erro em ${endpoint}:`, e.message);
          return { error: { json: { message: e.message, code: "INTERNAL_SERVER_ERROR" } } };
        }
      })
    );

    // Sempre retornar array (tRPC client sempre espera array no batch)
    const isBatchReq = url.includes("batch=1") || endpoints.length > 1 || (rawBody && rawBody["0"] !== undefined) || queryParams["batch"] === "1";
    if (isBatchReq) {
      return res.status(200).json(results);
    } else {
      return res.status(200).json(results[0] ?? { result: { data: { json: null } } });
    }

  } catch (e) {
    console.error("[API Error]", e.message, url);
    return res.status(200).json([{ error: { json: { message: "Erro interno: " + e.message } } }]);
  }
}

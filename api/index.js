// api/index.js — Painel Admin Mauro Monção — CRUD completo com Neon PostgreSQL
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import postgres from "postgres";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

// ── Banco de dados ─────────────────────────────────────────────
let _sql = null;
function getDb() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada no Vercel");
  _sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10 });
  return _sql;
}

// ── Usuários fallback (sem banco) ──────────────────────────────
const FALLBACK_USERS = [
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

// ── Auth helpers ───────────────────────────────────────────────
function setAuthCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Lax; Secure`
  );
}

function getTokenFromReq(req) {
  const authHeader = req.headers.authorization ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookie = req.headers.cookie ?? "";
  const m = cookie.match(/admin_token=([^;]+)/);
  return bearer ?? m?.[1] ?? null;
}

async function getUserFromToken(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Tenta banco primeiro, fallback para USERS fixos
    try {
      const sql = getDb();
      const rows = await sql`SELECT id, email, name, role, "isActive" FROM admin_users WHERE id = ${payload.id} LIMIT 1`;
      const u = rows[0];
      if (!u || !u.isActive) return null;
      return u;
    } catch {
      return FALLBACK_USERS.find(u => u.id === payload.id) ?? null;
    }
  } catch {
    return null;
  }
}

// ── tRPC response helpers ──────────────────────────────────────
function ok(res, data, isBatch) {
  const wrap = { result: { data: { json: data } } };
  return res.status(200).json(isBatch ? [wrap] : wrap);
}
function err(res, msg, isBatch, status = 200) {
  const wrap = { error: { json: { message: msg, code: "INTERNAL_SERVER_ERROR" } } };
  return res.status(status).json(isBatch ? [wrap] : wrap);
}

function isBatchReq(url, body) {
  return url.includes("batch=1") || (body && body["0"] !== undefined);
}

function parseInput(body) {
  if (!body) return {};
  const inner = body?.["0"] ?? body;
  return inner?.json ?? inner?.input ?? inner ?? {};
}

// ── Init tables (cria se não existir) ─────────────────────────
async function ensureTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      "passwordHash" VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "lastSignedIn" TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(500),
      excerpt TEXT,
      content TEXT,
      "coverImage" VARCHAR(500),
      "coverImageAlt" VARCHAR(255),
      "videoUrl" VARCHAR(500),
      "authorName" VARCHAR(255),
      category VARCHAR(128),
      tags VARCHAR(500),
      "metaTitle" VARCHAR(255),
      "metaDescription" TEXT,
      "metaKeywords" VARCHAR(500),
      "ogImage" VARCHAR(500),
      "ctaText" VARCHAR(255),
      "ctaUrl" VARCHAR(500),
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      "isFeatured" BOOLEAN NOT NULL DEFAULT FALSE,
      "isPublished" BOOLEAN NOT NULL DEFAULT FALSE,
      "publishedAt" TIMESTAMPTZ,
      "scheduledAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS faq_items (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category VARCHAR(128),
      "isPublished" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320),
      phone VARCHAR(20),
      message TEXT,
      source VARCHAR(128),
      status VARCHAR(50) NOT NULL DEFAULT 'new',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS media_files (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      "originalName" VARCHAR(255) NOT NULL,
      "mimeType" VARCHAR(128) NOT NULL,
      size INTEGER NOT NULL,
      url VARCHAR(500) NOT NULL,
      "fileKey" VARCHAR(500) NOT NULL,
      alt VARCHAR(255),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      id SERIAL PRIMARY KEY,
      "settingKey" VARCHAR(128) NOT NULL UNIQUE,
      "settingValue" TEXT,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

// ── Handler principal ──────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url ?? "";

  // ── /api/upload — Upload de imagem via base64 ─────────────────
  if (url.includes("/api/upload") && req.method === "POST") {
    try {
      const uploadUser = await getUserFromToken(req);
      if (!uploadUser) return res.status(401).json({ error: "Não autorizado" });

      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
      const { name, type, size, data: base64Data } = body;

      if (!base64Data || !name || !type) {
        return res.status(400).json({ error: "Campos obrigatórios: name, type, data (base64)" });
      }
      if (size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Arquivo excede 5MB" });
      }
      if (!type.startsWith("image/")) {
        return res.status(400).json({ error: "Apenas imagens são permitidas" });
      }

      // Gera URL de dados (data URL) — funciona sem storage externo
      const dataUrl = base64Data.startsWith("data:") ? base64Data : `data:${type};base64,${base64Data}`;

      await ensureTables();
      const sql = getDb();
      const fileKey = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const rows = await sql`
        INSERT INTO media_files (filename, "originalName", "mimeType", size, url, "fileKey", alt)
        VALUES (${fileKey}, ${name}, ${type}, ${size ?? 0}, ${dataUrl}, ${fileKey}, ${name})
        RETURNING *
      `;
      return res.status(200).json(rows[0]);
    } catch (e) {
      console.error("[Upload Error]", e.message);
      return res.status(500).json({ error: "Erro no upload: " + e.message });
    }
  }

  const url = req.url ?? "";
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
  const batch = isBatchReq(url, body);
  const input = parseInput(body);

  // ── auth.login — suporta tanto /api/auth/login (REST) quanto /api/trpc/auth.login (tRPC)
  if (url.includes("auth.login") || url.includes("/api/auth/login")) {
    try {
      // REST direto: body = { email, password }
      // tRPC batch: body = { "0": { json: { email, password } } }
      const directBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
      const restInput = directBody?.["0"]?.json ?? directBody?.json ?? directBody;
      const { email, password } = restInput?.email ? restInput : input;
      if (!email || !password) return err(res, "Email e senha são obrigatórios", batch);

      let user = null;
      // Tenta banco
      try {
        await ensureTables();
        const sql = getDb();
        const rows = await sql`SELECT * FROM admin_users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
        user = rows[0] ?? null;
      } catch (dbErr) {
        // fallback para usuários fixos
        user = FALLBACK_USERS.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
      }

      if (!user || !user.passwordHash) return err(res, "Credenciais inválidas", batch);
      const ok2 = await bcrypt.compare(password, user.passwordHash);
      if (!ok2) return err(res, "Credenciais inválidas", batch);

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
      setAuthCookie(res, token);

      // Atualiza lastSignedIn
      try {
        const sql = getDb();
        await sql`UPDATE admin_users SET "lastSignedIn" = NOW() WHERE id = ${user.id}`;
      } catch {}

      const payload = { id: user.id, name: user.name, email: user.email, role: user.role, token };

      // Se chamada REST direta (/api/auth/login) retorna JSON simples
      if (url.includes("/api/auth/login") && !url.includes("trpc")) {
        return res.status(200).json(payload);
      }

      return ok(res, payload, batch);
    } catch (e) {
      return err(res, "Erro interno: " + e.message, batch);
    }
  }

  // ── auth.me ───────────────────────────────────────────────
  if (url.includes("auth.me") || url.includes("/api/auth/me")) {
    const u = await getUserFromToken(req);
    const data = u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
    if (url.includes("/api/auth/me") && !url.includes("trpc")) {
      return res.status(200).json(data);
    }
    return ok(res, data, batch);
  }

  // ── auth.logout ───────────────────────────────────────────
  if (url.includes("auth.logout") || url.includes("/api/auth/logout")) {
    res.setHeader("Set-Cookie", "admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    if (url.includes("/api/auth/logout") && !url.includes("trpc")) {
      return res.status(200).json({ ok: true });
    }
    return ok(res, { ok: true }, batch);
  }

  // ── auth.setup ────────────────────────────────────────────
  if (url.includes("auth.setup")) {
    try {
      await ensureTables();
      const sql = getDb();
      const countRows = await sql`SELECT COUNT(*) as c FROM admin_users`;
      if (Number(countRows[0]?.c) > 0) return err(res, "Admin já existe", batch);
      const { email, password, name } = input;
      if (!email || !password || !name) return err(res, "Dados incompletos", batch);
      const hash = await bcrypt.hash(password, 12);
      const rows = await sql`
        INSERT INTO admin_users (email, "passwordHash", name, role, "isActive")
        VALUES (${email}, ${hash}, ${name}, 'admin', TRUE) RETURNING id, name, email, role
      `;
      return ok(res, rows[0], batch);
    } catch (e) {
      return err(res, "Erro: " + e.message, batch);
    }
  }

  // ── Rotas protegidas ──────────────────────────────────────
  const user = await getUserFromToken(req);
  if (!user) {
    return res.status(200).json(batch
      ? [{ error: { json: { message: "Não autorizado", code: "UNAUTHORIZED" } } }]
      : { error: { json: { message: "Não autorizado", code: "UNAUTHORIZED" } } }
    );
  }

  try {
    await ensureTables();
    const sql = getDb();

    // ── dashboard.stats ─────────────────────────────────────
    if (url.includes("dashboard.stats")) {
      const [posts, published, drafts, scheduled, archived, cats, media, leadsAll, newLeads, faq] = await Promise.all([
        sql`SELECT COUNT(*) as c FROM blog_posts`,
        sql`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'published'`,
        sql`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'draft'`,
        sql`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'scheduled'`,
        sql`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'archived'`,
        sql`SELECT COUNT(*) as c FROM blog_categories`,
        sql`SELECT COUNT(*) as c FROM media_files`,
        sql`SELECT COUNT(*) as c FROM leads`,
        sql`SELECT COUNT(*) as c FROM leads WHERE status = 'new'`,
        sql`SELECT COUNT(*) as c FROM faq_items`,
      ]);
      return ok(res, {
        totalPosts:      Number(posts[0]?.c ?? 0),
        published:       Number(published[0]?.c ?? 0),
        drafts:          Number(drafts[0]?.c ?? 0),
        scheduled:       Number(scheduled[0]?.c ?? 0),
        archived:        Number(archived[0]?.c ?? 0),
        totalCategories: Number(cats[0]?.c ?? 0),
        totalMedia:      Number(media[0]?.c ?? 0),
        totalLeads:      Number(leadsAll[0]?.c ?? 0),
        newLeads:        Number(newLeads[0]?.c ?? 0),
        totalFaq:        Number(faq[0]?.c ?? 0),
      }, batch);
    }

    // ── dashboard.recentPosts ───────────────────────────────
    if (url.includes("dashboard.recentPosts")) {
      const rows = await sql`SELECT * FROM blog_posts ORDER BY "createdAt" DESC LIMIT 5`;
      return ok(res, rows, batch);
    }

    // ── dashboard.recentLeads ───────────────────────────────
    if (url.includes("dashboard.recentLeads")) {
      const rows = await sql`SELECT * FROM leads ORDER BY "createdAt" DESC LIMIT 5`;
      return ok(res, rows, batch);
    }

    // ── blog.list ───────────────────────────────────────────
    if (url.includes("blog.list")) {
      const rows = await sql`SELECT * FROM blog_posts ORDER BY "createdAt" DESC`;
      return ok(res, rows, batch);
    }

    // ── blog.getById ────────────────────────────────────────
    if (url.includes("blog.getById")) {
      const id = Number(input.id);
      if (!id) return ok(res, null, batch);
      const rows = await sql`SELECT * FROM blog_posts WHERE id = ${id} LIMIT 1`;
      return ok(res, rows[0] ?? null, batch);
    }

    // ── blog.upsert ─────────────────────────────────────────
    if (url.includes("blog.upsert")) {
      const d = input;
      const isPublished = d.status === "published";
      const publishedAt = isPublished ? (d.publishedAt ? new Date(d.publishedAt) : new Date()) : (d.publishedAt ? new Date(d.publishedAt) : null);
      const scheduledAt = d.scheduledAt ? new Date(d.scheduledAt) : null;

      if (d.id) {
        const rows = await sql`
          UPDATE blog_posts SET
            slug = ${d.slug}, title = ${d.title}, subtitle = ${d.subtitle ?? null},
            excerpt = ${d.excerpt ?? null}, content = ${d.content ?? null},
            "coverImage" = ${d.coverImage ?? null}, "coverImageAlt" = ${d.coverImageAlt ?? null},
            "videoUrl" = ${d.videoUrl ?? null}, "authorName" = ${d.authorName ?? null},
            category = ${d.category ?? null}, tags = ${d.tags ?? null},
            "metaTitle" = ${d.metaTitle ?? null}, "metaDescription" = ${d.metaDescription ?? null},
            "metaKeywords" = ${d.metaKeywords ?? null}, "ogImage" = ${d.ogImage ?? null},
            "ctaText" = ${d.ctaText ?? null}, "ctaUrl" = ${d.ctaUrl ?? null},
            status = ${d.status ?? 'draft'}, "isFeatured" = ${d.isFeatured ?? false},
            "isPublished" = ${isPublished}, "publishedAt" = ${publishedAt},
            "scheduledAt" = ${scheduledAt}, "updatedAt" = NOW()
          WHERE id = ${d.id} RETURNING *
        `;
        return ok(res, rows[0], batch);
      } else {
        const rows = await sql`
          INSERT INTO blog_posts (
            slug, title, subtitle, excerpt, content,
            "coverImage", "coverImageAlt", "videoUrl", "authorName",
            category, tags, "metaTitle", "metaDescription", "metaKeywords",
            "ogImage", "ctaText", "ctaUrl", status, "isFeatured",
            "isPublished", "publishedAt", "scheduledAt"
          ) VALUES (
            ${d.slug}, ${d.title}, ${d.subtitle ?? null}, ${d.excerpt ?? null}, ${d.content ?? null},
            ${d.coverImage ?? null}, ${d.coverImageAlt ?? null}, ${d.videoUrl ?? null}, ${d.authorName ?? null},
            ${d.category ?? null}, ${d.tags ?? null}, ${d.metaTitle ?? null}, ${d.metaDescription ?? null}, ${d.metaKeywords ?? null},
            ${d.ogImage ?? null}, ${d.ctaText ?? null}, ${d.ctaUrl ?? null}, ${d.status ?? 'draft'}, ${d.isFeatured ?? false},
            ${isPublished}, ${publishedAt}, ${scheduledAt}
          ) RETURNING *
        `;
        return ok(res, rows[0], batch);
      }
    }

    // ── blog.delete ─────────────────────────────────────────
    if (url.includes("blog.delete")) {
      const id = Number(input.id);
      await sql`DELETE FROM blog_posts WHERE id = ${id}`;
      return ok(res, { ok: true }, batch);
    }

    // ── categories.list ─────────────────────────────────────
    if (url.includes("categories.list")) {
      const rows = await sql`SELECT * FROM blog_categories ORDER BY "sortOrder" ASC, name ASC`;
      return ok(res, rows, batch);
    }

    // ── categories.upsert ───────────────────────────────────
    if (url.includes("categories.upsert")) {
      const d = input;
      if (d.id) {
        const rows = await sql`
          UPDATE blog_categories SET
            slug = ${d.slug}, name = ${d.name},
            description = ${d.description ?? null}, "sortOrder" = ${d.sortOrder ?? 0}
          WHERE id = ${d.id} RETURNING *
        `;
        return ok(res, rows[0], batch);
      } else {
        const rows = await sql`
          INSERT INTO blog_categories (slug, name, description, "sortOrder")
          VALUES (${d.slug}, ${d.name}, ${d.description ?? null}, ${d.sortOrder ?? 0})
          RETURNING *
        `;
        return ok(res, rows[0], batch);
      }
    }

    // ── categories.delete ───────────────────────────────────
    if (url.includes("categories.delete")) {
      await sql`DELETE FROM blog_categories WHERE id = ${Number(input.id)}`;
      return ok(res, { ok: true }, batch);
    }

    // ── faq.list ────────────────────────────────────────────
    if (url.includes("faq.list")) {
      const rows = await sql`SELECT * FROM faq_items ORDER BY "sortOrder" ASC, id ASC`;
      return ok(res, rows, batch);
    }

    // ── faq.upsert ──────────────────────────────────────────
    if (url.includes("faq.upsert")) {
      const d = input;
      if (d.id) {
        const rows = await sql`
          UPDATE faq_items SET
            question = ${d.question}, answer = ${d.answer},
            category = ${d.category ?? null}, "isPublished" = ${d.isPublished ?? true},
            "sortOrder" = ${d.sortOrder ?? 0}, "updatedAt" = NOW()
          WHERE id = ${d.id} RETURNING *
        `;
        return ok(res, rows[0], batch);
      } else {
        const rows = await sql`
          INSERT INTO faq_items (question, answer, category, "isPublished", "sortOrder")
          VALUES (${d.question}, ${d.answer}, ${d.category ?? null}, ${d.isPublished ?? true}, ${d.sortOrder ?? 0})
          RETURNING *
        `;
        return ok(res, rows[0], batch);
      }
    }

    // ── faq.delete ──────────────────────────────────────────
    if (url.includes("faq.delete")) {
      await sql`DELETE FROM faq_items WHERE id = ${Number(input.id)}`;
      return ok(res, { ok: true }, batch);
    }

    // ── leads.list ──────────────────────────────────────────
    if (url.includes("leads.list")) {
      const rows = await sql`SELECT * FROM leads ORDER BY "createdAt" DESC`;
      return ok(res, rows, batch);
    }

    // ── leads.updateStatus ──────────────────────────────────
    if (url.includes("leads.updateStatus")) {
      const rows = await sql`
        UPDATE leads SET status = ${input.status}, "updatedAt" = NOW()
        WHERE id = ${Number(input.id)} RETURNING *
      `;
      return ok(res, rows[0], batch);
    }

    // ── leads.delete ────────────────────────────────────────
    if (url.includes("leads.delete")) {
      await sql`DELETE FROM leads WHERE id = ${Number(input.id)}`;
      return ok(res, { ok: true }, batch);
    }

    // ── media.list ──────────────────────────────────────────
    if (url.includes("media.list")) {
      const rows = await sql`SELECT * FROM media_files ORDER BY "createdAt" DESC`;
      return ok(res, rows, batch);
    }

    // ── media.upload ────────────────────────────────────────
    if (url.includes("media.upload")) {
      const d = input;
      const rows = await sql`
        INSERT INTO media_files (filename, "originalName", "mimeType", size, url, "fileKey", alt)
        VALUES (${d.filename}, ${d.originalName}, ${d.mimeType}, ${d.size}, ${d.url}, ${d.fileKey}, ${d.alt ?? null})
        RETURNING *
      `;
      return ok(res, rows[0], batch);
    }

    // ── media.delete ────────────────────────────────────────
    if (url.includes("media.delete")) {
      const rows = await sql`SELECT * FROM media_files WHERE id = ${Number(input.id)} LIMIT 1`;
      await sql`DELETE FROM media_files WHERE id = ${Number(input.id)}`;
      return ok(res, rows[0] ?? null, batch);
    }

    // ── settings.list ───────────────────────────────────────
    if (url.includes("settings.list")) {
      const rows = await sql`SELECT * FROM site_settings`;
      return ok(res, rows, batch);
    }

    // ── settings.upsert ─────────────────────────────────────
    if (url.includes("settings.upsert")) {
      await sql`
        INSERT INTO site_settings ("settingKey", "settingValue", "updatedAt")
        VALUES (${input.key}, ${input.value}, NOW())
        ON CONFLICT ("settingKey") DO UPDATE SET "settingValue" = EXCLUDED."settingValue", "updatedAt" = NOW()
      `;
      return ok(res, { ok: true }, batch);
    }

    // ── settings.upsertMany ─────────────────────────────────
    if (url.includes("settings.upsertMany")) {
      const items = Array.isArray(input) ? input : [];
      for (const item of items) {
        await sql`
          INSERT INTO site_settings ("settingKey", "settingValue", "updatedAt")
          VALUES (${item.key}, ${item.value}, NOW())
          ON CONFLICT ("settingKey") DO UPDATE SET "settingValue" = EXCLUDED."settingValue", "updatedAt" = NOW()
        `;
      }
      return ok(res, { ok: true }, batch);
    }

    // ── default ─────────────────────────────────────────────
    return ok(res, null, batch);

  } catch (e) {
    console.error("[API Error]", e.message, url);
    return err(res, "Erro interno: " + e.message, batch);
  }
}

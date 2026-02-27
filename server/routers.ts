import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import * as db from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

// ── Context ───────────────────────────────────────────────────
export type Context = { req: Request; res: Response };
const t = initTRPC.context<Context>().create();
const router     = t.router;
const publicProc = t.procedure;

// Admin middleware
const adminProc = publicProc.use(async ({ ctx, next }) => {
  const token =
    ctx.req.cookies?.admin_token ??
    ctx.req.headers?.authorization?.replace("Bearer ", "");
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await db.getAdminById(payload.id);
    if (!user || !user.isActive) throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx: { ...ctx, user } });
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
});

// ── Auth Router ──────────────────────────────────────────────
const authRouter = router({
  login: publicProc
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getAdminByEmail(input.email);
      if (!user || !user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas" });
      if (!user.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Conta inativa" });
      await db.updateLastSignedIn(user.id);
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
      ctx.res.cookie("admin_token", token, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 86400 * 1000,
      });
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }),

  logout: publicProc.mutation(({ ctx }) => {
    ctx.res.clearCookie("admin_token");
    return { ok: true };
  }),

  me: publicProc.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.admin_token;
    if (!token) return null;
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = await db.getAdminById(payload.id);
      if (!user || !user.isActive) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    } catch { return null; }
  }),

  setup: publicProc
    .input(z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await db.countAdmins();
      if (existing > 0) throw new TRPCError({ code: "FORBIDDEN", message: "Admin já existe" });
      const hash = await bcrypt.hash(input.password, 12);
      const user = await db.createAdminUser({ email: input.email, passwordHash: hash, name: input.name, role: "admin", isActive: true });
      return { id: user.id, name: user.name };
    }),
});

// ── Blog Router ───────────────────────────────────────────────
const blogRouter = router({
  list: adminProc.query(() => db.getAllBlogPosts()),

  getById: adminProc
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getBlogPostById(input.id)),

  upsert: adminProc
    .input(z.object({
      id:              z.number().optional(),
      slug:            z.string().min(1),
      title:           z.string().min(1),
      subtitle:        z.string().optional(),
      excerpt:         z.string().optional(),
      content:         z.string().optional(),
      coverImage:      z.string().optional(),
      coverImageAlt:   z.string().optional(),
      videoUrl:        z.string().optional(),
      authorName:      z.string().optional(),
      category:        z.string().optional(),
      tags:            z.string().optional(),
      metaTitle:       z.string().optional(),
      metaDescription: z.string().optional(),
      metaKeywords:    z.string().optional(),
      ogImage:         z.string().optional(),
      ctaText:         z.string().optional(),
      ctaUrl:          z.string().optional(),
      status:          z.enum(["draft", "published", "scheduled", "archived"]).default("draft"),
      isFeatured:      z.boolean().optional(),
      isPublished:     z.boolean().optional(),
      publishedAt:     z.string().optional(),
      scheduledAt:     z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const data: any = {
        ...input,
        isPublished: input.status === "published",
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : (input.status === "published" ? new Date() : undefined),
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      };
      return db.upsertBlogPost(data);
    }),

  delete: adminProc
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteBlogPost(input.id)),
});

// ── Categories Router ────────────────────────────────────────
const categoriesRouter = router({
  list: adminProc.query(() => db.getAllCategories()),

  upsert: adminProc
    .input(z.object({
      id:          z.number().optional(),
      slug:        z.string().min(1),
      name:        z.string().min(1),
      description: z.string().optional(),
      sortOrder:   z.number().optional(),
    }))
    .mutation(({ input }) => db.upsertCategory(input)),

  delete: adminProc
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteCategory(input.id)),
});

// ── FAQ Router ────────────────────────────────────────────────
const faqRouter = router({
  list: adminProc.query(() => db.getAllFaq()),

  upsert: adminProc
    .input(z.object({
      id:          z.number().optional(),
      question:    z.string().min(1),
      answer:      z.string().min(1),
      category:    z.string().optional(),
      isPublished: z.boolean().optional(),
      sortOrder:   z.number().optional(),
    }))
    .mutation(({ input }) => db.upsertFaq(input as any)),

  delete: adminProc
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteFaq(input.id)),
});

// ── Leads Router ─────────────────────────────────────────────
const leadsRouter = router({
  list: adminProc.query(() => db.getAllLeads()),

  updateStatus: adminProc
    .input(z.object({ id: z.number(), status: z.enum(["new", "contacted", "converted", "archived"]) }))
    .mutation(({ input }) => db.updateLeadStatus(input.id, input.status)),

  delete: adminProc
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteLead(input.id)),
});

// ── Media Router ──────────────────────────────────────────────
const mediaRouter = router({
  list: adminProc.query(() => db.getAllMedia()),

  upload: adminProc
    .input(z.object({
      filename:     z.string(),
      originalName: z.string(),
      mimeType:     z.string(),
      size:         z.number(),
      url:          z.string(),
      fileKey:      z.string(),
      alt:          z.string().optional(),
    }))
    .mutation(({ input }) => db.insertMedia(input)),

  delete: adminProc
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteMedia(input.id)),
});

// ── Settings Router ───────────────────────────────────────────
const settingsRouter = router({
  list: adminProc.query(() => db.getAllSettings()),

  upsert: adminProc
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(({ input }) => db.upsertSetting(input.key, input.value)),

  upsertMany: adminProc
    .input(z.array(z.object({ key: z.string(), value: z.string() })))
    .mutation(async ({ input }) => {
      for (const item of input) await db.upsertSetting(item.key, item.value);
      return { ok: true };
    }),
});

// ── Dashboard Router ──────────────────────────────────────────
const dashboardRouter = router({
  stats: adminProc.query(() => db.getDashboardStats()),
  recentLeads: adminProc.query(async () => {
    const all = await db.getAllLeads();
    return all.slice(0, 5);
  }),
  recentPosts: adminProc.query(async () => {
    const all = await db.getAllBlogPosts();
    return all.slice(0, 5);
  }),
});

// ── App Router ────────────────────────────────────────────────
export const appRouter = router({
  auth:       authRouter,
  blog:       blogRouter,
  categories: categoriesRouter,
  faq:        faqRouter,
  leads:      leadsRouter,
  media:      mediaRouter,
  settings:   settingsRouter,
  dashboard:  dashboardRouter,
});

export type AppRouter = typeof appRouter;

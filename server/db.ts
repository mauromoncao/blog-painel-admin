import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";
import { eq, desc, like, and, or, sql, count } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

// ── Auth ─────────────────────────────────────────────────────
export async function getAdminByEmail(email: string) {
  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  return user ?? null;
}
export async function getAdminById(id: number) {
  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, id));
  return user ?? null;
}
export async function createAdminUser(data: schema.InsertAdminUser) {
  const [user] = await db.insert(schema.adminUsers).values(data).returning();
  return user;
}
export async function updateLastSignedIn(id: number) {
  await db.update(schema.adminUsers).set({ lastSignedIn: new Date() }).where(eq(schema.adminUsers.id, id));
}
export async function countAdmins() {
  const [r] = await db.select({ c: count() }).from(schema.adminUsers);
  return Number(r?.c ?? 0);
}

// ── Blog Posts ───────────────────────────────────────────────
export async function getAllBlogPosts() {
  return db.select().from(schema.blogPosts).orderBy(desc(schema.blogPosts.createdAt));
}
export async function getBlogPostById(id: number) {
  const [p] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.id, id));
  return p ?? null;
}
export async function getBlogPostBySlug(slug: string) {
  const [p] = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.slug, slug));
  return p ?? null;
}
export async function upsertBlogPost(data: schema.InsertBlogPost) {
  if (data.id) {
    const [updated] = await db.update(schema.blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.blogPosts.id, data.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(schema.blogPosts).values(data).returning();
  return created;
}
export async function deleteBlogPost(id: number) {
  await db.delete(schema.blogPosts).where(eq(schema.blogPosts.id, id));
}

// ── Blog Categories ──────────────────────────────────────────
export async function getAllCategories() {
  return db.select().from(schema.blogCategories).orderBy(schema.blogCategories.sortOrder, schema.blogCategories.name);
}
export async function getCategoryById(id: number) {
  const [c] = await db.select().from(schema.blogCategories).where(eq(schema.blogCategories.id, id));
  return c ?? null;
}
export async function upsertCategory(data: { id?: number; slug: string; name: string; description?: string; sortOrder?: number }) {
  if (data.id) {
    const [u] = await db.update(schema.blogCategories).set(data).where(eq(schema.blogCategories.id, data.id)).returning();
    return u;
  }
  const [c] = await db.insert(schema.blogCategories).values({ slug: data.slug, name: data.name, description: data.description, sortOrder: data.sortOrder ?? 0 }).returning();
  return c;
}
export async function deleteCategory(id: number) {
  await db.delete(schema.blogCategories).where(eq(schema.blogCategories.id, id));
}

// ── FAQ ──────────────────────────────────────────────────────
export async function getAllFaq() {
  return db.select().from(schema.faqItems).orderBy(schema.faqItems.sortOrder, schema.faqItems.id);
}
export async function getFaqById(id: number) {
  const [f] = await db.select().from(schema.faqItems).where(eq(schema.faqItems.id, id));
  return f ?? null;
}
export async function upsertFaq(data: schema.InsertFaqItem) {
  if (data.id) {
    const [u] = await db.update(schema.faqItems).set({ ...data, updatedAt: new Date() }).where(eq(schema.faqItems.id, data.id)).returning();
    return u;
  }
  const [f] = await db.insert(schema.faqItems).values(data).returning();
  return f;
}
export async function deleteFaq(id: number) {
  await db.delete(schema.faqItems).where(eq(schema.faqItems.id, id));
}

// ── Leads ────────────────────────────────────────────────────
export async function getAllLeads() {
  return db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt));
}
export async function updateLeadStatus(id: number, status: "new" | "contacted" | "converted" | "archived") {
  const [l] = await db.update(schema.leads).set({ status, updatedAt: new Date() }).where(eq(schema.leads.id, id)).returning();
  return l;
}
export async function deleteLead(id: number) {
  await db.delete(schema.leads).where(eq(schema.leads.id, id));
}

// ── Media ────────────────────────────────────────────────────
export async function getAllMedia() {
  return db.select().from(schema.mediaFiles).orderBy(desc(schema.mediaFiles.createdAt));
}
export async function insertMedia(data: schema.InsertMediaFile) {
  const [m] = await db.insert(schema.mediaFiles).values(data).returning();
  return m;
}
export async function deleteMedia(id: number) {
  const [m] = await db.select().from(schema.mediaFiles).where(eq(schema.mediaFiles.id, id));
  if (m) await db.delete(schema.mediaFiles).where(eq(schema.mediaFiles.id, id));
  return m ?? null;
}

// ── Settings ────────────────────────────────────────────────
export async function getAllSettings() {
  return db.select().from(schema.siteSettings);
}
export async function getSetting(key: string) {
  const [s] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.settingKey, key));
  return s?.settingValue ?? null;
}
export async function upsertSetting(key: string, value: string) {
  const existing = await getSetting(key);
  if (existing !== null) {
    await db.update(schema.siteSettings).set({ settingValue: value, updatedAt: new Date() }).where(eq(schema.siteSettings.settingKey, key));
  } else {
    await db.insert(schema.siteSettings).values({ settingKey: key, settingValue: value });
  }
}

// ── Dashboard Stats ──────────────────────────────────────────
export async function getDashboardStats() {
  const [totalPosts]      = await db.select({ c: count() }).from(schema.blogPosts);
  const [published]       = await db.select({ c: count() }).from(schema.blogPosts).where(eq(schema.blogPosts.status, "published"));
  const [drafts]          = await db.select({ c: count() }).from(schema.blogPosts).where(eq(schema.blogPosts.status, "draft"));
  const [scheduled]       = await db.select({ c: count() }).from(schema.blogPosts).where(eq(schema.blogPosts.status, "scheduled"));
  const [archived]        = await db.select({ c: count() }).from(schema.blogPosts).where(eq(schema.blogPosts.status, "archived"));
  const [totalCategories] = await db.select({ c: count() }).from(schema.blogCategories);
  const [totalMedia]      = await db.select({ c: count() }).from(schema.mediaFiles);
  const [totalLeads]      = await db.select({ c: count() }).from(schema.leads);
  const [newLeads]        = await db.select({ c: count() }).from(schema.leads).where(eq(schema.leads.status, "new"));
  const [totalFaq]        = await db.select({ c: count() }).from(schema.faqItems);
  return {
    totalPosts:      Number(totalPosts?.c ?? 0),
    published:       Number(published?.c ?? 0),
    drafts:          Number(drafts?.c ?? 0),
    scheduled:       Number(scheduled?.c ?? 0),
    archived:        Number(archived?.c ?? 0),
    totalCategories: Number(totalCategories?.c ?? 0),
    totalMedia:      Number(totalMedia?.c ?? 0),
    totalLeads:      Number(totalLeads?.c ?? 0),
    newLeads:        Number(newLeads?.c ?? 0),
    totalFaq:        Number(totalFaq?.c ?? 0),
  };
}

import {
  pgTable, serial, text, varchar, boolean, integer, timestamp, pgEnum, json,
} from "drizzle-orm/pg-core";

export const roleEnum   = pgEnum("admin_role",    ["admin", "editor"]);
export const leadStatus = pgEnum("lead_status",   ["new", "contacted", "converted", "archived"]);
export const postStatus = pgEnum("post_status",   ["draft", "published", "scheduled", "archived"]);

// ── Admin Users ──────────────────────────────────────────────
export const adminUsers = pgTable("admin_users", {
  id:           serial("id").primaryKey(),
  email:        varchar("email",        { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name:         varchar("name",         { length: 255 }).notNull(),
  role:         roleEnum("role").default("admin").notNull(),
  isActive:     boolean("isActive").default(true).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

// ── Blog Posts ───────────────────────────────────────────────
export const blogPosts = pgTable("blog_posts", {
  id:             serial("id").primaryKey(),
  slug:           varchar("slug",           { length: 255 }).notNull().unique(),
  title:          varchar("title",          { length: 255 }).notNull(),
  subtitle:       varchar("subtitle",       { length: 500 }),
  excerpt:        text("excerpt"),
  content:        text("content"),
  coverImage:     varchar("coverImage",     { length: 500 }),
  coverImageAlt:  varchar("coverImageAlt",  { length: 255 }),
  videoUrl:       varchar("videoUrl",       { length: 500 }),
  authorName:     varchar("authorName",     { length: 255 }),
  category:       varchar("category",       { length: 128 }),
  tags:           varchar("tags",           { length: 500 }),
  metaTitle:      varchar("metaTitle",      { length: 255 }),
  metaDescription:text("metaDescription"),
  metaKeywords:   varchar("metaKeywords",   { length: 500 }),
  ogImage:        varchar("ogImage",        { length: 500 }),
  ctaText:        varchar("ctaText",        { length: 255 }),
  ctaUrl:         varchar("ctaUrl",         { length: 500 }),
  status:         postStatus("status").default("draft").notNull(),
  isFeatured:     boolean("isFeatured").default(false).notNull(),
  isPublished:    boolean("isPublished").default(false).notNull(),
  publishedAt:    timestamp("publishedAt"),
  scheduledAt:    timestamp("scheduledAt"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().notNull(),
});

// ── Blog Categories ──────────────────────────────────────────
export const blogCategories = pgTable("blog_categories", {
  id:          serial("id").primaryKey(),
  slug:        varchar("slug",  { length: 255 }).notNull().unique(),
  name:        varchar("name",  { length: 255 }).notNull(),
  description: text("description"),
  sortOrder:   integer("sortOrder").default(0).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
});

// ── FAQ Items ────────────────────────────────────────────────
export const faqItems = pgTable("faq_items", {
  id:          serial("id").primaryKey(),
  question:    text("question").notNull(),
  answer:      text("answer").notNull(),
  category:    varchar("category", { length: 128 }),
  isPublished: boolean("isPublished").default(true).notNull(),
  sortOrder:   integer("sortOrder").default(0).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().notNull(),
});

// ── Leads ────────────────────────────────────────────────────
export const leads = pgTable("leads", {
  id:          serial("id").primaryKey(),
  name:        varchar("name",  { length: 255 }).notNull(),
  email:       varchar("email", { length: 320 }),
  phone:       varchar("phone", { length: 20 }),
  message:     text("message"),
  source:      varchar("source",{ length: 128 }),
  status:      leadStatus("status").default("new").notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().notNull(),
});

// ── Media Files ──────────────────────────────────────────────
export const mediaFiles = pgTable("media_files", {
  id:           serial("id").primaryKey(),
  filename:     varchar("filename",     { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType:     varchar("mimeType",     { length: 128 }).notNull(),
  size:         integer("size").notNull(),
  url:          varchar("url",          { length: 500 }).notNull(),
  fileKey:      varchar("fileKey",      { length: 500 }).notNull(),
  alt:          varchar("alt",          { length: 255 }),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

// ── Site Settings ────────────────────────────────────────────
export const siteSettings = pgTable("site_settings", {
  id:           serial("id").primaryKey(),
  settingKey:   varchar("settingKey",   { length: 128 }).notNull().unique(),
  settingValue: text("settingValue"),
  updatedAt:    timestamp("updatedAt").defaultNow().notNull(),
});

// ── Types ────────────────────────────────────────────────────
export type AdminUser     = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type BlogPost      = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;
export type BlogCategory  = typeof blogCategories.$inferSelect;
export type FaqItem       = typeof faqItems.$inferSelect;
export type InsertFaqItem = typeof faqItems.$inferInsert;
export type Lead          = typeof leads.$inferSelect;
export type InsertLead    = typeof leads.$inferInsert;
export type MediaFile     = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = typeof mediaFiles.$inferInsert;

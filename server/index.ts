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

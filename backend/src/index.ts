import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { paperRouter } from "./routes/papers";
import { reviewRouter } from "./routes/reviews";
import { profileRouter } from "./routes/profiles";
import { ipfsRouter } from "./routes/ipfs";
import { statsRouter } from "./routes/stats";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { startIndexer } from "./services/indexer";
import { prisma } from "./utils/prisma";

// ─────────────────────────────────────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Security & middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ssn-backend", timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/papers", paperRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/profiles", profileRouter);
app.use("/api/ipfs", ipfsRouter);
app.use("/api/stats", statsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
async function main() {
  try {
    // Verify DB connection
    await prisma.$connect();
    logger.info("✅ Database connected");

    // Start Solana event indexer (if enabled)
    if (process.env.INDEXER_ENABLED !== "false") {
      startIndexer().catch((err) =>
        logger.error("Indexer startup error:", err)
      );
    }

    app.listen(PORT, () => {
      logger.info(`🚀 SSN Backend listening on http://localhost:${PORT}`);
      logger.info(`📡 Solana RPC: ${process.env.SOLANA_RPC_URL}`);
      logger.info(`🔗 Program ID: ${process.env.SSN_PROGRAM_ID}`);
    });
  } catch (err) {
    logger.error("Fatal startup error:", err);
    process.exit(1);
  }
}

main();

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received – shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

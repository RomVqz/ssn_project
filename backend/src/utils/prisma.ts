import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Prisma client
// Prevents "too many connections" during hot-reload in development
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "warn" },
            { emit: "event", level: "error" },
          ]
        : [{ emit: "event", level: "error" }],
  });

if (process.env.NODE_ENV === "development") {
  // Log slow queries
  (prisma as unknown as { $on: (event: string, cb: (e: { duration: number; query: string }) => void) => void })
    .$on("query", (e) => {
      if (e.duration > 200) {
        logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });

  global.__prisma = prisma;
}

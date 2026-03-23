import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Custom application error
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────────────────────

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Prisma not-found
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaErr = err as any;
    if (prismaErr.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
  }

  // Unexpected error
  logger.error("Unhandled error:", { message: err.message, stack: err.stack });
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
}

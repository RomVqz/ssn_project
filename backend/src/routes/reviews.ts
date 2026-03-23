import { Router, Request, Response, NextFunction } from "express";
import { param, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";

// ─────────────────────────────────────────────────────────────────────────────
// /api/reviews
// ─────────────────────────────────────────────────────────────────────────────

export const reviewRouter = Router();

// ── GET /api/reviews/:pda ─────────────────────────────────────────────────────
reviewRouter.get(
  "/:pda",
  [param("pda").isString().trim()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, "Invalid PDA");

      const review = await prisma.review.findUnique({
        where: { pda: req.params.pda },
        include: {
          reviewer: { select: { wallet: true, reputation: true } },
          paper: { select: { onChainId: true, title: true } },
        },
      });

      if (!review) throw new AppError(404, "Review not found");

      res.json({
        data: {
          ...review,
          paperId: review.paperId.toString(),
          reviewer: review.reviewer
            ? { ...review.reviewer, reputation: review.reviewer.reputation.toString() }
            : null,
          paper: review.paper
            ? { ...review.paper, onChainId: review.paper.onChainId.toString() }
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/reviews/by-reviewer/:wallet ──────────────────────────────────────
reviewRouter.get(
  "/by-reviewer/:wallet",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviews = await prisma.review.findMany({
        where: { reviewerWallet: req.params.wallet },
        include: {
          paper: { select: { onChainId: true, title: true, field: true } },
        },
        orderBy: { submittedAt: "desc" },
      });

      res.json({
        data: reviews.map((r) => ({
          ...r,
          paperId: r.paperId.toString(),
          paper: r.paper
            ? { ...r.paper, onChainId: r.paper.onChainId.toString() }
            : null,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

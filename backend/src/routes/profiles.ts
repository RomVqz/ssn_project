import { Router, Request, Response, NextFunction } from "express";
import { param, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";

// ─────────────────────────────────────────────────────────────────────────────
// /api/profiles
// ─────────────────────────────────────────────────────────────────────────────

export const profileRouter = Router();

// ── GET /api/profiles/:wallet ─────────────────────────────────────────────────
profileRouter.get(
  "/:wallet",
  [param("wallet").isString().trim()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, "Invalid wallet address");

      const wallet = req.params.wallet;

      const profile = await prisma.userProfile.findUnique({
        where: { wallet },
        include: {
          papers: {
            orderBy: { publishedAt: "desc" },
            take: 10,
            select: {
              onChainId: true,
              title: true,
              field: true,
              publishedAt: true,
              avgRating: true,
              reviewCount: true,
              fundingGoal: true,
              fundingRaised: true,
            },
          },
          reviews: {
            orderBy: { submittedAt: "desc" },
            take: 10,
            include: {
              paper: { select: { onChainId: true, title: true, field: true } },
            },
          },
        },
      });

      // Return empty profile if not yet indexed
      if (!profile) {
        return res.json({
          data: {
            wallet,
            pda: null,
            reputation: "0",
            papersPublished: 0,
            reviewsSubmitted: 0,
            papers: [],
            reviews: [],
          },
        });
      }

      res.json({
        data: {
          ...profile,
          reputation: profile.reputation.toString(),
          papers: profile.papers.map((p) => ({
            ...p,
            onChainId: p.onChainId.toString(),
            fundingGoal: p.fundingGoal.toString(),
            fundingRaised: p.fundingRaised.toString(),
          })),
          reviews: profile.reviews.map((r) => ({
            ...r,
            paperId: r.paperId.toString(),
            paper: r.paper
              ? { ...r.paper, onChainId: r.paper.onChainId.toString() }
              : null,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/profiles/leaderboard ─────────────────────────────────────────────
// Top 20 researchers by reputation
profileRouter.get("/leaderboard/top", async (_req, res, next) => {
  try {
    const profiles = await prisma.userProfile.findMany({
      orderBy: { reputation: "desc" },
      take: 20,
      select: {
        wallet: true,
        reputation: true,
        papersPublished: true,
        reviewsSubmitted: true,
      },
    });

    res.json({
      data: profiles.map((p, idx) => ({
        rank: idx + 1,
        ...p,
        reputation: p.reputation.toString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

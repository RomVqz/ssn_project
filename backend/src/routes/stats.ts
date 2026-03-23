import { Router } from "express";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// /api/stats — Platform-wide metrics
// ─────────────────────────────────────────────────────────────────────────────

export const statsRouter = Router();

// ── GET /api/stats ────────────────────────────────────────────────────────────
statsRouter.get("/", async (_req, res, next) => {
  try {
    const [
      totalPapers,
      totalReviews,
      totalProfiles,
      totalContributions,
      fundingAggregate,
      topFields,
    ] = await Promise.all([
      prisma.paper.count(),
      prisma.review.count(),
      prisma.userProfile.count(),
      prisma.contribution.count(),
      prisma.paper.aggregate({ _sum: { fundingRaised: true } }),
      prisma.paper.groupBy({
        by: ["field"],
        _count: { field: true },
        orderBy: { _count: { field: "desc" } },
        take: 5,
      }),
    ]);

    const totalFundingRaisedLamports = fundingAggregate._sum.fundingRaised ?? 0n;

    res.json({
      data: {
        totalPapers,
        totalReviews,
        totalResearchers: totalProfiles,
        totalContributions,
        totalFundingRaisedSol: (Number(totalFundingRaisedLamports) / 1e9).toFixed(4),
        topFields: topFields.map((f) => ({ field: f.field, count: f._count.field })),
      },
    });
  } catch (err) {
    logger.error("Stats error:", err);
    next(err);
  }
});

// ── GET /api/stats/indexer ────────────────────────────────────────────────────
statsRouter.get("/indexer", async (_req, res, next) => {
  try {
    const checkpoint = await prisma.indexerCheckpoint.findUnique({ where: { id: 1 } });
    res.json({
      data: {
        lastSignature: checkpoint?.lastSignature ?? null,
        lastSlot: checkpoint?.lastSlot?.toString() ?? null,
        updatedAt: checkpoint?.updatedAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

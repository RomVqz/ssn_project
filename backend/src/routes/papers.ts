import { Router, Request, Response, NextFunction } from "express";
import { query, param, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";

// ─────────────────────────────────────────────────────────────────────────────
// /api/papers
// ─────────────────────────────────────────────────────────────────────────────

export const paperRouter = Router();

// ── GET /api/papers ───────────────────────────────────────────────────────────
// List papers with pagination, filtering, and sorting
paperRouter.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
    query("field").optional().isString().trim(),
    query("sort").optional().isIn(["newest", "oldest", "rating", "funding"]),
    query("search").optional().isString().trim(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);

      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 12);
      const skip = (page - 1) * limit;
      const field = req.query.field as string | undefined;
      const sort = (req.query.sort as string) ?? "newest";
      const search = req.query.search as string | undefined;

      const where = {
        ...(field ? { field } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                { authors: { has: search } },
                { field: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const orderBy =
        sort === "oldest"
          ? { publishedAt: "asc" as const }
          : sort === "rating"
          ? { avgRating: "desc" as const }
          : sort === "funding"
          ? { fundingRaised: "desc" as const }
          : { publishedAt: "desc" as const };

      const [papers, total] = await Promise.all([
        prisma.paper.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            author: { select: { wallet: true, reputation: true } },
            _count: { select: { reviews: true, contributions: true } },
          },
        }),
        prisma.paper.count({ where }),
      ]);

      res.json({
        data: papers.map(serializePaper),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/papers/fields ────────────────────────────────────────────────────
// Returns distinct research fields for filter UI
paperRouter.get("/fields", async (_req, res, next) => {
  try {
    const fields = await prisma.paper.findMany({
      select: { field: true },
      distinct: ["field"],
      orderBy: { field: "asc" },
    });
    res.json({ data: fields.map((f) => f.field) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/papers/:id ───────────────────────────────────────────────────────
paperRouter.get(
  "/:id",
  [param("id").isInt({ min: 0 }).toInt()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, "Invalid paper ID");

      const id = BigInt(req.params.id);
      const paper = await prisma.paper.findUnique({
        where: { onChainId: id },
        include: {
          author: true,
          reviews: {
            include: {
              reviewer: { select: { wallet: true, reputation: true } },
            },
            orderBy: { submittedAt: "desc" },
          },
          contributions: {
            orderBy: { timestamp: "desc" },
            take: 10,
          },
          _count: { select: { reviews: true, contributions: true } },
        },
      });

      if (!paper) throw new AppError(404, "Paper not found");

      res.json({ data: serializePaper(paper) });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/papers/:id/reviews ───────────────────────────────────────────────
paperRouter.get(
  "/:id/reviews",
  [
    param("id").isInt({ min: 0 }).toInt(),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 20 }).toInt(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, "Invalid parameters");

      const paperId = BigInt(req.params.id);
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);
      const skip = (page - 1) * limit;

      const paper = await prisma.paper.findUnique({ where: { onChainId: paperId } });
      if (!paper) throw new AppError(404, "Paper not found");

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where: { paperId },
          skip,
          take: limit,
          orderBy: { submittedAt: "desc" },
          include: {
            reviewer: { select: { wallet: true, reputation: true } },
          },
        }),
        prisma.review.count({ where: { paperId } }),
      ]);

      res.json({
        data: reviews.map(serializeReview),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/papers/:id/contributions ─────────────────────────────────────────
paperRouter.get(
  "/:id/contributions",
  [param("id").isInt({ min: 0 }).toInt()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paperId = BigInt(req.params.id);
      const contributions = await prisma.contribution.findMany({
        where: { paperId },
        orderBy: { timestamp: "desc" },
        take: 20,
      });

      res.json({ data: contributions.map(serializeContribution) });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Serializers (BigInt → string / number for JSON)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePaper(p: any) {
  return {
    ...p,
    onChainId: p.onChainId?.toString(),
    fundingGoal: p.fundingGoal?.toString(),
    fundingRaised: p.fundingRaised?.toString(),
    fundingProgressPct:
      p.fundingGoal > 0n
        ? Math.min(
            100,
            Math.round((Number(p.fundingRaised) / Number(p.fundingGoal)) * 100)
          )
        : 0,
    reviews: p.reviews?.map(serializeReview),
    contributions: p.contributions?.map(serializeContribution),
    author: p.author
      ? { ...p.author, reputation: p.author.reputation?.toString() }
      : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeReview(r: any) {
  return {
    ...r,
    paperId: r.paperId?.toString(),
    reviewer: r.reviewer
      ? { ...r.reviewer, reputation: r.reviewer.reputation?.toString() }
      : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeContribution(c: any) {
  return {
    ...c,
    paperId: c.paperId?.toString(),
    amount: c.amount?.toString(),
    amountSol: c.amount ? (Number(c.amount) / 1e9).toFixed(4) : "0",
  };
}

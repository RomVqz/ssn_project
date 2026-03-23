import { Router, Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { pinPaperMetadata, pinReviewComment, fetchFromIPFS, ipfsUrl } from "../services/ipfs";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// /api/ipfs
// Note: PDF upload is handled client-side with the Pinata API directly
// (avoids proxying large files through this server).
// These endpoints handle metadata JSON pinning.
// ─────────────────────────────────────────────────────────────────────────────

export const ipfsRouter = Router();

// ── POST /api/ipfs/paper-metadata ─────────────────────────────────────────────
// Pin abstract + metadata JSON; returns CID
ipfsRouter.post(
  "/paper-metadata",
  [
    body("title").isString().trim().isLength({ min: 1, max: 200 }),
    body("authors").isArray({ min: 1, max: 20 }),
    body("abstract").isString().trim().isLength({ min: 10, max: 5000 }),
    body("field").isString().trim().isLength({ min: 1, max: 50 }),
    body("pdfCid").isString().trim().isLength({ min: 10, max: 100 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);

      const { title, authors, abstract, field, pdfCid } = req.body as {
        title: string;
        authors: string[];
        abstract: string;
        field: string;
        pdfCid: string;
      };

      const cid = await pinPaperMetadata({ title, authors, abstract, field, pdfCid });

      res.json({ data: { cid, url: ipfsUrl(cid) } });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/ipfs/review-comment ─────────────────────────────────────────────
// Pin review comment + rating; returns CID
ipfsRouter.post(
  "/review-comment",
  [
    body("comment").isString().trim().isLength({ min: 10, max: 5000 }),
    body("rating").isInt({ min: 1, max: 5 }),
    body("paperId").isInt({ min: 0 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, errors.array()[0].msg);

      const { comment, rating, paperId } = req.body as {
        comment: string;
        rating: number;
        paperId: number;
      };

      const cid = await pinReviewComment({ comment, rating, paperId });

      res.json({ data: { cid, url: ipfsUrl(cid) } });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/ipfs/:cid ────────────────────────────────────────────────────────
// Proxy fetch from IPFS (for small JSON metadata)
ipfsRouter.get(
  "/:cid",
  [param("cid").isString().trim().isLength({ min: 10, max: 100 })],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(400, "Invalid CID");

      const data = await fetchFromIPFS(req.params.cid);
      res.json({ data });
    } catch (err) {
      logger.warn(`IPFS fetch failed for CID ${req.params.cid}`);
      next(err);
    }
  }
);

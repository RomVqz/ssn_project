// ── ReviewForm ────────────────────────────────────────────────────────────────
"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAddReview } from "@/hooks/useAddReview";
import { toast } from "react-hot-toast";
import { StarRating } from "@/components/ui/StarRating";

interface ReviewFormProps {
  paperId: number;
  paperPda: string;
  onSuccess: () => void;
}

export function ReviewForm({ paperId, paperPda, onSuccess }: ReviewFormProps) {
  const { connected } = useWallet();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const { addReview, loading } = useAddReview();

  async function handleSubmit() {
    if (rating === 0) return toast.error("Please select a rating (1-5 stars)");
    if (comment.trim().length < 10) return toast.error("Comment must be at least 10 characters");

    const toastId = toast.loading("Pinning review to IPFS…");
    try {
      // 1. Pin review comment to IPFS
      const ipfsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ipfs/review-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, rating, paperId }),
      });
      if (!ipfsRes.ok) throw new Error("IPFS pin failed");
      const ipfsData = await ipfsRes.json();
      const commentCid = ipfsData.data.cid;

      toast.loading("Waiting for wallet signature…", { id: toastId });

      // 2. Submit review on-chain
      await addReview({ paperId, paperPda, rating, commentCid });

      toast.success("Review submitted! +10 REP 🌟", { id: toastId });
      setRating(0);
      setComment("");
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review", { id: toastId });
    }
  }

  if (!connected) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Connect your wallet to submit a peer review.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  if (!open) {
    return (
      <button
        className="btn-secondary w-full justify-center text-sm"
        onClick={() => setOpen(true)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        Write a Review (+10 REP)
      </button>
    );
  }

  return (
    <div className="card accent-top p-6 space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base text-[var(--text-primary)]">Write a Review</h3>
        <button className="btn-ghost text-xs" onClick={() => setOpen(false)}>Cancel</button>
      </div>

      {/* Star selector */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 font-mono">
          Rating *
        </label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 font-mono">
          Review Comments * <span className="normal-case">(stored on IPFS)</span>
        </label>
        <textarea
          className="input-field resize-none"
          rows={4}
          placeholder="Describe your evaluation of this paper's methodology, findings, and contribution to the field…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="text-right text-xs text-[var(--text-muted)] mt-1 font-mono">
          {comment.length} chars
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="btn-primary text-sm flex-1 justify-center"
          onClick={handleSubmit}
          disabled={loading || rating === 0}
        >
          {loading ? "Submitting…" : "Submit Review"}
        </button>
        <p className="text-xs text-[var(--text-muted)] font-mono">+10 REP on success</p>
      </div>
    </div>
  );
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

import { formatDate, shortenAddress } from "@/lib/utils";
import { AddressChip } from "@/components/ui/AddressChip";

interface ReviewCardProps {
  review: Record<string, unknown>;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <AddressChip
          address={review.reviewerWallet as string}
          reputation={(review.reviewer as Record<string, unknown>)?.reputation as string}
        />
        <div className="flex items-center gap-3">
          <StarRating value={review.rating as number} readonly size="sm" />
          <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">
            {formatDate(review.submittedAt as string)}
          </span>
        </div>
      </div>

      {/* IPFS comment link */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--bg-border)]">
        <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
          IPFS
        </span>
        <a
          href={`https://gateway.pinata.cloud/ipfs/${review.commentCid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-teal-400 hover:text-teal-300 transition-colors truncate"
        >
          {String(review.commentCid).slice(0, 32)}…
        </a>
      </div>
    </div>
  );
}

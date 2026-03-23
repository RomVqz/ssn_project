import Link from "next/link";
import { StarRating } from "@/components/ui/StarRating";
import { formatDate, solFromLamports } from "@/lib/utils";

interface PaperCardProps {
  paper: Record<string, unknown>;
}

export function PaperCard({ paper }: PaperCardProps) {
  const fundingPct = paper.fundingProgressPct as number ?? 0;
  const hasFundingGoal = paper.fundingGoal !== "0";

  return (
    <Link
      href={`/papers/${paper.onChainId}`}
      className="card accent-top p-5 flex flex-col gap-3 hover:no-underline group"
    >
      {/* Field badge + date */}
      <div className="flex items-center justify-between gap-2">
        <span className="badge badge-field">{paper.field as string}</span>
        <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">
          {formatDate(paper.publishedAt as string)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-display text-base text-[var(--text-primary)] leading-snug line-clamp-3 group-hover:text-amber-100 transition-colors">
        {paper.title as string}
      </h3>

      {/* Authors */}
      <p className="text-xs text-[var(--text-muted)] line-clamp-1">
        {(paper.authors as string[])?.join(", ")}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--bg-border)]">
        {/* Rating or placeholder */}
        {(paper.avgRating as number) > 0 ? (
          <StarRating value={paper.avgRating as number} readonly size="xs" />
        ) : (
          <span className="text-xs text-[var(--text-muted)] font-mono">No reviews yet</span>
        )}

        {/* Review count */}
        <span className="text-xs text-[var(--text-muted)] font-mono">
          {paper.reviewCount as number} review{paper.reviewCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Funding progress */}
      {hasFundingGoal && (
        <div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${fundingPct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] font-mono text-teal-400">
              {solFromLamports(paper.fundingRaised as string)} SOL
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {fundingPct}% funded
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

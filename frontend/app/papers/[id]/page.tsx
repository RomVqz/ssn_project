"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/api";
import { StarRating } from "@/components/ui/StarRating";
import { FundingProgress } from "@/components/paper/FundingProgress";
import { ReviewForm } from "@/components/review/ReviewForm";
import { ContributeForm } from "@/components/paper/ContributeForm";
import { ReviewCard } from "@/components/review/ReviewCard";
import { AddressChip } from "@/components/ui/AddressChip";
import { SkeletonPaperDetail } from "@/components/ui/Skeletons";
import { formatDate, solFromLamports } from "@/lib/utils";
import Link from "next/link";

export default function PaperDetailPage() {
  const params = useParams();
  const paperId = params.id as string;

  const { data, error, mutate } = useSWR(
    `${API_URL}/papers/${paperId}`,
    fetcher
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <p className="text-[var(--text-secondary)]">Paper not found or failed to load.</p>
      <Link href="/" className="btn-ghost mt-4">← Back to feed</Link>
    </div>
  );

  if (!data) return <SkeletonPaperDetail />;

  const paper = data.data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <Link href="/" className="btn-ghost pl-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 inline-flex">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
        </svg>
        Back to feed
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="card accent-top p-7">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge badge-field">{paper.field}</span>
              {paper.reviewCount > 0 && (
                <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}>
                  {paper.reviewCount} review{paper.reviewCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl md:text-3xl text-[var(--text-primary)] mb-4 leading-snug">
              {paper.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)] mb-5">
              <span>{paper.authors?.join(", ")}</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span>{formatDate(paper.publishedAt)}</span>
              {paper.avgRating > 0 && (
                <>
                  <span className="text-[var(--text-muted)]">·</span>
                  <StarRating value={paper.avgRating} readonly size="sm" />
                </>
              )}
            </div>

            {/* Author chip */}
            <div className="flex items-center gap-2 pt-4 border-t border-[var(--bg-border)]">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-mono">Published by</span>
              <AddressChip address={paper.authorWallet} reputation={paper.author?.reputation} />
            </div>
          </div>

          {/* Abstract / IPFS link */}
          <div className="card p-6">
            <h2 className="font-display text-lg text-[var(--text-primary)] mb-4">Abstract</h2>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
              Metadata and full text stored on IPFS — content-addressed and immutable.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://gateway.pinata.cloud/ipfs/${paper.pdfCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                View PDF
              </a>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${paper.abstractCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                </svg>
                Metadata JSON
              </a>
            </div>

            {/* CIDs */}
            <div className="mt-5 pt-5 border-t border-[var(--bg-border)] space-y-2">
              <div className="flex items-start gap-3 text-xs">
                <span className="text-[var(--text-muted)] font-mono w-20 shrink-0 pt-0.5">PDF CID</span>
                <span className="font-mono text-[var(--text-secondary)] break-all">{paper.pdfCid}</span>
              </div>
              <div className="flex items-start gap-3 text-xs">
                <span className="text-[var(--text-muted)] font-mono w-20 shrink-0 pt-0.5">META CID</span>
                <span className="font-mono text-[var(--text-secondary)] break-all">{paper.abstractCid}</span>
              </div>
              <div className="flex items-start gap-3 text-xs">
                <span className="text-[var(--text-muted)] font-mono w-20 shrink-0 pt-0.5">PAPER PDA</span>
                <span className="font-mono text-[var(--text-secondary)] break-all">{paper.pda}</span>
              </div>
            </div>
          </div>

          {/* Reviews section */}
          <div>
            <div className="divider-label mb-6">
              Peer Reviews ({paper.reviewCount})
            </div>

            {paper.reviews?.length > 0 ? (
              <div className="space-y-4 stagger">
                {paper.reviews.map((review: Record<string, unknown>) => (
                  <ReviewCard key={review.id as string} review={review} />
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <div className="text-3xl mb-2">🔬</div>
                <p className="text-[var(--text-secondary)] text-sm">
                  No reviews yet. Be the first to review this paper.
                </p>
              </div>
            )}

            {/* Review form */}
            <div className="mt-6">
              <ReviewForm paperId={Number(paper.onChainId)} paperPda={paper.pda} onSuccess={() => mutate()} />
            </div>
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Funding card */}
          <div className="card p-6">
            <h3 className="font-display text-lg text-[var(--text-primary)] mb-4">Funding</h3>
            <FundingProgress
              raised={paper.fundingRaised}
              goal={paper.fundingGoal}
              pct={paper.fundingProgressPct}
            />
            <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)] font-mono">
              <span>{solFromLamports(paper.fundingRaised)} SOL raised</span>
              <span>Goal: {solFromLamports(paper.fundingGoal)} SOL</span>
            </div>

            {/* Contributors count */}
            {paper._count?.contributions > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-3">
                {paper._count.contributions} contributor{paper._count.contributions !== 1 ? "s" : ""}
              </p>
            )}

            <div className="mt-5 pt-5 border-t border-[var(--bg-border)]">
              <ContributeForm
                paperId={Number(paper.onChainId)}
                paperPda={paper.pda}
                onSuccess={() => mutate()}
              />
            </div>
          </div>

          {/* On-chain info */}
          <div className="card p-5">
            <h3 className="font-display text-base text-[var(--text-primary)] mb-4">On-Chain Info</h3>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-muted)] font-mono">Paper ID</dt>
                <dd className="font-mono text-[var(--text-secondary)]">#{paper.onChainId}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-muted)] font-mono">Reviews</dt>
                <dd className="font-mono text-[var(--text-secondary)]">{paper.reviewCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--text-muted)] font-mono">Avg Rating</dt>
                <dd className="font-mono text-amber-400">{paper.avgRating > 0 ? `${paper.avgRating} / 5` : "—"}</dd>
              </div>
              <div className="pt-3 border-t border-[var(--bg-border)]">
                <dt className="text-[var(--text-muted)] font-mono mb-1">TX Signature</dt>
                <dd className="font-mono text-[var(--text-secondary)] break-all text-[10px] leading-relaxed">
                  {paper.txSignature}
                </dd>
              </div>
            </dl>

            <a
              href={`https://explorer.solana.com/address/${paper.pda}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs mt-4 w-full justify-center"
            >
              View on Solana Explorer ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

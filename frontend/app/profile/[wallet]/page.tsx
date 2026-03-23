"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/api";
import { AddressChip } from "@/components/ui/AddressChip";
import { StarRating } from "@/components/ui/StarRating";
import { formatDate, solFromLamports, shortenAddress } from "@/lib/utils";
import Link from "next/link";

export default function ProfilePage() {
  const params = useParams();
  const wallet = params.wallet as string;

  const { data, error } = useSWR(`${API_URL}/profiles/${wallet}`, fetcher);

  if (error) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <p className="text-[var(--text-secondary)]">Profile not found.</p>
    </div>
  );

  if (!data) return <ProfileSkeleton />;

  const profile = data.data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      {/* ── Profile header ─────────────────────────────────────────────── */}
      <div className="card accent-top p-7 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 to-teal-500/20 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="font-mono text-lg text-amber-400 font-bold">
              {shortenAddress(wallet, 2, 0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="font-mono text-[var(--text-primary)] text-sm">{shortenAddress(wallet)}</span>
              <button
                onClick={() => navigator.clipboard.writeText(wallet)}
                className="btn-ghost text-xs py-0.5"
              >
                Copy
              </button>
            </div>
            <p className="font-mono text-xs text-[var(--text-muted)] break-all">{wallet}</p>
          </div>

          {/* Reputation badge */}
          <div className="text-right">
            <div className="text-3xl font-display text-amber-400 font-semibold leading-none">
              {profile.reputation}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-mono mt-1 uppercase tracking-wider">
              Reputation
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--bg-border)]">
          <Stat label="Papers Published" value={profile.papersPublished} />
          <Stat label="Reviews Submitted" value={profile.reviewsSubmitted} />
          <Stat label="Reputation Points" value={profile.reputation} accent />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Papers ─────────────────────────────────────────────────── */}
        <div>
          <div className="divider-label mb-5">Published Papers ({profile.papersPublished})</div>
          {profile.papers?.length > 0 ? (
            <div className="space-y-3 stagger">
              {profile.papers.map((paper: Record<string, unknown>) => (
                <Link
                  key={paper.onChainId as string}
                  href={`/papers/${paper.onChainId}`}
                  className="card accent-top p-4 block hover:no-underline"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="badge badge-field text-[10px] mb-2 inline-block">
                        {paper.field as string}
                      </span>
                      <h3 className="font-display text-sm text-[var(--text-primary)] leading-snug line-clamp-2">
                        {paper.title as string}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                        {formatDate(paper.publishedAt as string)}
                      </p>
                    </div>
                    {(paper.avgRating as number) > 0 && (
                      <StarRating value={paper.avgRating as number} readonly size="xs" />
                    )}
                  </div>
                  {(paper.fundingGoal as string) !== "0" && (
                    <div className="mt-3 pt-3 border-t border-[var(--bg-border)]">
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, Math.round(Number(paper.fundingRaised) / Number(paper.fundingGoal) * 100))}%`
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                        {solFromLamports(paper.fundingRaised as string)} / {solFromLamports(paper.fundingGoal as string)} SOL
                      </p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon="📄" message="No papers published yet." />
          )}
        </div>

        {/* ── Reviews ────────────────────────────────────────────────── */}
        <div>
          <div className="divider-label mb-5">Reviews Given ({profile.reviewsSubmitted})</div>
          {profile.reviews?.length > 0 ? (
            <div className="space-y-3 stagger">
              {profile.reviews.map((review: Record<string, unknown>) => {
                const paper = review.paper as Record<string, unknown> | null;
                return (
                  <Link
                    key={review.id as string}
                    href={`/papers/${review.paperId}`}
                    className="card p-4 block hover:no-underline"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <StarRating value={review.rating as number} readonly size="sm" />
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {formatDate(review.submittedAt as string)}
                      </span>
                    </div>
                    {paper && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                        on: <span className="text-[var(--text-primary)]">{paper.title as string}</span>
                      </p>
                    )}
                    <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
                      CID: {String(review.commentCid).slice(0, 20)}…
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="🔬" message="No reviews submitted yet." />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-display font-semibold ${accent ? "text-amber-400" : "text-[var(--text-primary)]"}`}>
        {value}
      </div>
      <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{label}</div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-[var(--text-secondary)] text-sm">{message}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="card p-7 mb-8">
        <div className="flex items-center gap-5">
          <div className="skeleton w-16 h-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-48 rounded" />
            <div className="skeleton h-3 w-96 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--bg-border)]">
          {[0,1,2].map(i => <div key={i} className="skeleton h-12 rounded" />)}
        </div>
      </div>
    </div>
  );
}

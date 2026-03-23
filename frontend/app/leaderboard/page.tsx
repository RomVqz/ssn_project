"use client";

import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/api";
import { shortenAddress } from "@/lib/utils";
import Link from "next/link";

export default function LeaderboardPage() {
  const { data, error } = useSWR(`${API_URL}/profiles/leaderboard/top`, fetcher);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.06)]">
          <span className="text-amber-400 text-xs font-mono tracking-widest uppercase">
            On-Chain Reputation
          </span>
        </div>
        <h1 className="font-display text-4xl text-[var(--text-primary)] mb-2">
          Leaderboard
        </h1>
        <p className="text-[var(--text-secondary)]">
          Researchers ranked by cumulative reputation earned through publishing and peer review.
        </p>
      </div>

      {/* Reputation legend */}
      <div className="card p-4 mb-8 flex flex-wrap gap-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-[var(--text-muted)] font-mono">+50 REP per paper published</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span className="text-xs text-[var(--text-muted)] font-mono">+10 REP per review submitted</span>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          Failed to load leaderboard.
        </div>
      ) : !data ? (
        <LeaderboardSkeleton />
      ) : (
        <div className="space-y-2 stagger">
          {data.data?.map((entry: Record<string, unknown>) => (
            <LeaderboardRow key={entry.wallet as string} entry={entry} />
          ))}
          {data.data?.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-[var(--text-secondary)]">
                No researchers yet. Be the first to publish!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: Record<string, unknown> }) {
  const rank = entry.rank as number;
  const wallet = entry.wallet as string;
  const reputation = entry.reputation as string;
  const papers = entry.papersPublished as number;
  const reviews = entry.reviewsSubmitted as number;

  const medalColor =
    rank === 1 ? "text-amber-400" :
    rank === 2 ? "text-slate-300" :
    rank === 3 ? "text-amber-700" :
    "text-[var(--text-muted)]";

  return (
    <Link
      href={`/profile/${wallet}`}
      className="card accent-top flex items-center gap-4 p-4 hover:no-underline group"
    >
      {/* Rank */}
      <div className={`w-8 text-center font-display text-lg font-semibold shrink-0 ${medalColor}`}>
        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-teal-500/20 border border-amber-500/20 flex items-center justify-center shrink-0">
        <span className="font-mono text-xs text-amber-400 font-bold">
          {shortenAddress(wallet, 2, 0).toUpperCase()}
        </span>
      </div>

      {/* Address */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm text-[var(--text-primary)] group-hover:text-amber-300 transition-colors truncate">
          {shortenAddress(wallet)}
        </div>
        <div className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
          {papers} paper{papers !== 1 ? "s" : ""} · {reviews} review{reviews !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Reputation */}
      <div className="text-right shrink-0">
        <div className="font-display text-xl text-amber-400 font-semibold leading-none">
          {reputation}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 uppercase tracking-wider">
          REP
        </div>
      </div>
    </Link>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <div className="skeleton w-8 h-6 rounded" />
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="skeleton h-6 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

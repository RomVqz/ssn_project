"use client";

import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/api";

export function StatsBar() {
  const { data } = useSWR(`${API_URL}/stats`, fetcher, { refreshInterval: 30_000 });
  const stats = data?.data;

  const items = [
    { label: "Papers", value: stats?.totalPapers ?? "—" },
    { label: "Reviews", value: stats?.totalReviews ?? "—" },
    { label: "Researchers", value: stats?.totalResearchers ?? "—" },
    { label: "SOL Funded", value: stats ? `${stats.totalFundingRaisedSol} ◎` : "—" },
  ];

  return (
    <div className="border-b border-[var(--bg-border)] bg-[rgba(0,0,0,0.2)]">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
                {item.label}
              </span>
              <span className="text-sm text-amber-400 font-mono font-semibold">
                {item.value}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-slow" />
            <span className="text-xs text-[var(--text-muted)] font-mono">devnet</span>
          </div>
        </div>
      </div>
    </div>
  );
}

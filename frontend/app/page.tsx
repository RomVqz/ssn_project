"use client";

import { useState } from "react";
import { PaperFeed } from "@/components/paper/PaperFeed";
import { StatsBar } from "@/components/layout/StatsBar";
import { SearchFilters } from "@/components/paper/SearchFilters";
import Link from "next/link";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [field, setField] = useState("");
  const [sort, setSort] = useState("newest");

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--bg-border)]">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse at center, #f59e0b 0%, transparent 70%)" }}
        />

        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            {/* Label */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.06)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
              <span className="text-amber-400 text-xs font-mono tracking-widest uppercase">
                Solana Devnet
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl md:text-6xl text-[var(--text-primary)] mb-5 leading-tight">
              Science without{" "}
              <em className="text-amber-400 not-italic">gatekeepers.</em>
            </h1>

            <p className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-xl mb-8">
              Publish research directly on-chain. Earn reputation through peer review.
              Fund the science that matters — no journals, no paywalls.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/publish" className="btn-primary text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Publish a Paper
              </Link>
              <Link href="/papers" className="btn-secondary text-sm">
                Browse Research
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform stats ────────────────────────────────────────────────── */}
      <StatsBar />

      {/* ── Search + Feed ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h2 className="font-display text-2xl text-[var(--text-primary)]">
            Latest Research
          </h2>
          <SearchFilters
            search={search}
            field={field}
            sort={sort}
            onSearch={setSearch}
            onField={setField}
            onSort={setSort}
          />
        </div>

        <PaperFeed search={search} field={field} sort={sort} />
      </section>
    </>
  );
}

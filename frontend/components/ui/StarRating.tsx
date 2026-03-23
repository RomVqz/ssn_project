// ── StarRating ────────────────────────────────────────────────────────────────
"use client";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "xs" | "sm" | "lg";
}

const sizeMap = { xs: 12, sm: 15, lg: 22 };

export function StarRating({ value, onChange, readonly = false, size = "sm" }: StarRatingProps) {
  const px = sizeMap[size];

  return (
    <div className="flex items-center gap-0.5" role={readonly ? undefined : "radiogroup"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-transform ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          style={{ background: "none", border: "none", padding: 0, lineHeight: 1 }}
          aria-label={readonly ? undefined : `Rate ${star} stars`}
        >
          <svg
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill={star <= value ? "#fbbf24" : "none"}
            stroke={star <= value ? "#fbbf24" : "#334155"}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

// ── AddressChip ───────────────────────────────────────────────────────────────

import Link from "next/link";
import { shortenAddress } from "@/lib/utils";

interface AddressChipProps {
  address: string;
  reputation?: string | number;
}

export function AddressChip({ address, reputation }: AddressChipProps) {
  return (
    <Link
      href={`/profile/${address}`}
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[rgba(255,255,255,0.04)] border border-[var(--bg-border)] hover:border-amber-500/30 hover:bg-[rgba(245,158,11,0.05)] transition-all"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-500/40 to-teal-500/30 shrink-0" />
      <span className="font-mono text-xs text-[var(--text-secondary)]">
        {shortenAddress(address)}
      </span>
      {reputation !== undefined && Number(reputation) > 0 && (
        <span className="font-mono text-[10px] text-amber-400">
          {reputation} REP
        </span>
      )}
    </Link>
  );
}

// ── Skeleton components ───────────────────────────────────────────────────────

export function SkeletonPaperDetail() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="skeleton h-4 w-24 rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-7 space-y-4">
            <div className="skeleton h-5 w-20 rounded-full" />
            <div className="skeleton h-8 w-3/4 rounded" />
            <div className="skeleton h-8 w-1/2 rounded" />
            <div className="skeleton h-4 w-40 rounded" />
          </div>
          <div className="card p-6 space-y-3">
            <div className="skeleton h-5 w-24 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="card p-6 space-y-3">
            <div className="skeleton h-5 w-20 rounded" />
            <div className="skeleton h-2 w-full rounded-full" />
            <div className="skeleton h-9 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SearchFilters ─────────────────────────────────────────────────────────────
"use client";

import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/api";

interface SearchFiltersProps {
  search: string;
  field: string;
  sort: string;
  onSearch: (v: string) => void;
  onField: (v: string) => void;
  onSort: (v: string) => void;
}

export function SearchFilters({ search, field, sort, onSearch, onField, onSort }: SearchFiltersProps) {
  const { data } = useSWR(`${API_URL}/papers/fields`, fetcher);
  const fields: string[] = data?.data ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className="input-field pl-8 py-2 text-sm w-48"
          placeholder="Search papers…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Field filter */}
      <select
        className="input-field py-2 text-sm w-36"
        value={field}
        onChange={(e) => onField(e.target.value)}
      >
        <option value="">All fields</option>
        {fields.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        className="input-field py-2 text-sm w-36"
        value={sort}
        onChange={(e) => onSort(e.target.value)}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="rating">Top Rated</option>
        <option value="funding">Most Funded</option>
      </select>
    </div>
  );
}

// ── FundingProgress ───────────────────────────────────────────────────────────

interface FundingProgressProps {
  raised: string;
  goal: string;
  pct: number;
}

export function FundingProgress({ raised: _raised, goal: _goal, pct }: FundingProgressProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">Progress</span>
        <span className="text-sm font-mono font-bold text-teal-400">{pct}%</span>
      </div>
      <div className="progress-track h-2">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── ContributeForm ────────────────────────────────────────────────────────────

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useContribute } from "@/hooks/useContribute";
import { toast } from "react-hot-toast";

interface ContributeFormProps {
  paperId: number;
  paperPda: string;
  onSuccess: () => void;
}

export function ContributeForm({ paperId, paperPda, onSuccess }: ContributeFormProps) {
  const { connected } = useWallet();
  const [amount, setAmount] = useState("0.1");
  const { contribute, loading } = useContribute();

  async function handleContribute() {
    const solAmount = parseFloat(amount);
    if (!solAmount || solAmount <= 0) return toast.error("Enter a valid amount");

    const toastId = toast.loading("Waiting for wallet…");
    try {
      await contribute({ paperId, paperPda, amountSol: solAmount });
      toast.success(`Contributed ${solAmount} SOL! 🎉`, { id: toastId });
      setAmount("0.1");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Transaction failed", { id: toastId });
    }
  }

  if (!connected) {
    return (
      <div className="text-center">
        <p className="text-xs text-[var(--text-muted)] mb-3">Connect wallet to contribute</p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="number"
          min="0.001"
          step="0.01"
          className="input-field py-2 text-sm flex-1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="SOL amount"
        />
        <button
          className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
          onClick={handleContribute}
          disabled={loading}
        >
          {loading ? "…" : "Fund ◎"}
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] font-mono">
        Funds held in escrow PDA until author releases them.
      </p>
    </div>
  );
}

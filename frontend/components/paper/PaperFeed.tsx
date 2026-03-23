"use client";

import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/api";
import { PaperCard } from "./PaperCard";
import { useState } from "react";

interface PaperFeedProps {
  search?: string;
  field?: string;
  sort?: string;
}

export function PaperFeed({ search, field, sort }: PaperFeedProps) {
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    ...(search ? { search } : {}),
    ...(field ? { field } : {}),
    ...(sort ? { sort } : {}),
  });

  const { data, error, isLoading } = useSWR(
    `${API_URL}/papers?${params}`,
    fetcher,
    { keepPreviousData: true }
  );

  if (error) return (
    <div className="text-center py-16 text-[var(--text-secondary)]">
      Failed to load papers. Is the backend running?
    </div>
  );

  if (isLoading && !data) return <FeedSkeleton />;

  const papers = data?.data ?? [];
  const pagination = data?.pagination;

  if (papers.length === 0) return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">🔭</div>
      <p className="text-[var(--text-secondary)]">No papers found.</p>
      {search && (
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Try a different search term.
        </p>
      )}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
        {papers.map((paper: Record<string, unknown>) => (
          <PaperCard key={paper.id as string} paper={paper} />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-12">
          <button
            className="btn-secondary text-sm py-2 px-4"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev}
          >
            ← Prev
          </button>
          <span className="text-sm text-[var(--text-muted)] font-mono">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            className="btn-secondary text-sm py-2 px-4"
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNext}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="skeleton h-4 w-16 rounded-full" />
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="mt-3 skeleton h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

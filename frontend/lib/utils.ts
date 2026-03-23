// ── Date formatting ───────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Address shortening ────────────────────────────────────────────────────────
export function shortenAddress(addr: string, head = 4, tail = 4): string {
  if (!addr || addr.length < head + tail + 3) return addr ?? "";
  if (tail === 0) return addr.slice(0, head) + "…";
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

// ── SOL from lamports ─────────────────────────────────────────────────────────
export function solFromLamports(lamports: string | number | bigint): string {
  const n = Number(lamports ?? 0);
  return (n / 1e9).toFixed(4);
}

// ── Truncate string ───────────────────────────────────────────────────────────
export function truncate(str: string, maxLen = 80): string {
  if (!str || str.length <= maxLen) return str ?? "";
  return str.slice(0, maxLen) + "…";
}

// ── Class merge helper ────────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

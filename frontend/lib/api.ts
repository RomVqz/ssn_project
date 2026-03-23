// ── API base URL ──────────────────────────────────────────────────────────────
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ── SWR fetcher ───────────────────────────────────────────────────────────────
export async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/api";
import { shortenAddress } from "@/lib/utils";
import { useState, useEffect } from "react";

export function Navbar() {
  const { connected, publicKey } = useWallet();
  const [scrolled, setScrolled] = useState(false);

  // Fetch user reputation
  const { data: profileData } = useSWR(
    connected && publicKey ? `${API_URL}/profiles/${publicKey.toBase58()}` : null,
    fetcher
  );

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-200
        ${scrolled
          ? "bg-[rgba(7,8,10,0.92)] backdrop-blur-md border-b border-[var(--bg-border)]"
          : "bg-transparent border-b border-transparent"
        }`}
    >
      <div className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
              <circle cx="12" cy="5" r="3"/><path d="M6.5 20H4a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-2.5"/>
              <circle cx="12" cy="20" r="2"/>
            </svg>
          </div>
          <span className="font-display text-[var(--text-primary)] text-base font-semibold tracking-tight">
            SSN
          </span>
          <span className="hidden sm:block text-[var(--text-muted)] text-sm">
            Solana Science Network
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/">Feed</NavLink>
          <NavLink href="/publish">Publish</NavLink>
          <NavLink href="/leaderboard">Leaderboard</NavLink>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Reputation badge */}
          {connected && publicKey && profileData && (
            <Link
              href={`/profile/${publicKey.toBase58()}`}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] hover:bg-[rgba(245,158,11,0.12)] transition-colors"
            >
              <span className="text-amber-400 text-xs font-mono font-bold">
                {profileData.data?.reputation ?? 0} REP
              </span>
              <span className="text-[var(--text-muted)] text-xs font-mono">
                {shortenAddress(publicKey.toBase58())}
              </span>
            </Link>
          )}

          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors font-medium"
    >
      {children}
    </Link>
  );
}

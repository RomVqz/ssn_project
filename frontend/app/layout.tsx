import type { Metadata } from "next";
import "../styles/globals.css";
import { WalletProviderWrapper } from "@/components/wallet/WalletProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "SSN — Solana Science Network",
  description: "Decentralized scientific publishing, peer review, and research funding on Solana.",
  keywords: ["science", "solana", "blockchain", "research", "peer-review", "open-science"],
  openGraph: {
    title: "SSN — Solana Science Network",
    description: "Publish, review, and fund scientific research on-chain.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="grain">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="lab-grid min-h-screen">
        <WalletProviderWrapper>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#161920",
                color: "#f1f0ed",
                border: "1px solid #222730",
                fontFamily: "'DM Sans', sans-serif",
              },
            }}
          />
        </WalletProviderWrapper>
      </body>
    </html>
  );
}

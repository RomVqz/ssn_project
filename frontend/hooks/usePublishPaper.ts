"use client";

import { useState } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useProgram, PROGRAM_ID } from "./useProgram";

interface PublishParams {
  title: string;
  authors: string[];
  abstractCid: string;
  pdfCid: string;
  field: string;
  fundingGoalSol: number;
}

export function usePublishPaper() {
  const { program, wallet } = useProgram();
  const [loading, setLoading] = useState(false);

  async function publish(params: PublishParams): Promise<number> {
    if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    try {
      // ── Derive PDAs ───────────────────────────────────────────────────────
      const [platformStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform")],
        PROGRAM_ID
      );

      // Read current paper count to derive paper PDA
      const platformState = await program.account.platformState.fetch(platformStatePda);
      const paperId: BN = platformState.totalPapers as BN;
      const paperIdBuf = paperId.toArrayLike(Buffer, "le", 8);

      const [paperPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("paper"), paperIdBuf],
        PROGRAM_ID
      );

      const [authorProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // ── Build & send transaction ──────────────────────────────────────────
      const fundingGoalLamports = new BN(
        Math.round(params.fundingGoalSol * 1_000_000_000)
      );

      await (program.methods as unknown as {
        publishPaper: (
          title: string,
          authors: string[],
          abstractCid: string,
          pdfCid: string,
          field: string,
          fundingGoal: BN
        ) => {
          accounts: (accounts: Record<string, PublicKey>) => {
            rpc: () => Promise<string>;
          };
        };
      })
        .publishPaper(
          params.title,
          params.authors,
          params.abstractCid,
          params.pdfCid,
          params.field,
          fundingGoalLamports
        )
        .accounts({
          paper: paperPda,
          authorProfile: authorProfilePda,
          platformState: platformStatePda,
          author: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return paperId.toNumber();
    } finally {
      setLoading(false);
    }
  }

  return { publish, loading };
}

"use client";

import { useState } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useProgram, PROGRAM_ID } from "./useProgram";

interface AddReviewParams {
  paperId: number;
  paperPda: string;
  rating: number;
  commentCid: string;
}

export function useAddReview() {
  const { program, wallet } = useProgram();
  const [loading, setLoading] = useState(false);

  async function addReview(params: AddReviewParams): Promise<void> {
    if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    try {
      const paperPublicKey = new PublicKey(params.paperPda);

      const [platformStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform")],
        PROGRAM_ID
      );

      const [reviewPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("review"),
          paperPublicKey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      const [reviewerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      await (program.methods as unknown as {
        addReview: (rating: number, commentCid: string) => {
          accounts: (accounts: Record<string, PublicKey>) => {
            rpc: () => Promise<string>;
          };
        };
      })
        .addReview(params.rating, params.commentCid)
        .accounts({
          review: reviewPda,
          reviewerProfile: reviewerProfilePda,
          paper: paperPublicKey,
          platformState: platformStatePda,
          reviewer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } finally {
      setLoading(false);
    }
  }

  return { addReview, loading };
}

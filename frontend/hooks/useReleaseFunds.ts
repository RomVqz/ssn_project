"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import SSN_IDL from "@/lib/idl/ssn.json";

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SSN_PROGRAM_ID ?? "SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

export function useReleaseFunds() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  async function releaseFunds({
    paperId,
    paperPda,
  }: {
    paperId: number;
    paperPda: string;
  }) {
    if (!wallet.publicKey || !wallet.signTransaction)
      throw new Error("Wallet not connected");
    setLoading(true);

    try {
      const provider = new AnchorProvider(
        connection,
        wallet as Parameters<typeof AnchorProvider>[1],
        { commitment: "confirmed" }
      );
      const program = new Program(SSN_IDL as Idl, PROGRAM_ID, provider);

      const paperIdBuf = new BN(paperId).toArrayLike(Buffer, "le", 8);
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), paperIdBuf],
        PROGRAM_ID
      );

      await (
        program.methods as Record<
          string,
          () => {
            accounts: (a: Record<string, PublicKey>) => { rpc: () => Promise<string> };
          }
        >
      )
        .releaseFunds()
        .accounts({
          paper: new PublicKey(paperPda),
          escrow: escrowPda,
          author: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } finally {
      setLoading(false);
    }
  }

  return { releaseFunds, loading };
}

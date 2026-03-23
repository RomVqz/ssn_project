"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import SSN_IDL from "@/lib/idl/ssn.json";

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SSN_PROGRAM_ID ?? "SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

interface ContributeParams {
  paperId: number;
  paperPda: string;
  amountSol: number;
}

export function useContribute() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  async function contribute({ paperId, paperPda, amountSol }: ContributeParams) {
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

      // Derive escrow PDA
      const paperIdBuf = new BN(paperId).toArrayLike(Buffer, "le", 8);
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), paperIdBuf],
        PROGRAM_ID
      );

      const amountLamports = new BN(Math.round(amountSol * 1e9));

      await (
        program.methods as Record<
          string,
          (...args: unknown[]) => {
            accounts: (a: Record<string, PublicKey>) => { rpc: () => Promise<string> };
          }
        >
      )
        .contribute(amountLamports)
        .accounts({
          paper: new PublicKey(paperPda),
          escrow: escrowPda,
          contributor: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } finally {
      setLoading(false);
    }
  }

  return { contribute, loading };
}

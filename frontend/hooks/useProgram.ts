"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import SSN_IDL from "@/lib/idl/ssn.json";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions)
      return null;

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: "confirmed" }
    );

    return new Program(SSN_IDL as Idl, PROGRAM_ID, provider);
  }, [connection, wallet]);

  return { program, wallet, connection };
}

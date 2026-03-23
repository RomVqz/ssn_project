import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";
import { BorshCoder, EventParser, Idl } from "@coral-xyz/anchor";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import SSN_IDL from "../idl/ssn.json";

// ─────────────────────────────────────────────────────────────────────────────
// Solana Event Indexer
//
// Strategy: poll getSignaturesForAddress every POLL_INTERVAL_MS,
// parse Anchor events from transaction logs, upsert into PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(
  process.env.SSN_PROGRAM_ID ?? "SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);
const POLL_INTERVAL = Number(process.env.INDEXER_POLL_INTERVAL_MS ?? 5000);

let connection: Connection;
let eventParser: EventParser;
let isRunning = false;

// ── Init ──────────────────────────────────────────────────────────────────────
function initConnection() {
  connection = new Connection(
    process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    { commitment: "confirmed" }
  );
  eventParser = new EventParser(PROGRAM_ID, new BorshCoder(SSN_IDL as Idl));
}

// ── Entry point ───────────────────────────────────────────────────────────────
export async function startIndexer() {
  initConnection();
  logger.info("🔍 SSN Indexer started");
  isRunning = true;
  await poll();
}

export function stopIndexer() {
  isRunning = false;
}

// ── Polling loop ──────────────────────────────────────────────────────────────
async function poll() {
  while (isRunning) {
    try {
      await indexNewTransactions();
    } catch (err) {
      logger.error("Indexer poll error:", err);
    }
    await sleep(POLL_INTERVAL);
  }
}

// ── Core indexing logic ───────────────────────────────────────────────────────
async function indexNewTransactions() {
  // Get (or create) the checkpoint
  const checkpoint = await prisma.indexerCheckpoint.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  // Fetch signatures newer than our last checkpoint
  const sigInfos: ConfirmedSignatureInfo[] =
    await connection.getSignaturesForAddress(PROGRAM_ID, {
      until: checkpoint.lastSignature ?? undefined,
      limit: 50,
    });

  if (sigInfos.length === 0) return;

  // Process oldest → newest
  const ordered = sigInfos.reverse();
  logger.info(`📦 Processing ${ordered.length} new transaction(s)`);

  for (const sigInfo of ordered) {
    try {
      await processTransaction(sigInfo);
    } catch (err) {
      logger.warn(`Failed to process tx ${sigInfo.signature}:`, err);
    }
  }

  // Update checkpoint to latest signature
  const latest = ordered[ordered.length - 1];
  await prisma.indexerCheckpoint.update({
    where: { id: 1 },
    data: {
      lastSignature: latest.signature,
      lastSlot: BigInt(latest.slot),
    },
  });
}

// ── Process a single transaction ──────────────────────────────────────────────
async function processTransaction(sigInfo: ConfirmedSignatureInfo) {
  const tx: ParsedTransactionWithMeta | null =
    await connection.getParsedTransaction(sigInfo.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

  if (!tx?.meta?.logMessages) return;

  // Parse Anchor events from logs
  const events = [...eventParser.parseLogs(tx.meta.logMessages)];

  for (const event of events) {
    logger.debug(`Event: ${event.name}`, event.data);
    await handleEvent(event.name, event.data, sigInfo.signature, tx);
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────
async function handleEvent(
  name: string,
  data: Record<string, unknown>,
  signature: string,
  _tx: ParsedTransactionWithMeta
) {
  switch (name) {
    case "PaperPublished":
      await handlePaperPublished(data, signature);
      break;
    case "ReviewAdded":
      await handleReviewAdded(data, signature);
      break;
    case "FundingContributed":
      await handleFundingContributed(data, signature);
      break;
    case "FundsReleased":
      await handleFundsReleased(data, signature);
      break;
    default:
      logger.debug(`Unknown event: ${name}`);
  }
}

// ── PaperPublished ────────────────────────────────────────────────────────────
async function handlePaperPublished(
  data: Record<string, unknown>,
  signature: string
) {
  const paperId = BigInt(String(data.paperId));
  const authorWallet = String(data.author);

  // Fetch full Paper account from chain
  const [paperPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("paper"), bigintToLeBytes(paperId)],
    PROGRAM_ID
  );

  const paperAccount = await fetchPaperAccount(paperPda);
  if (!paperAccount) return;

  // Ensure author profile exists
  await upsertProfile(authorWallet);

  await prisma.paper.upsert({
    where: { onChainId: paperId },
    update: {
      reviewCount: paperAccount.reviewCount,
      avgRating: paperAccount.avgRating,
      fundingRaised: BigInt(paperAccount.fundingRaised),
    },
    create: {
      onChainId: paperId,
      pda: paperPda.toBase58(),
      authorWallet,
      title: paperAccount.title,
      authors: paperAccount.authors,
      abstractCid: paperAccount.abstractCid,
      pdfCid: paperAccount.pdfCid,
      field: paperAccount.field,
      publishedAt: new Date(Number(paperAccount.publishedAt) * 1000),
      reviewCount: paperAccount.reviewCount,
      avgRating: paperAccount.avgRating,
      fundingGoal: BigInt(paperAccount.fundingGoal),
      fundingRaised: BigInt(paperAccount.fundingRaised),
      txSignature: signature,
    },
  });

  // Update author profile
  await prisma.userProfile.updateMany({
    where: { wallet: authorWallet },
    data: {
      papersPublished: { increment: 1 },
      reputation: { increment: 50 },
    },
  });

  logger.info(`✅ Indexed paper #${paperId}: "${paperAccount.title}"`);
}

// ── ReviewAdded ───────────────────────────────────────────────────────────────
async function handleReviewAdded(
  data: Record<string, unknown>,
  signature: string
) {
  const paperId = BigInt(String(data.paperId));
  const reviewerWallet = String(data.reviewer);
  const rating = Number(data.rating);

  const [paperPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("paper"), bigintToLeBytes(paperId)],
    PROGRAM_ID
  );

  const [reviewerPubkey] = [new PublicKey(reviewerWallet)];
  const [reviewPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("review"), paperPda.toBuffer(), reviewerPubkey.toBuffer()],
    PROGRAM_ID
  );

  const reviewAccount = await fetchReviewAccount(reviewPda);
  if (!reviewAccount) return;

  await upsertProfile(reviewerWallet);

  await prisma.review.upsert({
    where: { pda: reviewPda.toBase58() },
    update: {},
    create: {
      pda: reviewPda.toBase58(),
      paperId,
      reviewerWallet,
      rating,
      commentCid: reviewAccount.commentCid,
      submittedAt: new Date(Number(reviewAccount.submittedAt) * 1000),
      txSignature: signature,
    },
  });

  // Update paper average (re-fetch)
  const paperAccount = await fetchPaperAccount(paperPda);
  if (paperAccount) {
    await prisma.paper.updateMany({
      where: { onChainId: paperId },
      data: {
        reviewCount: paperAccount.reviewCount,
        avgRating: paperAccount.avgRating,
      },
    });
  }

  // Update reviewer reputation
  await prisma.userProfile.updateMany({
    where: { wallet: reviewerWallet },
    data: {
      reviewsSubmitted: { increment: 1 },
      reputation: { increment: 10 },
    },
  });

  logger.info(`✅ Indexed review on paper #${paperId} — rating: ${rating}★`);
}

// ── FundingContributed ────────────────────────────────────────────────────────
async function handleFundingContributed(
  data: Record<string, unknown>,
  signature: string
) {
  const paperId = BigInt(String(data.paperId));
  const contributorWallet = String(data.contributor);
  const amount = BigInt(String(data.amount));
  const totalRaised = BigInt(String(data.totalRaised));
  const timestamp = new Date(Number(data.timestamp) * 1000);

  await prisma.contribution.upsert({
    where: { txSignature: signature },
    update: {},
    create: {
      paperId,
      contributorWallet,
      amount,
      txSignature: signature,
      timestamp,
    },
  });

  await prisma.paper.updateMany({
    where: { onChainId: paperId },
    data: { fundingRaised: totalRaised },
  });

  logger.info(`✅ Indexed contribution of ${Number(amount) / 1e9} SOL to paper #${paperId}`);
}

// ── FundsReleased ─────────────────────────────────────────────────────────────
async function handleFundsReleased(
  data: Record<string, unknown>,
  _signature: string
) {
  const paperId = BigInt(String(data.paperId));
  // Reset funding_raised to 0 after release
  await prisma.paper.updateMany({
    where: { onChainId: paperId },
    data: { fundingRaised: 0n },
  });
  logger.info(`✅ Funds released for paper #${paperId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: fetch on-chain account data
// ─────────────────────────────────────────────────────────────────────────────

interface PaperAccountData {
  title: string;
  authors: string[];
  abstractCid: string;
  pdfCid: string;
  field: string;
  publishedAt: bigint;
  reviewCount: number;
  avgRating: number;
  fundingGoal: bigint;
  fundingRaised: bigint;
}

interface ReviewAccountData {
  commentCid: string;
  submittedAt: bigint;
}

async function fetchPaperAccount(pda: PublicKey): Promise<PaperAccountData | null> {
  try {
    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo) return null;
    // Anchor discriminator is 8 bytes; then deserialise using BorshCoder
    const coder = new BorshCoder(SSN_IDL as Idl);
    return coder.accounts.decode("Paper", accountInfo.data);
  } catch {
    return null;
  }
}

async function fetchReviewAccount(pda: PublicKey): Promise<ReviewAccountData | null> {
  try {
    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo) return null;
    const coder = new BorshCoder(SSN_IDL as Idl);
    return coder.accounts.decode("Review", accountInfo.data);
  } catch {
    return null;
  }
}

async function upsertProfile(wallet: string) {
  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), new PublicKey(wallet).toBuffer()],
    PROGRAM_ID
  );
  await prisma.userProfile.upsert({
    where: { wallet },
    update: {},
    create: {
      wallet,
      pda: profilePda.toBase58(),
      reputation: 0n,
      papersPublished: 0,
      reviewsSubmitted: 0,
    },
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────
function bigintToLeBytes(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SSN database with demo data...");

  // ── Demo profiles ──────────────────────────────────────────────────────────
  const alice = await prisma.userProfile.upsert({
    where: { wallet: "ALiCExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    update: {},
    create: {
      wallet: "ALiCExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      pda: "ALiCEPDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      reputation: 110n,
      papersPublished: 2,
      reviewsSubmitted: 1,
    },
  });

  const bob = await prisma.userProfile.upsert({
    where: { wallet: "B0Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    update: {},
    create: {
      wallet: "B0Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      pda: "B0BPDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      reputation: 30n,
      papersPublished: 0,
      reviewsSubmitted: 3,
    },
  });

  console.log("  ✔ Profiles created:", alice.wallet, bob.wallet);

  // ── Demo papers ────────────────────────────────────────────────────────────
  const paper1 = await prisma.paper.upsert({
    where: { onChainId: 0n },
    update: {},
    create: {
      onChainId: 0n,
      pda: "PAPER0PDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authorWallet: alice.wallet,
      title: "Quantum Entanglement in Biological Systems",
      authors: ["Alice Researcher", "Bob Scientist"],
      abstractCid: "QmAbstractCID123456789",
      pdfCid: "QmPdfCID987654321",
      field: "Physics",
      publishedAt: new Date("2024-10-15"),
      reviewCount: 2,
      avgRating: 4.5,
      fundingGoal: 500000000n, // 0.5 SOL
      fundingRaised: 200000000n,
      txSignature: "demo_sig_paper_0",
    },
  });

  const paper2 = await prisma.paper.upsert({
    where: { onChainId: 1n },
    update: {},
    create: {
      onChainId: 1n,
      pda: "PAPER1PDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authorWallet: alice.wallet,
      title: "CRISPR Applications in Sustainable Agriculture",
      authors: ["Alice Researcher", "Carol Bio"],
      abstractCid: "QmAbstractCID2",
      pdfCid: "QmPdfCID2",
      field: "Biology",
      publishedAt: new Date("2024-11-02"),
      reviewCount: 1,
      avgRating: 5,
      fundingGoal: 1000000000n,
      fundingRaised: 750000000n,
      txSignature: "demo_sig_paper_1",
    },
  });

  console.log("  ✔ Papers created:", paper1.title, "|", paper2.title);

  // ── Demo reviews ───────────────────────────────────────────────────────────
  await prisma.review.upsert({
    where: { pda: "REVIEW0PDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    update: {},
    create: {
      pda: "REVIEW0PDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paperId: 0n,
      reviewerWallet: bob.wallet,
      rating: 5,
      commentCid: "QmReviewComment1",
      submittedAt: new Date("2024-10-20"),
      txSignature: "demo_sig_review_0",
    },
  });

  await prisma.review.upsert({
    where: { pda: "REVIEW1PDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    update: {},
    create: {
      pda: "REVIEW1PDAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paperId: 1n,
      reviewerWallet: bob.wallet,
      rating: 5,
      commentCid: "QmReviewComment2",
      submittedAt: new Date("2024-11-10"),
      txSignature: "demo_sig_review_1",
    },
  });

  console.log("  ✔ Reviews seeded");

  // ── Indexer checkpoint ─────────────────────────────────────────────────────
  await prisma.indexerCheckpoint.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastSignature: null, lastSlot: null },
  });

  console.log("  ✔ Indexer checkpoint initialized");
  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

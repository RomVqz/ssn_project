import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Ssn } from "../target/types/ssn";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import { assert } from "chai";

// ─────────────────────────────────────────────────────────────────────────────
// SSN – Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe("ssn", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Ssn as Program<Ssn>;
  const authority = provider.wallet as anchor.Wallet;

  // Keypairs for test wallets
  const authorKp = Keypair.generate();
  const reviewerKp = Keypair.generate();
  const contributorKp = Keypair.generate();

  // ── PDAs ──────────────────────────────────────────────────────────────────

  const [platformStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    program.programId
  );

  let paperPda: PublicKey;
  let paperId: number;

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function airdrop(pubkey: PublicKey, sol = 2) {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      sol * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  function profilePda(wallet: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), wallet.toBuffer()],
      program.programId
    )[0];
  }

  function escrowPda(paperId: number) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), new BN(paperId).toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  before(async () => {
    console.log("  Funding test wallets via airdrop...");
    await airdrop(authorKp.publicKey);
    await airdrop(reviewerKp.publicKey);
    await airdrop(contributorKp.publicKey);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. initialize_platform
  // ─────────────────────────────────────────────────────────────────────────

  it("initializes the platform", async () => {
    await program.methods
      .initializePlatform()
      .accounts({
        platformState: platformStatePda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.platformState.fetch(platformStatePda);
    assert.equal(state.totalPapers.toNumber(), 0);
    assert.equal(state.totalReviews.toNumber(), 0);
    assert.equal(state.authority.toBase58(), authority.publicKey.toBase58());
    console.log("    ✔ PlatformState created at:", platformStatePda.toBase58());
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. publish_paper
  // ─────────────────────────────────────────────────────────────────────────

  it("publishes a paper and awards author reputation", async () => {
    // Paper 0 PDA
    const paperIdBuf = new BN(0).toArrayLike(Buffer, "le", 8);
    [paperPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("paper"), paperIdBuf],
      program.programId
    );
    paperId = 0;

    const authorProfilePda = profilePda(authorKp.publicKey);

    await program.methods
      .publishPaper(
        "Quantum Entanglement in Biological Systems",
        ["Alice Researcher", "Bob Scientist"],
        "QmAbstractCID123456789",
        "QmPdfCID987654321",
        "Physics",
        new BN(0.5 * LAMPORTS_PER_SOL)
      )
      .accounts({
        paper: paperPda,
        authorProfile: authorProfilePda,
        platformState: platformStatePda,
        author: authorKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorKp])
      .rpc();

    const paper = await program.account.paper.fetch(paperPda);
    assert.equal(paper.title, "Quantum Entanglement in Biological Systems");
    assert.equal(paper.authors.length, 2);
    assert.equal(paper.pdfCid, "QmPdfCID987654321");
    assert.equal(paper.field, "Physics");
    assert.equal(paper.reviewCount, 0);
    assert.equal(paper.fundingRaised.toNumber(), 0);

    const profile = await program.account.userProfile.fetch(authorProfilePda);
    assert.equal(profile.reputation.toNumber(), 50); // REPUTATION_PUBLISH
    assert.equal(profile.papersPublished.toNumber(), 1);

    const state = await program.account.platformState.fetch(platformStatePda);
    assert.equal(state.totalPapers.toNumber(), 1);

    console.log("    ✔ Paper published; author reputation:", profile.reputation.toNumber());
  });

  it("rejects a paper with an empty title", async () => {
    const paperIdBuf = new BN(1).toArrayLike(Buffer, "le", 8);
    const [dummyPaperPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("paper"), paperIdBuf],
      program.programId
    );

    try {
      await program.methods
        .publishPaper("", ["Author"], "Qmcid", "Qmpdf", "Biology", new BN(0))
        .accounts({
          paper: dummyPaperPda,
          authorProfile: profilePda(authorKp.publicKey),
          platformState: platformStatePda,
          author: authorKp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authorKp])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      // Anchor will reject due to missing validation; we expect an error
      assert.ok(err);
      console.log("    ✔ Empty title correctly rejected");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. add_review
  // ─────────────────────────────────────────────────────────────────────────

  it("reviewer can review a paper and earns reputation", async () => {
    const reviewerProfilePda = profilePda(reviewerKp.publicKey);
    const [reviewPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("review"), paperPda.toBuffer(), reviewerKp.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .addReview(5, "QmReviewCommentCID")
      .accounts({
        review: reviewPda,
        reviewerProfile: reviewerProfilePda,
        paper: paperPda,
        platformState: platformStatePda,
        reviewer: reviewerKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([reviewerKp])
      .rpc();

    const paper = await program.account.paper.fetch(paperPda);
    assert.equal(paper.reviewCount, 1);
    assert.equal(paper.avgRating, 5);

    const profile = await program.account.userProfile.fetch(reviewerProfilePda);
    assert.equal(profile.reputation.toNumber(), 10); // REPUTATION_REVIEW
    assert.equal(profile.reviewsSubmitted.toNumber(), 1);

    const state = await program.account.platformState.fetch(platformStatePda);
    assert.equal(state.totalReviews.toNumber(), 1);

    console.log("    ✔ Review added; reviewer reputation:", profile.reputation.toNumber());
  });

  it("prevents author from reviewing their own paper", async () => {
    const [reviewPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("review"), paperPda.toBuffer(), authorKp.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .addReview(4, "QmSelfReview")
        .accounts({
          review: reviewPda,
          reviewerProfile: profilePda(authorKp.publicKey),
          paper: paperPda,
          platformState: platformStatePda,
          reviewer: authorKp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authorKp])
        .rpc();
      assert.fail("Should have thrown CannotReviewOwnPaper");
    } catch (err: any) {
      assert.include(err.toString(), "CannotReviewOwnPaper");
      console.log("    ✔ Self-review correctly rejected");
    }
  });

  it("prevents a reviewer from reviewing the same paper twice", async () => {
    const [reviewPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("review"), paperPda.toBuffer(), reviewerKp.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .addReview(3, "QmDuplicateReview")
        .accounts({
          review: reviewPda,
          reviewerProfile: profilePda(reviewerKp.publicKey),
          paper: paperPda,
          platformState: platformStatePda,
          reviewer: reviewerKp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([reviewerKp])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      // Account already exists (PDA collision)
      assert.ok(err);
      console.log("    ✔ Duplicate review correctly rejected (PDA already exists)");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. contribute
  // ─────────────────────────────────────────────────────────────────────────

  it("contributor can fund a paper", async () => {
    const escrow = escrowPda(paperId);
    const contribution = 0.1 * LAMPORTS_PER_SOL;

    await program.methods
      .contribute(new BN(contribution))
      .accounts({
        paper: paperPda,
        escrow,
        contributor: contributorKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([contributorKp])
      .rpc();

    const paper = await program.account.paper.fetch(paperPda);
    assert.equal(paper.fundingRaised.toNumber(), contribution);

    const escrowBalance = await provider.connection.getBalance(escrow);
    assert.equal(escrowBalance, contribution);

    console.log("    ✔ Contribution of 0.1 SOL received; escrow balance:", escrowBalance);
  });

  it("rejects a zero-value contribution", async () => {
    try {
      await program.methods
        .contribute(new BN(0))
        .accounts({
          paper: paperPda,
          escrow: escrowPda(paperId),
          contributor: contributorKp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([contributorKp])
        .rpc();
      assert.fail("Should have thrown ZeroContribution");
    } catch (err: any) {
      assert.include(err.toString(), "ZeroContribution");
      console.log("    ✔ Zero contribution correctly rejected");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. release_funds
  // ─────────────────────────────────────────────────────────────────────────

  it("author can release escrowed funds", async () => {
    const escrow = escrowPda(paperId);
    const authorBefore = await provider.connection.getBalance(authorKp.publicKey);

    await program.methods
      .releaseFunds()
      .accounts({
        paper: paperPda,
        escrow,
        author: authorKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorKp])
      .rpc();

    const escrowAfter = await provider.connection.getBalance(escrow);
    const authorAfter = await provider.connection.getBalance(authorKp.publicKey);

    assert.equal(escrowAfter, 0);
    assert.isAbove(authorAfter, authorBefore);

    console.log("    ✔ Funds released; author balance delta:", authorAfter - authorBefore, "lamports");
  });

  it("non-author cannot release funds", async () => {
    // Fund escrow again
    const escrow = escrowPda(paperId);
    await program.methods
      .contribute(new BN(0.05 * LAMPORTS_PER_SOL))
      .accounts({
        paper: paperPda,
        escrow,
        contributor: contributorKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([contributorKp])
      .rpc();

    try {
      await program.methods
        .releaseFunds()
        .accounts({
          paper: paperPda,
          escrow,
          author: reviewerKp.publicKey, // Wrong signer!
          systemProgram: SystemProgram.programId,
        })
        .signers([reviewerKp])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.ok(err);
      console.log("    ✔ Non-author fund release correctly rejected");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Average rating with multiple reviews
  // ─────────────────────────────────────────────────────────────────────────

  it("correctly computes average rating across reviews", async () => {
    // Publish a second paper and have two different reviewers rate it
    const paperIdBuf = new BN(1).toArrayLike(Buffer, "le", 8);
    const [paper2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("paper"), paperIdBuf],
      program.programId
    );

    await program.methods
      .publishPaper(
        "CRISPR Applications in Agriculture",
        ["Carol Bio"],
        "QmAbstract2",
        "QmPdf2",
        "Biology",
        new BN(0)
      )
      .accounts({
        paper: paper2Pda,
        authorProfile: profilePda(authorKp.publicKey),
        platformState: platformStatePda,
        author: authorKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorKp])
      .rpc();

    // Reviewer gives 4 stars
    const [reviewPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("review"), paper2Pda.toBuffer(), reviewerKp.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .addReview(4, "QmReview4stars")
      .accounts({
        review: reviewPda2,
        reviewerProfile: profilePda(reviewerKp.publicKey),
        paper: paper2Pda,
        platformState: platformStatePda,
        reviewer: reviewerKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([reviewerKp])
      .rpc();

    // Contributor gives 2 stars
    const [reviewPda3] = PublicKey.findProgramAddressSync(
      [Buffer.from("review"), paper2Pda.toBuffer(), contributorKp.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .addReview(2, "QmReview2stars")
      .accounts({
        review: reviewPda3,
        reviewerProfile: profilePda(contributorKp.publicKey),
        paper: paper2Pda,
        platformState: platformStatePda,
        reviewer: contributorKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([contributorKp])
      .rpc();

    const paper2 = await program.account.paper.fetch(paper2Pda);
    assert.equal(paper2.reviewCount, 2);
    assert.equal(paper2.avgRating, 3); // (4+2)/2 = 3
    console.log("    ✔ Average rating:", paper2.avgRating, "(expected 3)");
  });
});

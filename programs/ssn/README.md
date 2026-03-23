# SSN – Solana Science Network
## Smart Contract (Anchor / Rust)

> Decentralized scientific publishing, peer review, and research funding on Solana.

---

## Architecture

```
programs/ssn/src/lib.rs   ← All on-chain logic
tests/ssn.ts              ← TypeScript integration tests
scripts/deploy.sh         ← One-command devnet deploy
Anchor.toml               ← Anchor config
```

---

## On-Chain Accounts

| Account | Seeds | Description |
|---------|-------|-------------|
| `PlatformState` | `["platform"]` | Global counters & authority |
| `Paper` | `["paper", paper_id_le8]` | Paper metadata + funding state |
| `Review` | `["review", paper_pubkey, reviewer_pubkey]` | One review per (paper, reviewer) |
| `UserProfile` | `["profile", wallet_pubkey]` | Reputation & activity counts |
| Escrow PDA | `["escrow", paper_id_le8]` | SOL held for a paper |

---

## Instructions

### `initialize_platform`
One-time setup. Creates the `PlatformState` PDA.

### `publish_paper(title, authors, abstract_cid, pdf_cid, field, funding_goal)`
- Uploads to IPFS beforehand; stores CIDs on-chain.
- Awards **+50 reputation** to the author.
- Emits `PaperPublished` event.

### `add_review(rating: u8, comment_cid: String)`
- `rating` must be 1–5.
- One review per (reviewer × paper) enforced by PDA seeds.
- Authors cannot review their own papers.
- Awards **+10 reputation** to the reviewer.
- Updates paper's running average rating.
- Emits `ReviewAdded` event.

### `contribute(amount: u64)`
- Transfers `amount` lamports to the paper's escrow PDA.
- Updates `paper.funding_raised`.
- Emits `FundingContributed` event.

### `release_funds`
- Only callable by the paper's original author.
- Transfers all escrow lamports to the author.
- Emits `FundsReleased` event.

### `initialize_profile`
- Creates a `UserProfile` PDA for a wallet (called once per user).
- `publish_paper` and `add_review` use `init_if_needed` so this is optional.

---

## Reputation System

| Action | Points |
|--------|--------|
| Publish a paper | +50 |
| Submit a review | +10 |

Points are stored in the `UserProfile` PDA as a `u64`. Future versions will add token-based rewards.

---

## Quick Start

### Prerequisites
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli

# Install Node dependencies
yarn install
```

### Deploy to Devnet
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Run Tests Only (after deploy)
```bash
anchor test --skip-build
```

---

## Events (for off-chain indexing)

```typescript
// PaperPublished
{
  paper_id: u64,
  author: Pubkey,
  title: String,
  pdf_cid: String,
  timestamp: i64,
}

// ReviewAdded
{
  paper_id: u64,
  reviewer: Pubkey,
  rating: u8,
  timestamp: i64,
}

// FundingContributed
{
  paper_id: u64,
  contributor: Pubkey,
  amount: u64,
  total_raised: u64,
  timestamp: i64,
}

// FundsReleased
{
  paper_id: u64,
  author: Pubkey,
  amount: u64,
}
```

---

## Security Notes (MVP Scope)
- ✅ PDA ownership enforced by Anchor constraints
- ✅ Self-review blocked
- ✅ Duplicate review blocked (PDA seed collision)
- ✅ Fund release restricted to original author
- ⚠️  No time-locks or milestone-based release (post-hackathon)
- ⚠️  No DAO governance (post-hackathon)

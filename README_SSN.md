# 🔬 SSN — Solana Science Network

> **Decentralized scientific publishing, peer review, and research funding on Solana.**  
> *Open Science Protocol — Hackathon MVP, 48 hours.*

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://explorer.solana.com/?cluster=devnet)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.0-blue)](https://www.anchor-lang.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## The Problem

Scientific publishing is broken:
- **Paywalls** lock research behind journal subscriptions
- **Gatekeepers** (editors, publishers) control what gets seen
- **Peer review** is unpaid, untracked, and unrewarded
- **Funding** is opaque and centralized

## The Solution

SSN puts science on-chain:

| Feature | How |
|---------|-----|
| **Publish** | PDF → IPFS + metadata registered on Solana |
| **Review** | Peer review with 1–5 rating, stored on IPFS, recorded on-chain |
| **Fund** | SOL contributions held in escrow PDA, released by author |
| **Reputation** | On-chain reputation earned by publishing (+50) and reviewing (+10) |

---

## Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Next.js 14      │───▶│  Node.js API     │───▶│  Solana Devnet   │
│  (Vercel)        │    │  (Render)        │    │  (Anchor/Rust)   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Phantom Wallet  │    │  PostgreSQL      │    │  IPFS (Pinata)   │
│  @solana/adapter │    │  (Prisma ORM)    │    │  PDF + Metadata  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### On-Chain Accounts (PDAs)

| Account | Seeds | Purpose |
|---------|-------|---------|
| `PlatformState` | `["platform"]` | Global counters |
| `Paper` | `["paper", id_le8]` | Paper metadata + funding |
| `Review` | `["review", paper, reviewer]` | One review per pair |
| `UserProfile` | `["profile", wallet]` | Reputation scores |
| Escrow | `["escrow", paper_id_le8]` | SOL custody |

---

## Monorepo Structure

```
ssn/
├── programs/ssn/          ← Rust/Anchor smart contract
│   └── src/lib.rs
├── tests/ssn.ts           ← TypeScript integration tests
├── backend/               ← Node.js API + Solana indexer
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/        ← papers, reviews, profiles, ipfs, stats
│   │   ├── services/      ← indexer.ts, ipfs.ts
│   │   └── utils/
│   └── prisma/schema.prisma
├── frontend/              ← Next.js 14 app
│   ├── app/               ← pages: /, /papers/[id], /publish, /profile/[wallet]
│   ├── components/        ← UI, paper, review, wallet, layout
│   └── hooks/             ← usePublishPaper, useAddReview, useContribute
├── scripts/
│   ├── deploy.sh          ← One-command devnet deploy
│   ├── setup.sh           ← Full local environment setup
│   └── demo.sh            ← Demo flow runner
└── docs/
    ├── DEMO_SCRIPT.md     ← 5-minute demo guide
    └── SLIDES_OUTLINE.md  ← Presentation outline
```

---

## Quick Start (Local Development)

### Prerequisites

```bash
# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Anchor CLI
npm install -g @coral-xyz/anchor-cli

# Node.js 20+
node --version  # should be >= 20.0.0
```

### One-Command Setup

```bash
git clone https://github.com/your-org/ssn.git
cd ssn
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
1. Configure Solana CLI for devnet
2. Airdrop SOL to your wallet
3. Build and deploy the Anchor program
4. Set up and seed the PostgreSQL database
5. Install all Node.js dependencies
6. Start both backend and frontend in dev mode

### Manual Setup

```bash
# 1. Smart Contract
cd ssn  # repo root
anchor build
anchor deploy  # on devnet

# 2. Backend
cd backend
cp .env.example .env   # fill in values
docker-compose up postgres -d
npm install
npm run db:push
npm run db:seed
npm run dev            # http://localhost:3001

# 3. Frontend
cd ../frontend
cp .env.example .env.local  # fill in values
npm install
npm run dev            # http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SOLANA_RPC_URL` | Solana RPC endpoint (devnet) |
| `SSN_PROGRAM_ID` | Deployed program address |
| `PINATA_JWT` | Pinata API JWT for IPFS pinning |
| `INDEXER_POLL_INTERVAL_MS` | Indexer polling rate (default: 5000) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC for wallet adapter |
| `NEXT_PUBLIC_SSN_PROGRAM_ID` | Program ID (same as backend) |
| `NEXT_PUBLIC_PINATA_JWT` | Pinata JWT for browser PDF upload |

---

## Deploy to Production

### Smart Contract (already on devnet)
```bash
./scripts/deploy.sh
# → outputs PROGRAM_ID — copy to .env files
```

### Backend → Render
```bash
# render.com → New Web Service → connect GitHub repo
# Root directory: backend
# Build:  npm install && npx prisma generate && npm run build
# Start:  npx prisma migrate deploy && node dist/index.js
# Add env vars from backend/.env.example
```

### Frontend → Vercel
```bash
npx vercel --cwd frontend
# Add env vars in Vercel dashboard
# NEXT_PUBLIC_API_URL = https://your-render-service.onrender.com/api
```

---

## API Reference (Quick)

```
GET  /api/papers              List papers (search, filter, sort, paginate)
GET  /api/papers/:id          Paper detail with reviews + contributions
GET  /api/papers/fields       Available research fields
GET  /api/profiles/:wallet    Researcher profile + reputation + history
GET  /api/profiles/leaderboard/top   Top 20 by reputation
GET  /api/stats               Platform-wide metrics
POST /api/ipfs/paper-metadata Pin metadata JSON → returns IPFS CID
POST /api/ipfs/review-comment Pin review comment → returns IPFS CID
GET  /health                  Health check
```

---

## Smart Contract Instructions

```rust
initialize_platform()                          // one-time setup
publish_paper(title, authors, abstract_cid,    // +50 REP to author
              pdf_cid, field, funding_goal)
add_review(rating: u8, comment_cid: String)    // +10 REP to reviewer
contribute(amount: u64)                        // SOL → escrow PDA
release_funds()                                // escrow → author
initialize_profile()                           // create user profile
```

---

## Security

- ✅ PDA ownership enforced by Anchor constraints
- ✅ Authors cannot review their own papers
- ✅ One review per (reviewer × paper) — enforced by PDA seeds
- ✅ Only author can release escrow funds
- ✅ Input validation on all on-chain string lengths
- ✅ Rate limiting on API (100 req/min)
- ✅ CORS, Helmet, express-validator on backend
- ⚠️ No DAO governance yet (post-hackathon roadmap)
- ⚠️ No milestone-based fund release yet

---

## Roadmap (Post-Hackathon)

- [ ] DAO governance for platform parameters
- [ ] OSP token with staking for reputation weight
- [ ] Milestone-based escrow with committee approval
- [ ] Experimental replication tracking
- [ ] Review utility voting (upvote valuable reviews)
- [ ] Multi-sig paper authorship
- [ ] Mainnet deploy

---

## Team

Built in 48 hours at [Hackathon Name] — [Date]

| Role | Responsibility |
|------|---------------|
| Smart Contract | Rust/Anchor program, tests, deploy |
| Backend | Node.js API, Solana indexer, PostgreSQL |
| Frontend | Next.js UI, wallet integration, UX |
| Design/QA | Figma wireframes, testing, demo |

---

## License

MIT — see [LICENSE](LICENSE)

# SSN Backend – API & Solana Indexer

> Node.js + Express + Prisma + PostgreSQL

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express 4 |
| ORM | Prisma 5 (PostgreSQL) |
| Indexer | @solana/web3.js polling + Anchor EventParser |
| IPFS | Pinata API |
| Deploy | Docker + Render |

## Estructura

```
backend/
├── src/
│   ├── index.ts              ← Entry point
│   ├── routes/
│   │   ├── papers.ts         ← GET /papers, GET /papers/:id
│   │   ├── reviews.ts        ← GET /reviews
│   │   ├── profiles.ts       ← GET /profiles/:wallet, leaderboard
│   │   ├── ipfs.ts           ← POST /ipfs/paper-metadata
│   │   └── stats.ts          ← GET /stats
│   ├── services/
│   │   ├── indexer.ts        ← Solana event indexer
│   │   └── ipfs.ts           ← Pinata helpers
│   ├── middleware/errorHandler.ts
│   ├── utils/logger.ts + prisma.ts
│   └── idl/ssn.json          ← Anchor IDL
├── prisma/schema.prisma
├── docker-compose.yml
└── .env.example
```

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env

# 3. PostgreSQL con Docker
docker-compose up postgres -d

# 4. Crear schema
npm run db:push

# 5. Seed demo data
npm run db:seed

# 6. Arrancar
npm run dev
```

## API Reference

### Papers
- GET /api/papers            — Lista (paginado, filtros, búsqueda)
- GET /api/papers/fields     — Campos disponibles para filtro
- GET /api/papers/:id        — Detalle con reviews y contribuciones
- GET /api/papers/:id/reviews
- GET /api/papers/:id/contributions

Query params: ?page=1&limit=12&field=Physics&sort=newest|rating|funding&search=quantum

### Profiles
- GET /api/profiles/:wallet         — Perfil + reputación + actividad
- GET /api/profiles/leaderboard/top — Top 20 por reputación

### Reviews
- GET /api/reviews/:pda
- GET /api/reviews/by-reviewer/:wallet

### IPFS
- POST /api/ipfs/paper-metadata  — Pinea metadata JSON → retorna CID
- POST /api/ipfs/review-comment  — Pinea comentario → retorna CID
- GET  /api/ipfs/:cid            — Fetch de contenido

### Stats
- GET /api/stats          — Métricas globales
- GET /api/stats/indexer  — Estado del indexer

## Indexer de Solana

Hace polling a getSignaturesForAddress cada 5s (INDEXER_POLL_INTERVAL_MS).
Parsea eventos Anchor: PaperPublished, ReviewAdded, FundingContributed, FundsReleased.
Guarda checkpoint en PostgreSQL para reanudar sin reprocesar.

NOTA: Reemplaza src/idl/ssn.json con el IDL de target/idl/ssn.json tras anchor build.

## Deploy en Render

Build command:   npm install && npx prisma generate && npm run build
Start command:   npx prisma migrate deploy && node dist/index.js

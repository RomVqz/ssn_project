# SSN Frontend – Next.js App

> React + Next.js 14 + Tailwind CSS + Solana Wallet Adapter  
> Estética: Scientific Dark Lab — serif editorial + amber/teal accents

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Estilos | Tailwind CSS + CSS Variables |
| Fuentes | Playfair Display · DM Sans · JetBrains Mono |
| Wallet | @solana/wallet-adapter-react + Phantom |
| Data fetching | SWR (stale-while-revalidate) |
| On-chain TX | @coral-xyz/anchor |
| IPFS | Pinata (upload directo desde browser) |
| Notificaciones | react-hot-toast |

---

## Estructura

```
frontend/
├── app/
│   ├── layout.tsx                  ← Root layout + Wallet Provider + Navbar
│   ├── page.tsx                    ← Home: hero + feed de papers
│   ├── publish/page.tsx            ← Publicar paper (3 pasos)
│   ├── leaderboard/page.tsx        ← Top 20 investigadores
│   ├── papers/[id]/page.tsx        ← Detalle de paper + reviews + funding
│   └── profile/[wallet]/page.tsx   ← Perfil de investigador
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              ← Barra de navegación + reputación
│   │   └── StatsBar.tsx            ← Métricas globales en tiempo real
│   ├── paper/
│   │   ├── PaperFeed.tsx           ← Grid paginado de papers
│   │   ├── PaperCard.tsx           ← Tarjeta individual con rating + funding
│   │   └── SearchFilters.tsx       ← Búsqueda, campo, ordenamiento + ContributeForm + FundingProgress
│   ├── review/
│   │   └── ReviewForm.tsx          ← Formulario + ReviewCard
│   ├── ui/
│   │   └── StarRating.tsx          ← Stars interactivas/readonly + AddressChip + Skeletons
│   └── wallet/
│       └── WalletProvider.tsx      ← ConnectionProvider + WalletProvider
├── hooks/
│   ├── usePublishPaper.ts          ← TX: publish_paper
│   ├── useAddReview.ts             ← TX: add_review
│   ├── useContribute.ts            ← TX: contribute
│   ├── useReleaseFunds.ts          ← TX: release_funds
│   └── useProgram.ts               ← Anchor program instance
├── lib/
│   ├── api.ts                      ← API_URL + SWR fetcher
│   ├── utils.ts                    ← formatDate, shortenAddress, solFromLamports
│   └── idl/ssn.json               ← Anchor IDL (sync con programs/)
└── styles/globals.css              ← Design system completo
```

---

## Páginas

### `/` — Home
- Hero con headline + CTA buttons
- Barra de stats de la plataforma (papers, reviews, SOL funded)
- Feed filtrable: búsqueda por texto, campo científico, ordenamiento

### `/papers/:id` — Detalle de paper
- Título, autores, campo, fecha, rating promedio
- Links a PDF e metadata en IPFS + CIDs en texto
- Reviews con AddressChip del reviewer
- Formulario de review (solo wallets conectados)
- Sidebar: barra de funding, formulario de contribución, info on-chain

### `/publish` — Publicar
- Paso 1: Metadatos (título, autores, abstract, campo, meta de funding)
- Paso 2: Upload PDF → Pinata → obtiene CID  
- Paso 3: Firma la TX de Solana → paper registrado on-chain
- Indicador de progreso visual en 4 pasos

### `/profile/:wallet` — Perfil
- Avatar generado del address, reputación total
- Stats: papers publicados, reviews enviados
- Grid de papers propios con funding progress
- Lista de reviews dadas con link al paper

### `/leaderboard` — Ranking
- Top 20 investigadores por reputación
- Medallas 🥇🥈🥉 para los 3 primeros
- Detalle de papers + reviews por researcher

---

## Setup local

```bash
cd frontend

# Instalar dependencias
npm install

# Variables de entorno
cp .env.example .env.local
# Edita: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SSN_PROGRAM_ID, NEXT_PUBLIC_PINATA_JWT

# Iniciar dev server
npm run dev
# → http://localhost:3000
```

---

## Deploy en Vercel

```bash
# 1. Instala Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Agrega las variables de entorno en vercel.com → Settings → Environment Variables
```

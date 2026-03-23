#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SSN – Post-setup para el template de WayLearnLatam
# Ejecutar UNA VEZ después de que el setup.sh del template termine.
#
# Uso:
#   bash ssn-start.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# El setup.sh de WayLearnLatam requiere este export al terminar
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

BOLD="\033[1m"; GREEN="\033[0;32m"; AMBER="\033[0;33m"; RESET="\033[0m"
ok()   { echo -e "${GREEN}✔ $*${RESET}"; }
info() { echo -e "${BOLD}→ $*${RESET}"; }
warn() { echo -e "${AMBER}⚠ $*${RESET}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   SSN — Inicialización en Codespace          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Verificar entorno ──────────────────────────────────────────────────────
info "Verificando herramientas..."
command -v solana &>/dev/null || { warn "Solana CLI no encontrado. ¿Terminó el setup.sh?"; exit 1; }
command -v anchor &>/dev/null || { warn "Anchor CLI no encontrado. ¿Terminó el setup.sh?"; exit 1; }
ok "Solana $(solana --version 2>/dev/null | head -1)"
ok "Anchor  $(anchor --version 2>/dev/null | head -1)"
ok "Node    $(node --version)"

# ── 2. Asegurar que apunta a devnet ──────────────────────────────────────────
info "Configurando devnet..."
solana config set --url devnet -q
ok "RPC: $(solana config get | grep 'RPC URL' | awk '{print $3}')"
ok "Wallet: $(solana address)"

# Solicitar airdrop si balance < 1 SOL
BALANCE=$(solana balance 2>/dev/null | grep -oP '[0-9]+(\.[0-9]+)?' | head -1 || echo "0")
if (( $(echo "$BALANCE < 1" | bc -l 2>/dev/null || echo 1) )); then
  info "Solicitando airdrop de SOL..."
  solana airdrop 2 -q 2>/dev/null && ok "Airdrop recibido: $(solana balance)" || warn "Airdrop falló — intenta: solana airdrop 2"
fi

# ── 3. Build del programa Anchor ─────────────────────────────────────────────
info "Construyendo programa Anchor (puede tardar 1-2 min)..."
anchor build -q
ok "Build exitoso"

# ── 4. Patch del Program ID ───────────────────────────────────────────────────
PROG_ID=$(solana address -k target/deploy/ssn-keypair.json)
info "Program ID: $PROG_ID"

if grep -q "SSNprogXXX" programs/ssn/src/lib.rs 2>/dev/null; then
  info "Actualizando Program ID en lib.rs y Anchor.toml..."
  sed -i "s/SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROG_ID/" programs/ssn/src/lib.rs
  sed -i "s/SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROG_ID/" Anchor.toml
  anchor build -q
  ok "Program ID actualizado y rebuild listo"
fi

# ── 5. Deploy en devnet ───────────────────────────────────────────────────────
info "Desplegando en devnet..."
anchor deploy -q && ok "Programa desplegado ✅" || { warn "Deploy falló — intenta: anchor deploy"; }

echo ""
ok "Explorer: https://explorer.solana.com/address/$PROG_ID?cluster=devnet"

# ── 6. Setup Backend ──────────────────────────────────────────────────────────
if [ -f backend/package.json ]; then
  info "Instalando dependencias del backend..."
  (cd backend && npm install -q)
  ok "Backend deps instaladas"

  # Crear .env si no existe
  if [ ! -f backend/.env ] && [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
    sed -i "s/SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROG_ID/" backend/.env
    warn "Creado backend/.env — agrega PINATA_JWT para IPFS"
  fi

  # Levantar PostgreSQL con Docker si está disponible
  if command -v docker &>/dev/null && [ -f backend/docker-compose.yml ]; then
    info "Iniciando PostgreSQL..."
    (cd backend && docker-compose up postgres -d --wait -q 2>/dev/null) \
      && ok "PostgreSQL corriendo" \
      || warn "Docker no disponible — configura DATABASE_URL manualmente en backend/.env"
  fi

  # Aplicar schema y seed
  info "Aplicando schema de base de datos..."
  (cd backend && npx prisma db push --skip-generate -q 2>/dev/null) \
    && ok "Schema aplicado" \
    || warn "DB push falló — ¿está PostgreSQL corriendo?"

  (cd backend && npx ts-node prisma/seed.ts 2>/dev/null) \
    && ok "Datos de demo cargados" \
    || warn "Seed falló (no crítico)"
fi

# ── 7. Setup Frontend ─────────────────────────────────────────────────────────
if [ -f frontend/package.json ]; then
  info "Instalando dependencias del frontend..."
  (cd frontend && npm install -q)
  ok "Frontend deps instaladas"

  if [ ! -f frontend/.env.local ] && [ -f frontend/.env.example ]; then
    cp frontend/.env.example frontend/.env.local
    sed -i "s/SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/$PROG_ID/" frontend/.env.local
    warn "Creado frontend/.env.local — agrega NEXT_PUBLIC_PINATA_JWT"
  fi
fi

# ── 8. Resumen final ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║           ✅ Listo para desarrollar          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Program ID:${RESET} $PROG_ID"
echo ""
echo -e "  Abre terminales separadas y ejecuta:"
echo ""
echo -e "  ${BOLD}Terminal 1 – Backend:${RESET}"
echo -e "    cd backend && npm run dev"
echo ""
echo -e "  ${BOLD}Terminal 2 – Frontend:${RESET}"
echo -e "    cd frontend && npm run dev"
echo ""
warn "Recuerda agregar PINATA_JWT al backend/.env antes de publicar papers reales"

#!/usr/bin/env sh
# ── Zalo CRM — Production Deploy Script ────────────────────────────────────────
# VPS Requirements: Ubuntu 20.04+, Docker 24+, Docker Compose v2
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# What it does:
#   1. Check prerequisites (docker, .env)
#   2. Pull latest code from git (optional)
#   3. Build & start production containers
#   4. Run Prisma migrations + seed
#   5. Verify health

set -e

APP_NAME="zalo-crm"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { printf "${GREEN}[INFO]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
err()  { printf "${RED}[ERROR]${NC} %s\n" "$1" >&2; }

# ── Step 0: Check if running as root ──────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  warn "Not running as root — some commands may fail."
fi

# ── Step 1: Prerequisites ───────────────────────────────────────────────────────
log "Checking prerequisites..."

if ! command -v docker >/dev/null 2>&1; then
  err "Docker is not installed. Install: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  err "Docker Compose v2 is not installed."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  err ".env file not found!"
  warn "Copy .env.prod.example to .env and fill in your values:"
  warn "  cp .env.prod.example .env"
  warn "  nano .env"
  exit 1
fi

# ── Step 2: Pull latest code from git ──────────────────────────────────────────
if [ -d ".git" ] && command -v git >/dev/null 2>&1; then
  warn "Pulling latest code from git..."
  git pull origin "$(git branch --show-current)"
  log "Code updated."
else
  warn "No .git found — skipping git pull. Make sure you uploaded the latest code manually."
fi

# ── Step 3: Build images ───────────────────────────────────────────────────────
log "Building Docker images (this may take a few minutes)..."

# Pull base images first
docker compose -f "$COMPOSE_FILE" pull db

# Build app (no cache for clean build)
docker compose -f "$COMPOSE_FILE" build --no-cache app

log "Build complete."

# ── Step 4: Stop old containers ────────────────────────────────────────────────
log "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans || true

# ── Step 5: Start containers ────────────────────────────────────────────────────
log "Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

# ── Step 6: Wait for DB to be ready ───────────────────────────────────────────
log "Waiting for database to be ready..."
for i in $(seq 1 30); do
  if docker exec zalo-crm-db pg_isready -U "${DB_USER:-crmuser}" >/dev/null 2>&1; then
    log "Database is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "Database did not become ready in 30 seconds."
    docker compose -f "$COMPOSE_FILE" logs db
    exit 1
  fi
  printf "  waiting... %ds\n" "$i"
  sleep 1
done

# ── Step 7: Run Prisma migrations + seed (inside app container) ─────────────────
log "Running Prisma migrations..."
docker compose -f "$COMPOSE_FILE" exec -T app \
  sh -c "npx prisma migrate deploy"

log "Seeding admin account..."
docker compose -f "$COMPOSE_FILE" exec -T app \
  sh -c "npx tsx prisma/seed.ts"

# ── Step 8: Verify health ──────────────────────────────────────────────────────
log "Verifying app health..."
for i in $(seq 1 20); do
  STATUS=$(docker compose -f "$COMPOSE_FILE" exec -T app \
    wget -qO- http://localhost:3000/health 2>/dev/null | head -c 50 || echo "")
  if [ -n "$STATUS" ]; then
    log "App is healthy: $STATUS"
    break
  fi
  if [ "$i" -eq 20 ]; then
    err "App did not respond after 20 seconds."
    docker compose -f "$COMPOSE_FILE" logs app | tail -30
    exit 1
  fi
  printf "  waiting... %ds\n" "$i"
  sleep 1
done

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
log "==============================================="
log "  Deploy complete!"
log "  App:       http://localhost:3000"
log "  Default:   admin@zalo.local / admin123"
log "  Change password after first login!"
log "==============================================="

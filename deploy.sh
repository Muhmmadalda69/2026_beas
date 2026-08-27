#!/bin/bash
# Béas production deployment script.
# Run on the server to deploy the entire stack.
#
#   bash deploy.sh                  # registry mode (default): pull prebuilt images
#   MODE=build bash deploy.sh       # build on this server (needs ~2 GB RAM free)
#   IMAGE_TAG=<sha> bash deploy.sh  # roll back to a specific CI build
#   PROXY=none bash deploy.sh       # skip Caddy; publish frontend :80 + gateway :8080
#
# Registry mode exists because the production box is a 1 GB instance. It can
# comfortably *run* the stack (~500 MB) but not *build* it — `next build` alone
# needs ~2 GB and gets OOM-killed. GitHub Actions (.github/workflows/build-images.yml)
# builds and pushes the images to GHCR on every push to main; the server only pulls.

set -e

LOG_PREFIX="[béas deploy]"
MODE="${MODE:-registry}"
PROXY="${PROXY:-caddy}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

log() {
  echo "$LOG_PREFIX $*"
}

error() {
  echo "$LOG_PREFIX ERROR: $*" >&2
}

# Ensure we're in the right directory.
if [ ! -f "docker-compose.yml" ]; then
  error "docker-compose.yml not found. Run from repo root."
  exit 1
fi

if [ "$MODE" != "registry" ] && [ "$MODE" != "build" ]; then
  error "MODE must be 'registry' or 'build' (got '$MODE')."
  exit 1
fi

log "Béas production deployment (mode: $MODE, proxy: $PROXY, tag: $IMAGE_TAG)"

# Compose file stack. Registry mode adds the overrides that replace every
# `build:` section with a prebuilt `image:` reference; the Caddy file must come
# last so its `ports: !reset` wins over the prod overrides.
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)
if [ "$MODE" = "registry" ]; then
  COMPOSE_FILES+=(-f docker-compose.registry.yml)
fi
if [ "$PROXY" = "caddy" ]; then
  COMPOSE_FILES+=(-f docker-compose.caddy.yml)
fi

# 1. Pull latest code with sparse-checkout.
#    Registry mode needs only the compose files — no source, no build context.
#    Build mode additionally checks out backend + frontend.
log "Pulling from origin (sparse-checkout: $MODE mode)..."
git sparse-checkout init 2>/dev/null || true
{
  echo "docker-compose.yml"
  echo "docker-compose.prod.yml"
  echo "docker-compose.registry.yml"
  echo "docker-compose.caddy.yml"
  echo "Caddyfile"
  echo "deploy.sh"
  echo ".gitignore"
  if [ "$MODE" = "build" ]; then
    echo "backend/"
    echo "backend/deploy/"
    echo "frontend/"
  fi
} | git sparse-checkout set --stdin
git fetch origin main
git reset --hard origin/main
if [ "$MODE" = "registry" ]; then
  log "Pulled. Source excluded — this server never compiles anything."
else
  log "Pulled. Mobile folder excluded (sparse-checkout)."
fi

# 2. Generate secrets if .env does not exist.
if [ ! -f ".env" ]; then
  log "Generating .env with random secrets..."
  {
    # JWT secret: 32-byte random.
    echo "JWT_SECRET=$(openssl rand -base64 32)"
    # Internal API secret: 32-byte random.
    echo "INTERNAL_API_SECRET=$(openssl rand -base64 32)"
    # Postgres password: 16-byte random alphanumeric.
    echo "POSTGRES_PASSWORD=$(openssl rand -base64 16 | tr -d '=+/' | cut -c1-16)"
    # Admin account seeded in the database.
    echo "ADMIN_USERNAME=admin"
    echo "ADMIN_PASSWORD=admin12345"
    # CORS and public API URL — adjust to your domain.
    echo "CORS_ORIGINS=http://localhost:3000"
    echo "NEXT_PUBLIC_API_URL=http://localhost:8080"
    echo "API_INTERNAL_URL=http://gateway:8080"
    # Google OAuth (optional — leave empty to skip).
    echo "GOOGLE_CLIENT_ID="
    echo "GOOGLE_CLIENT_SECRET="
    echo "GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback"
    # HTTPS & secure cookies (set true only when behind HTTPS reverse proxy).
    echo "COOKIE_SECURE=false"
    # GHCR namespace images are pulled from (lowercase GitHub username).
    echo "GHCR_OWNER=muhmmadalda69"
    # Only needed if the GHCR packages are private: a GitHub PAT with
    # read:packages scope, plus the username it belongs to.
    echo "GHCR_USER="
    echo "GHCR_TOKEN="
  } > .env
  log "Created .env. Review and update CORS_ORIGINS, domain URLs, and Google OAuth if needed."
fi

# 3. Ensure docker daemon is healthy; restart if stuck.
log "Checking docker daemon..."
max_retries=3
for i in $(seq 1 $max_retries); do
  if docker ps > /dev/null 2>&1; then
    log "Docker daemon OK."
    break
  fi
  if [ "$i" -eq "$max_retries" ]; then
    error "Docker daemon unresponsive after $max_retries checks."
    exit 1
  fi
  log "Docker daemon stuck, restarting (attempt $i/$max_retries)..."
  sudo systemctl restart docker || true
  sleep 3
done

# 4. Fetch or build the images, then start the stack.
if [ "$MODE" = "registry" ]; then
  # Public GHCR packages need no login; private ones do.
  # shellcheck disable=SC1091
  GHCR_USER=$(grep -E '^GHCR_USER=' .env | cut -d= -f2-)
  GHCR_TOKEN=$(grep -E '^GHCR_TOKEN=' .env | cut -d= -f2-)
  if [ -n "$GHCR_TOKEN" ]; then
    log "Logging in to ghcr.io as $GHCR_USER..."
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
  fi

  log "Pulling images from ghcr.io (tag: $IMAGE_TAG)..."
  docker compose "${COMPOSE_FILES[@]}" pull

  log "Starting services..."
  docker compose "${COMPOSE_FILES[@]}" up -d
else
  log "Building and starting services..."
  docker compose "${COMPOSE_FILES[@]}" up --build -d
fi

# 5. Wait for services to be healthy.
log "Waiting for stack to stabilize..."
sleep 5
if [ -z "$(docker compose "${COMPOSE_FILES[@]}" ps -q postgres)" ]; then
  error "Services failed to start. Check logs: docker compose ${COMPOSE_FILES[*]} logs"
  exit 1
fi
log "Stack is running."

# 6. Prune old images and dangling volumes. In registry mode this matters more:
#    every deploy leaves the previously-pulled images untagged.
log "Cleaning up old Docker artifacts..."
docker image prune -f --filter "dangling=true" || true
docker volume prune -f || true

# 7. Summary.
log "Deployment complete!"
echo ""
echo "Stack is running. Check status with:"
echo "  docker compose ${COMPOSE_FILES[*]} ps"
echo ""
echo "View logs:"
echo "  docker compose ${COMPOSE_FILES[*]} logs -f [service-name]"
echo ""
if [ "$PROXY" = "caddy" ]; then
  echo "Access (Caddy routes by hostname; Cloudflare terminates TLS):"
  echo "  Website: https://digipos.cloud/       · admin at /admin"
  echo "  Gateway: https://api.digipos.cloud/   · for the mobile app"
else
  echo "Access (no proxy; ports published directly):"
  echo "  Frontend: http://<server-ip-or-domain>/        · admin at /admin"
  echo "  Gateway:  http://<server-ip-or-domain>:8080/   · for the mobile app"
fi
echo ""
echo "Not reachable from outside? Check, in this order:"
echo "  1. Oracle VCN Security List — ingress TCP 80/443/8080 from 0.0.0.0/0"
echo "  2. Host firewall            — sudo iptables -L INPUT -n --line-numbers"
echo "  3. Serving locally at all   — curl -I http://127.0.0.1/"
echo ""

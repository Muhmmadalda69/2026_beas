#!/bin/bash
# Béas production deployment script.
# Run once on the server to deploy the entire stack.
#   bash deploy.sh

set -e

LOG_PREFIX="[béas deploy]"

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

log "Béas production deployment"

# 1. Pull latest code with sparse-checkout: only backend + frontend (skip mobile).
log "Pulling from origin (sparse-checkout: backend + frontend only)..."
# Initialize sparse-checkout patterns (safe to re-run).
git sparse-checkout init --cone 2>/dev/null || true
git sparse-checkout set backend frontend docker-compose.yml docker-compose.prod.yml deploy.sh .gitignore
# Pull latest.
git fetch origin main
git reset --hard origin/main
log "Pulled. Mobile folder excluded (sparse-checkout)."

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

# 4. Build & start the full stack (production overrides: port 80, no postgres exposed).
log "Building and starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# 5. Wait for services to be healthy.
log "Waiting for stack to stabilize..."
sleep 5
if ! docker ps | grep -q beas-postgres-1; then
  error "Services failed to start. Check logs: docker compose logs"
  exit 1
fi
log "Stack is running."

# 6. Prune old images and dangling volumes.
log "Cleaning up old Docker artifacts..."
docker image prune -f --filter "dangling=true" || true
docker volume prune -f || true

# 7. Summary.
log "Deployment complete!"
echo ""
echo "Stack is running. Check status with:"
echo "  docker compose ps"
echo ""
echo "View logs:"
echo "  docker compose logs -f [service-name]"
echo ""
echo "Access:"
echo "  Frontend: http://localhost:3000"
echo "  Gateway:  http://localhost:8080"
echo ""

#!/usr/bin/env bash
#
# Béas — one-command production deploy.
#
# On the server, just run:
#     ./deploy.sh
#
# It will:
#   1. ensure an .env exists, generating strong secrets on first run,
#   2. build & start the whole stack (Postgres + 5 Go services + Next.js),
#   3. expose ONLY the web app on port 80 (services & DB stay internal),
#   4. wait until the site is healthy and print the result.
#
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; BLD=$'\033[1m'; RST=$'\033[0m'
info() { echo "${BLD}==>${RST} $*"; }
warn() { echo "${YEL}!  $*${RST}"; }
die()  { echo "${RED}✗  $*${RST}" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 0. Prerequisites
# ---------------------------------------------------------------------------
command -v docker >/dev/null 2>&1 || die "Docker tidak ditemukan. Install Docker dulu."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 tidak ditemukan."

# Random secret generator (openssl preferred, /dev/urandom fallback).
gen() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

get_env() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }
set_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" .env 2>/dev/null; then
    awk -v k="$key" -v v="$val" 'BEGIN{FS="=";OFS="="} $1==k{print k,v;next} {print}' .env > .env.tmp && mv .env.tmp .env
  else
    printf '%s=%s\n' "$key" "$val" >> .env
  fi
}
# A value is "insecure" if empty or still carries a shipped placeholder.
is_insecure() { [ -z "$1" ] || printf '%s' "$1" | grep -qiE 'change-me|dev-insecure'; }

# ---------------------------------------------------------------------------
# 1. .env + secrets
# ---------------------------------------------------------------------------
FRESH=false
if [ ! -f .env ]; then
  cp .env.example .env
  FRESH=true
  info ".env dibuat dari .env.example"
fi

GENERATED_ADMIN_PW=""

# JWT & internal secret: safe to (re)generate whenever still at a placeholder.
for key in JWT_SECRET INTERNAL_API_SECRET; do
  if is_insecure "$(get_env "$key")"; then
    set_env "$key" "$(gen)"
    info "secret dibuat: $key"
  fi
done

# Postgres password & admin password: only on first deploy, so we never break
# an existing database volume or silently change a live admin login.
if [ "$FRESH" = true ]; then
  if is_insecure "$(get_env POSTGRES_PASSWORD)" || [ "$(get_env POSTGRES_PASSWORD)" = "galuh" ]; then
    set_env POSTGRES_PASSWORD "$(gen)"
    info "password Postgres dibuat"
  fi
  cur_admin="$(get_env ADMIN_PASSWORD)"
  if [ -z "$cur_admin" ] || [ "$cur_admin" = "admin12345" ]; then
    GENERATED_ADMIN_PW="$(gen | cut -c1-20)"
    set_env ADMIN_PASSWORD "$GENERATED_ADMIN_PW"
    info "password superadmin dibuat"
  fi
fi

# Default cookie policy: HTTP on port 80 → Secure cookies must be OFF.
[ -z "$(get_env COOKIE_SECURE)" ] && set_env COOKIE_SECURE "false"

# Warn if Google is configured but the redirect URI still points at the dev port.
if [ -n "$(get_env GOOGLE_CLIENT_ID)" ] && get_env GOOGLE_REDIRECT_URI | grep -q ":3000"; then
  warn "GOOGLE_REDIRECT_URI masih memakai :3000. Untuk port 80, ubah ke http://<domain>/api/auth/google/callback dan samakan di Google Console."
fi

# ---------------------------------------------------------------------------
# 2. Build & start
# ---------------------------------------------------------------------------
info "Membangun image & menjalankan stack (port 80)…"
$COMPOSE up -d --build

# ---------------------------------------------------------------------------
# 3. Health check
# ---------------------------------------------------------------------------
info "Menunggu aplikasi siap…"
ok=false
for _ in $(seq 1 40); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost/ 2>/dev/null || echo 000)"
  if [ "$code" = "200" ]; then ok=true; break; fi
  sleep 3
done

echo
$COMPOSE ps
echo
if [ "$ok" = true ]; then
  echo "${GRN}${BLD}✓ Béas aktif di http://localhost (port 80)${RST}"
else
  warn "Aplikasi belum merespons di port 80. Cek log: $COMPOSE logs -f frontend gateway"
fi

if [ -n "$GENERATED_ADMIN_PW" ]; then
  echo
  echo "${BLD}Akun superadmin pertama:${RST}"
  echo "  username : $(get_env ADMIN_USERNAME 2>/dev/null || echo admin)"
  echo "  password : ${BLD}${GENERATED_ADMIN_PW}${RST}"
  echo "  ${YEL}Simpan sekarang — tidak ditampilkan lagi. Ganti setelah login pertama.${RST}"
fi

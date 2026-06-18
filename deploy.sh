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
# Warn on low memory: compiling all images at once OOM-kills the build on small
# servers. We build sequentially below, but very small boxes still need swap.
total_mem_mb=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)
swap_mb=$(awk '/SwapTotal/{print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)
if [ "$total_mem_mb" -gt 0 ] && [ "$total_mem_mb" -lt 1800 ] && [ "$swap_mb" -lt 512 ]; then
  warn "RAM hanya ${total_mem_mb}MB tanpa swap memadai. Build Go/Next bisa OOM."
  warn "Disarankan tambah swap 2GB (sekali saja, sebagai root):"
  echo  "      fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
  echo  "      echo '/swapfile none swap sw 0 0' >> /etc/fstab"
fi

# Reclaim disk if low: failed/previous builds leave large unused image layers &
# build cache that can fill the disk (ENOSPC). Pruning unused data is safe — it
# never touches named volumes (your database).
docker_root=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)
avail_mb=$(df -Pm "$docker_root" 2>/dev/null | awk 'NR==2{print $4}' || echo 99999)
if [ -n "$avail_mb" ] && [ "$avail_mb" -lt 6000 ]; then
  warn "Ruang disk Docker rendah (${avail_mb}MB di $docker_root). Membersihkan cache tak terpakai…"
  docker container prune -f >/dev/null 2>&1 || true
  docker image prune -af >/dev/null 2>&1 || true
  docker builder prune -af >/dev/null 2>&1 || true
  avail_mb=$(df -Pm "$docker_root" 2>/dev/null | awk 'NR==2{print $4}' || echo 0)
  info "Disk Docker tersedia sekarang: ${avail_mb}MB"
  if [ "$avail_mb" -lt 4000 ]; then
    warn "Masih < 4GB. Build (terutama Next.js) butuh beberapa GB sementara — pertimbangkan menambah disk."
  fi
fi

# Build images one at a time so only a single compiler runs at peak — this is
# what prevents the parallel-build OOM you may have hit.
info "Membangun image satu per satu (hemat memori)…"
for svc in postgres transliterate auth wiki quiz gateway frontend; do
  info "  build: $svc"
  $COMPOSE build "$svc"
done

info "Menjalankan stack (port 80)…"
$COMPOSE up -d --remove-orphans

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

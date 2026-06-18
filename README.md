# Béas — Ensiklopedia & Pembelajaran Aksara Sunda

Aplikasi web untuk mempelajari dan melestarikan **Aksara Sunda**, dibangun
dengan arsitektur **microservices** (backend Go) dan **Next.js 16** di frontend.

## Fitur

1. **Ensiklopedia (Wikipedia Aksara Sunda)** — artikel tentang sejarah dan
   kaidah aksara, dikelola lewat panel admin dengan **editor WYSIWYG (Tiptap)**.
   Konten disimpan sebagai HTML lalu **disanitasi** saat ditampilkan (anti-XSS).
2. **Transliterasi** — mesin konversi tulisan Latin → Aksara Sunda secara
   langsung (syllable parser lengkap dengan rarangkén, panampa, dan angka).
3. **Kuis bertingkat** — beberapa level dengan kesulitan meningkat. Soal **dan**
   urutan pilihan jawaban diacak ulang setiap kali bermain memakai algoritma
   **Fisher–Yates** dengan sumber acak kriptografis.
4. **Akun pengguna & papan peringkat** — pemain dapat masuk via email/sandi atau
   **Google**. Boleh main sebagai tamu, tetapi skor hanya tercatat ke
   **leaderboard** bila login.
5. **Panel admin** — kelola artikel ensiklopedia serta level & soal kuis.

## Arsitektur

```
┌────────────┐      ┌─────────────────────────────────────────────┐
│  Next.js    │      │                  Gateway :8080               │
│ frontend    │─────▶│  (reverse proxy, CORS, security, rate limit) │
│  :3000      │      └───────┬──────────┬──────────┬───────────────┘
└────────────┘              │          │          │          │
                      ┌─────▼───┐ ┌────▼────┐ ┌───▼────┐ ┌───▼─────────┐
                      │  auth   │ │  wiki   │ │  quiz  │ │ transliterate│
                      │ :8081   │ │ :8082   │ │ :8083  │ │   :8084      │
                      └────┬────┘ └────┬────┘ └───┬────┘ └──────────────┘
                           │           │          │
                        ┌──▼───────────▼──────────▼──┐
                        │   PostgreSQL (db per svc)   │
                        └─────────────────────────────┘
```

- **Clean architecture** per service: `domain` (entity + ports) → `service`
  (use cases) → `postgres` (adapter) → `http` (transport). Cross-cutting
  concerns live in `internal/platform`.
- **Microservices monorepo**: one Go module, five independently deployable
  binaries under `cmd/`, each shipped as its own container.

### Keamanan

- JWT HS256 dengan validasi algoritma ketat (mencegah algorithm-confusion).
- Password admin di-hash dengan **bcrypt**; login konstan-waktu untuk meredam
  user enumeration & timing attack.
- Token admin disimpan di cookie **httpOnly** + `SameSite`; tidak pernah
  terekspos ke JavaScript klien. Browser hanya berbicara ke proxy same-origin.
- Security headers, CORS allowlist, dan **rate limiting per-IP** di gateway dan
  tiap service (login dibatasi lebih ketat).
- Decoder JSON menolak field tak dikenal & membatasi ukuran body.
- Penilaian kuis **sepenuhnya di server**; jawaban benar tidak pernah dikirim
  ke klien sebelum submit.

## Menjalankan

### Dengan Docker (disarankan)

```bash
cp .env.example .env      # ubah JWT_SECRET & ADMIN_PASSWORD untuk produksi
docker compose up --build
```

- Frontend: <http://localhost:3000>
- Gateway API: <http://localhost:8080>
- Admin default: `admin` / `admin12345` (di <http://localhost:3000/admin>)

### Deploy produksi (port 80)

Di server, cukup satu perintah:

```bash
bash deploy.sh
```

`deploy.sh` akan:
- membuat `.env` & **menghasilkan secret kuat** otomatis pada run pertama
  (`JWT_SECRET`, `INTERNAL_API_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`),
- build & menjalankan seluruh stack lewat `docker-compose.yml` +
  `docker-compose.prod.yml`,
- mengekspos **hanya frontend di port 80** (gateway & Postgres tetap internal,
  tidak terbuka ke publik), dengan `restart: always`,
- menunggu sampai sehat lalu mencetak **password superadmin** sekali.

Akses: `http://<ip-atau-domain-server>/` · Admin: `/admin`.

Catatan:
- **HTTP vs HTTPS**: default `COOKIE_SECURE=false` agar login bekerja di port 80
  (HTTP). Bila memasang TLS/HTTPS (mis. via reverse proxy), set
  `COOKIE_SECURE=true` di `.env`.
- **Google login**: isi `GOOGLE_CLIENT_ID`/`SECRET` dan ubah
  `GOOGLE_REDIRECT_URI` menjadi `http://<domain>/api/auth/google/callback`
  (samakan di Google Console), lalu `bash deploy.sh` lagi.
- **CORS**: browser hanya berbicara dengan frontend (same-origin), jadi
  `CORS_ORIGINS` tidak memengaruhi alur normal.

### Pengembangan lokal — satu perintah dengan hot-reload

Sekali siapkan dependency:

```bash
npm run setup     # pasang concurrently (root) + dependency frontend
```

Lalu cukup **satu perintah** untuk menjalankan semuanya:

```bash
npm run dev
```

Perintah ini:

- menyalakan **PostgreSQL** via Docker (`docker compose up -d postgres`),
- menjalankan **5 service Go** dengan **[air](https://github.com/air-verse/air)**
  (live-reload: simpan file `.go` → service-nya otomatis recompile & restart),
- menjalankan **frontend** `next dev` (hot-module-reload instan untuk `.tsx`),

semuanya dalam satu terminal dengan log berwarna. Tekan **Ctrl+C** sekali untuk
menghentikan semuanya. **Tidak perlu `docker compose down/up --build` lagi tiap
mengubah kode.**

> Catatan: dev mode butuh Postgres terekspos di `localhost:5432` (sudah diatur
> di `docker-compose.yml`). Konfigurasi air per-service ada di `backend/.air/`.

Menjalankan test backend:

```bash
cd backend && go test ./...
```

## Dokumentasi API

Dokumentasi **tidak publik** — hanya dapat diakses oleh **superadmin**.

- **Redoc interaktif**: masuk sebagai superadmin → <http://localhost:3000/admin/docs>
- Spesifikasi mentah (juga ter-gate superadmin): `GET /api/docs/spec`
- Sumber spec untuk pengembang: [`docs/openapi.yaml`](docs/openapi.yaml) &
  [`docs/API.md`](docs/API.md) (mirror dari `frontend/openapi.yaml` yang disajikan aplikasi)
- Import `docs/openapi.yaml` ke Postman/Insomnia/Swagger Editor untuk mencoba langsung.

## Peran (RBAC)

| Peran | Akses |
|-------|-------|
| **superadmin** | Semua akses admin + kelola akun admin (`/admin/admins`) + dokumentasi API (`/admin/docs`) |
| **admin** | Kelola artikel ensiklopedia, level & soal kuis |
| **user** | Pemain kuis; skor tercatat di leaderboard |

Akun bawaan (`admin` / `admin12345`) di-seed sebagai **superadmin**. Pada
deployment lama yang belum punya superadmin, akun `ADMIN_USERNAME` otomatis
dipromosikan saat auth-service dijalankan.

## Ringkasan endpoint (via gateway)

| Method | Path | Akses | Keterangan |
|--------|------|-------|------------|
| POST | `/api/auth/login` | publik | login admin |
| GET | `/api/auth/me` | token | profil admin |
| GET | `/api/wiki/articles` | publik | daftar artikel |
| GET | `/api/wiki/articles/{slug}` | publik | detail artikel |
| POST/PUT/DELETE | `/api/wiki/articles...` | admin | kelola artikel |
| GET | `/api/quiz/levels` | publik | daftar level |
| POST | `/api/quiz/levels/{id}/play` | publik | ambil soal acak |
| POST | `/api/quiz/submit` | publik | kirim & nilai jawaban |
| `*` | `/api/quiz/levels...questions...` | admin | kelola level & soal |
| POST | `/api/quiz/submit` | opsional login | login → skor tercatat |
| GET | `/api/quiz/leaderboard` | publik | papan peringkat |
| POST | `/api/auth/users/register` | publik | daftar pemain |
| POST | `/api/auth/users/login` | publik | login pemain |
| POST | `/api/auth/users/oauth` | internal | upsert dari Google (shared secret) |
| POST | `/api/translit/transliterate` | publik | Latin → Aksara |
| GET | `/api/translit/chart` | publik | tabel aksara |

## Mengaktifkan login Google (opsional)

1. Buka <https://console.cloud.google.com/apis/credentials> → **Create OAuth client ID** → tipe **Web application**.
2. Tambahkan **Authorized redirect URI**: `http://localhost:3000/api/auth/google/callback`.
3. Isi `.env`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxx
   ```
4. `docker compose up -d --build frontend` — tombol "Masuk dengan Google" otomatis muncul.

Tanpa kredensial, tombol Google disembunyikan dan login email/sandi tetap berfungsi.

## Tech stack

- **Backend**: Go 1.25, `net/http` (ServeMux routing), `pgx/v5`,
  `golang-jwt/v5`, `x/crypto/bcrypt`, `x/time/rate`.
- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4,
  Noto Sans Sundanese.
- **Infra**: Docker Compose, PostgreSQL 16.

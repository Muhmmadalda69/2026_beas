# Béas — Panduan API

Dokumen ini ringkasan praktis. Sumber kebenaran yang lengkap & machine-readable
ada di [`openapi.yaml`](./openapi.yaml).

## Akses & dokumentasi interaktif

- **Base URL (gateway):** `http://localhost:8080`
- Semua endpoint memakai prefix `/api/<layanan>` (`auth`, `wiki`, `quiz`, `translit`).
- **Redoc interaktif:** buka <http://localhost:3000/docs.html> (memuat `openapi.yaml`).
- **Import cepat:** unggah `docs/openapi.yaml` ke Postman, Insomnia, atau
  Swagger Editor (<https://editor.swagger.io>) untuk mencoba langsung.

## Konvensi

| Aspek | Aturan |
|------|--------|
| Sukses | `{ "data": ... }` |
| Error | `{ "error": "pesan" }` dengan kode HTTP yang sesuai |
| Auth | Header `Authorization: Bearer <JWT>` |
| Body | JSON; field tak dikenal ditolak; maksimum 1 MiB |
| Rate limit | Per-IP di gateway & tiap layanan (login lebih ketat) |

## Model autentikasi

Ada dua jenis identitas, keduanya memakai JWT Bearer dengan klaim `role` berbeda:

| Identitas | Role | Diperoleh dari | Dipakai untuk |
|-----------|------|----------------|---------------|
| Admin | `admin` | `POST /api/auth/login` | Kelola artikel, level, soal |
| Pengguna | `user` | `POST /api/auth/users/login` / `register` / Google | Mencatat skor kuis ke leaderboard |

Endpoint admin **wajib** token admin. Endpoint `play`/`submit` kuis memakai
**auth opsional**: tanpa token tetap bisa dimainkan, tetapi skor hanya tercatat
ke leaderboard bila token pengguna disertakan.

> Catatan keamanan frontend: token disimpan sebagai cookie **httpOnly**
> (`ga_token` untuk admin, `ga_user` untuk pengguna). Browser memanggil API
> lewat proxy same-origin Next (`/api/gw/*` dan `/api/me/*`) yang menambahkan
> header `Authorization` dari cookie — token tidak pernah terekspos ke JS klien.

## Ringkasan endpoint

### Auth
| Method | Path | Auth | Keterangan |
|--------|------|------|-----------|
| POST | `/api/auth/login` | — | Login admin |
| GET | `/api/auth/me` | admin | Profil admin |
| POST | `/api/auth/users/register` | — | Daftar pengguna |
| POST | `/api/auth/users/login` | — | Login pengguna |
| POST | `/api/auth/users/oauth` | internal secret | Upsert dari Google (server-to-server) |
| GET | `/api/auth/users/me` | user | Profil pengguna |

### Wiki
| Method | Path | Auth | Keterangan |
|--------|------|------|-----------|
| GET | `/api/wiki/articles?category=&q=` | — | Daftar artikel |
| GET | `/api/wiki/articles/{slug}` | — | Detail artikel |
| GET | `/api/wiki/categories` | — | Kategori unik |
| POST | `/api/wiki/articles` | admin | Buat artikel |
| PUT | `/api/wiki/articles/{id}` | admin | Perbarui artikel |
| DELETE | `/api/wiki/articles/{id}` | admin | Hapus artikel |

### Quiz
| Method | Path | Auth | Keterangan |
|--------|------|------|-----------|
| GET | `/api/quiz/levels` | — | Daftar level |
| GET | `/api/quiz/levels/{id}` | — | Detail level |
| POST | `/api/quiz/levels/{id}/play` | opsional | Mulai sesi (soal acak) |
| POST | `/api/quiz/submit` | opsional | Kirim jawaban & nilai |
| GET | `/api/quiz/leaderboard` | — | Papan peringkat |
| POST | `/api/quiz/levels` | admin | Buat level |
| PUT/DELETE | `/api/quiz/levels/{id}` | admin | Ubah/hapus level |
| GET | `/api/quiz/levels/{id}/questions` | admin | Soal + kunci jawaban |
| POST | `/api/quiz/levels/{id}/questions` | admin | Tambah soal |
| PUT/DELETE | `/api/quiz/questions/{id}` | admin | Ubah/hapus soal |

### Transliterasi
| Method | Path | Auth | Keterangan |
|--------|------|------|-----------|
| POST | `/api/translit/transliterate` | — | Latin → Aksara Sunda |
| GET | `/api/translit/chart` | — | Tabel aksara lengkap |

## Contoh (curl)

### Transliterasi

```bash
curl -X POST http://localhost:8080/api/translit/transliterate \
  -H "Content-Type: application/json" \
  -d '{"text":"wilujeng sumping"}'
# { "data": { "input": "wilujeng sumping", "aksara": "ᮝᮤᮜᮥᮏᮨᮀ ᮞᮥᮙ᮪ᮕᮤᮀ" } }
```

### Login admin lalu buat artikel

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin12345"}' | jq -r .data.token)

curl -X POST http://localhost:8080/api/wiki/articles \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Contoh","category":"Dasar","summary":"...","content":"<p>Halo</p>"}'
```

### Main kuis (sebagai pengguna) & lihat hasil berwaktu

```bash
UTOK=$(curl -s -X POST http://localhost:8080/api/auth/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"rahasia123"}' | jq -r .data.token)

LVL=$(curl -s http://localhost:8080/api/quiz/levels | jq -r '.data[0].id')

# Mulai sesi (durasi mulai dihitung server sejak respons ini)
curl -s -X POST http://localhost:8080/api/quiz/levels/$LVL/play \
  -H "Authorization: Bearer $UTOK"

# Kirim jawaban (answer = teks opsi yang dipilih)
curl -s -X POST http://localhost:8080/api/quiz/submit \
  -H "Authorization: Bearer $UTOK" -H "Content-Type: application/json" \
  -d '{"session_id":"<id>","answers":[{"question_id":"<qid>","answer":"ᮊ"}]}'
```

## Skor kuis berwaktu

`final_points = points_earned + time_bonus`, dengan

```
par      = 20 dtk × jumlah_soal
kecepatan = clamp((par − durasi) / par, 0..1)
time_bonus = round(points_earned × 0.5 × kecepatan)   # hanya untuk jawaban benar
```

Durasi diukur server (play → submit) sehingga tak bisa dipalsukan. Leaderboard
mengurutkan dari jumlah `final_points` terbaik per level; bila seri, total waktu
yang lebih kecil menang. Konstanta `par` & rasio bonus ada di
`backend/internal/quiz/service.go`.

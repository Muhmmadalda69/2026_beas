# Béas — Aplikasi Mobile (Flutter)

Klien mobile untuk platform **Béas** (ensiklopedia, transliterasi, dan kuis
Aksara Sunda). Mengonsumsi backend microservice yang sama lewat **gateway**
(`/api/<layanan>`), memakai token **JWT Bearer** seperti web.

## Fitur
- **Beranda** — hero, pintasan fitur, artikel pilihan.
- **Ensiklopedia** — daftar artikel + pencarian + filter kategori, detail artikel (render HTML).
- **Transliterasi** — Latin → Aksara Sunda real-time + salin.
- **Tabel Aksara** — referensi lengkap (swara, ngalagena, rarangkén, dll).
- **Kuis bertingkat** — level dengan **penguncian progres**, kuis berwaktu, penilaian server + bonus kecepatan, pembahasan.
- **Papan peringkat** — peringkat pemain.
- **Akun** — daftar / masuk (email + sandi), token tersimpan aman (`flutter_secure_storage`), profil + keluar.

Desain memakai **palet heritage** yang sama dengan web (cream/terracotta/olive,
Playfair Display + Inter + Noto Sans Sundanese) agar identitas konsisten lintas
platform. Material 3, navigasi bawah 5 tab.

## Arsitektur singkat
```
lib/
  config.dart        # base URL API (via --dart-define)
  api.dart           # ApiClient: token + envelope {data}/{error}
  models.dart        # model data (article, level, quiz, dll)
  services.dart      # AuthService / WikiService / QuizService / TranslitService
  theme.dart         # tema heritage (Material 3) + helper teks aksara
  state/auth.dart    # AuthProvider (login/register/logout, token persist)
  widgets/common.dart
  screens/           # root nav + tiap layar
```

## Menjalankan

1. **Gateway sudah dapat dijangkau perangkat.**
   Di produksi, Caddy pada server merutekan berdasarkan hostname:
   `digipos.cloud` → frontend, `api.digipos.cloud` → gateway. Cloudflare
   menerminasi TLS di depannya, jadi app cukup memanggil
   `https://api.digipos.cloud` **tanpa nomor port**. Gateway menerima
   `Authorization: Bearer <token>` langsung.

   > Jangan pakai `https://digipos.cloud:8080`. Cloudflare hanya memproksi
   > HTTPS di port 443/2053/2083/2087/2096/8443 — tidak pernah 8080.

2. **Set base URL** lewat `--dart-define` (default sudah produksi,
   `https://api.digipos.cloud`):

   ```bash
   # Produksi — tidak perlu define apa pun:
   flutter run

   # Emulator Android + stack lokal Docker (10.0.2.2 = localhost host):
   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080
   ```

3. **Build rilis:**
   ```bash
   flutter build apk --release
   ```

## Catatan
- **HTTP (cleartext)** masih diizinkan (Android `usesCleartextTraffic`, iOS ATS)
  agar pengembangan lokal terhadap `10.0.2.2:8080` tetap bisa. Produksi kini
  sepenuhnya HTTPS, jadi untuk rilis publik sebaiknya kedua setelan itu
  diperketat kembali — `NSAllowsArbitraryLoads` kerap diganjal review App Store.
- **Font dibundel sebagai aset lokal** (`assets/fonts/`) — tidak butuh internet.
  File TTF tidak di-commit ke git; unduh sekali dengan:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/download_fonts.ps1
  ```
  Kemudian jalankan `flutter pub get`.

## Login dengan Google

Alur: app pakai `google_sign_in` → dapat `id_token` → kirim ke
`POST /api/auth/users/google` → auth-service **memverifikasi token ke Google**
(audience harus = **Web Client ID**) lalu membuat sesi. Tidak ada secret di app.

**Setup (sekali, di Google Cloud — proyek yang sama dengan web):**
1. **Reuse Web Client ID** yang sudah ada (dari `GOOGLE_CLIENT_ID` web). Ini
   dipakai app sebagai `serverClientId` (audience id_token) **dan** oleh
   auth-service untuk verifikasi.
2. Buat **OAuth client Android**: Google Cloud → Credentials → Create OAuth
   client ID → Android.
   - Package name: `org.taruma.beas`
   - SHA-1 (debug, mesin ini): `1C:75:91:E3:7E:F0:9E:C2:B3:B8:B7:FA:FC:26:81:D7:81:5C:B3:F3`
     (ambil milik Anda sendiri: `cd android && ./gradlew signingReport`)
   - Untuk rilis, tambahkan juga SHA-1 keystore rilis.
3. (iOS, opsional) buat OAuth client iOS + tambahkan URL scheme `REVERSED_CLIENT_ID`.

**Backend:** auth-service membaca `GOOGLE_CLIENT_ID` (sudah diteruskan compose).
Pastikan `.env` server berisi `GOOGLE_CLIENT_ID=<web-client-id>` lalu redeploy
auth (`docker compose ... up -d --build auth`).

**Jalankan app dengan kedua define:**
```bash
flutter run \
  --dart-define=API_BASE_URL=https://api.digipos.cloud \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```
Tombol "Masuk dengan Google" hanya muncul bila `GOOGLE_SERVER_CLIENT_ID` diisi.
Tanpa OAuth client Android yang cocok (package + SHA-1), sign-in gagal dengan
`PlatformException(sign_in_failed ... 10)` — itu tanda SHA-1/package belum
terdaftar.

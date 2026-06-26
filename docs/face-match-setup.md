# Aktifkan Pencocokan Wajah (on-device, Fase 2)

Verifikasi wajah saat **clock-in/out**: HP menghitung **embedding** wajah (vektor angka)
dengan model **TFLite** _di perangkat_ (tanpa cloud, tanpa AWS), lalu **server**
membandingkannya dengan wajah referensi karyawan (cosine similarity).

Secara default **OFF** → swafoto hanya jadi bukti (perilaku lama). Bila gagal cocok,
absen **tetap tercatat** namun ditandai untuk **tinjau HR** (soft-fail, tak memblokir).

> Butuh **dev build** + **HP fisik** (tidak jalan di Expo Go). iOS Simulator tak punya
> kamera; Android Emulator tidak andal untuk wajah → pakai perangkat sungguhan.

⚠️ **Trade-off:** karena embedding dihitung di perangkat karyawan, ini paling lemah untuk
mencegah titip-absen. Foto bukti + flag tinjau HR adalah pengamannya. Bila anti-fraud jadi
prioritas, pertimbangkan **CompreFace self-hosted di DigitalOcean** (server-side, tetap tanpa
AWS) — cukup ganti isi `web/apps/web/src/lib/face-match.ts`.

---

## Ringkasan komponen

| Bagian | Lokasi | Status |
|---|---|---|
| Pembanding (cosine) + ambang | `web/apps/web/src/lib/face-match.ts` | ✅ selesai (server) |
| API enroll/clock (embedding) | `web/apps/web/src/app/api/v1/...` | ✅ selesai |
| Toggle admin + badge HR | Settings → "Absensi & Wajah", detail kehadiran | ✅ selesai |
| Hitung embedding di HP | `mobile-app/src/lib/face-embed.ts` | ✅ selesai (perlu file model asli) |

---

## 1. Server: nyalakan fitur

Di lingkungan server (`.env` web / Vercel):
```
FACE_MATCH_ENABLED=1
# opsional, ambang cosine 0..1 (default 0.62). Naikkan = lebih ketat.
FACE_MATCH_THRESHOLD=0.62
```
- Hanya `FACE_MATCH_ENABLED=1` yang wajib — **tidak ada kredensial cloud**.
- Pastikan kolom DB sudah ter-apply di PROD (Neon): `pnpm db:push` saat deploy
  (`Employee.faceEmbedding`, `Company.faceMatchEnabled`, `Attendance.*Face*`).

Lalu admin nyalakan toggle: **Pengaturan → Absensi & Wajah → "Pencocokan wajah saat absen"**
(toggle baru bisa dinyalakan setelah `FACE_MATCH_ENABLED=1`).

## 2. Mobile: native deps (sudah terpasang)

Deps yang dipakai (tanpa ML Kit / library Google — deteksi wajah TIDAK dipakai;
mengandalkan crop tengah dari bingkai bulat):
```sh
cd mobile-app
npx expo install react-native-fast-tflite expo-image-manipulator
npm install jpeg-js        # decoder piksel (pure-JS)
```
Config plugin `react-native-fast-tflite` **sudah** terdaftar di `app.json` (bagian `plugins`),
dan `metro.config.js` sudah menambahkan `tflite` ke `assetExts`.

## 3. Mobile: sediakan model

- Siapkan model embedding wajah **TFLite**, mis. **MobileFaceNet** (input `112x112`,
  output vektor ~`192` dimensi). **Pastikan lisensinya jelas** untuk penggunaan komersial.
- Simpan di `mobile-app/assets/models/mobilefacenet.tflite`.
- Dimensi output bebas asal **konsisten** antara enroll & clock (server menerima 64–1024 dim).

## 4. Mobile: pilih preprocessing model

`src/lib/face-embed.ts` **sudah** mengimplementasikan pipeline lengkap
(crop kotak tengah → resize → `jpeg-js` decode → normalisasi → TFLite → L2-normalize).
Tanpa deteksi wajah — user menaruh wajah di bingkai bulat. Yang perlu Anda set hanya
**mode normalisasi** agar cocok dengan model:

```ts
// src/lib/face-embed.ts
export const FACE_MODEL_PREPROCESS: "mobilefacenet" | "facenet" = "mobilefacenet";
```
- `"mobilefacenet"` → `(x-127.5)/128` (input ~112x112, output ~192-d).
- `"facenet"` → prewhiten per-gambar `(x-mean)/max(std, 1/√N)` (input ~160x160, output 128/512-d).

Ukuran input & dimensi output dibaca **otomatis** dari model. Enroll & clock memakai
pipeline yang sama, jadi embedding selalu sebanding. Jika modelmu butuh normalisasi lain,
sesuaikan cabang di fungsi `computeFaceEmbedding`.

## 5. Buat DEV BUILD + uji di HP fisik

```sh
npx expo run:ios      # iPhone fisik (Simulator tak ada kamera)
npx expo run:android  # HP Android fisik
```
> Setelah ganti deps/native config, **rebuild** (bukan sekadar reload Metro).

## Verifikasi (alur)

1. **Daftar wajah:** app → **Profil → Daftarkan Wajah** → ambil foto → "Wajah Terdaftar".
   (Bila model belum dipasang, muncul pesan jelas, bukan crash.)
2. **Clock-in:** Home → Clock In → langkah wajah → kirim. Layar **sukses** menampilkan
   pill **"Wajah cocok"** atau **"Wajah perlu ditinjau HR"**.
3. **Sisi HR (web):** buka detail kehadiran → badge **"Wajah cocok N%"** / **"perlu ditinjau"**.
4. Jika shift minta swafoto tapi karyawan belum daftar → langkah wajah menampilkan gate
   **"Daftarkan wajah dulu"** mengarah ke Profil.

## Tuning & catatan

- **Ambang** (`FACE_MATCH_THRESHOLD`): mulai `0.62`. Terlalu banyak "perlu ditinjau" → turunkan
  sedikit; terlalu longgar → naikkan. (Khusus MobileFaceNet; model lain beda skala.)
- **Privasi:** foto wajah **tidak disimpan** — hanya vektor embedding di `Employee.faceEmbedding`.
  Swafoto bukti tetap di Spaces (folder `evidence`) seperti absensi biasa.
- **Soft-fail:** kegagalan model → match dilewati (tak ada flag), absen tetap jalan.
- **Crop tengah:** tak ada deteksi wajah → minta user menaruh wajah memenuhi bingkai bulat
  (porsi crop diatur `CENTER_CROP_RATIO` di `face-embed.ts`, default 0.85).
- Validasi kehadiran lain (GPS/radius/anti-mock) tetap diputuskan **server**.

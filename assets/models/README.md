# Model wajah on-device (TFLite)

`mobilefacenet.tflite` di folder ini dipakai oleh `src/lib/face-embed.ts` untuk
menghitung embedding wajah **di perangkat** (Fase 2 pencocokan wajah).

> File `mobilefacenet.tflite` yang ada sekarang adalah **PLACEHOLDER** (bukan model
> sungguhan). Selama placeholder, pemuatan model gagal → pencocokan wajah dilewati
> dengan aman (enroll menampilkan pesan "belum siap").

## Cara melengkapi

1. **Sediakan model MobileFaceNet `.tflite`** (input `112x112x3` float32, output
   embedding ~`128`/`192` dimensi). Pastikan **lisensinya jelas** untuk penggunaan
   komersial. (Cari "MobileFaceNet tflite" dari sumber tepercaya; verifikasi lisensi.)
2. **Timpa** file `assets/models/mobilefacenet.tflite` dengan model asli (nama sama).
3. **Pilih preprocessing** sesuai model di `src/lib/face-embed.ts` → konstanta
   `FACE_MODEL_PREPROCESS`:
   - `"mobilefacenet"` (default) → input `(x-127.5)/128`, biasanya 112x112, 192-d.
   - `"facenet"` → prewhiten per-gambar, biasanya 160x160, 128/512-d.
   Ukuran input & dimensi output dibaca **otomatis** dari model — cukup ganti konstanta ini.
   Boleh tetap pakai nama file `mobilefacenet.tflite` untuk model apa pun (atau ganti
   path `require(...)` di `face-embed.ts` bila ingin nama lain).
4. **Dev build** + uji di HP fisik:
   ```sh
   npx expo run:ios     # atau run:android
   ```
   (Tak jalan di Expo Go — butuh modul native TFLite.)
5. Set ambang server bila perlu: `FACE_MATCH_THRESHOLD` (cosine 0–1, default 0.62).

Panduan lengkap end-to-end: `mobile-app/docs/face-match-setup.md`.

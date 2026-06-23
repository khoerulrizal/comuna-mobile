# Aktifkan Peta Clock-in (expo-maps)

Peta menampilkan **titik lokasi karyawan + titik kantor (absensi) + lingkaran radius**.
Secara default **OFF** → layar lokasi menampilkan koordinat sebagai teks (fallback).
`expo-maps` butuh **dev build** (tidak jalan di Expo Go).

- **iOS** → Apple Maps, **tanpa API key**.
- **Android** → Google Maps, **butuh Google Maps API key**.

---

## 1. (Android) Buat Google Maps API key
1. Buka **Google Cloud Console** → buat / pilih project.
2. **APIs & Services → Library** → aktifkan **"Maps SDK for Android"**.
   (Perlu Billing aktif. Maps SDK Android punya kuota gratis besar.)
3. **APIs & Services → Credentials → Create credentials → API key**.
4. **Batasi key** (Restrict key):
   - **Application restrictions → Android apps** → tambah:
     - **Package name:** `id.comuna.app`
     - **SHA-1 fingerprint:** lihat langkah 2 di bawah (`eas credentials` atau `keytool`).
   - **API restrictions → Restrict key → Maps SDK for Android**.
5. Salin nilai key (`AIza...`).

### Ambil SHA-1
- Pakai EAS: `eas credentials` → Android → pilih profile → lihat **SHA-1** keystore.
- Atau debug keystore lokal:
  ```sh
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
  (Build rilis/EAS punya SHA-1 berbeda — tambahkan keduanya bila perlu.)

## 2. Isi env (jangan commit key)
Di `mobile-app/.env.local` (gitignored):
```
EXPO_PUBLIC_MAPS_ENABLED=1
GMAPS_ANDROID_KEY=AIza...keymu      # hanya untuk Android
```
- `EXPO_PUBLIC_MAPS_ENABLED=1` → menyalakan komponen peta (runtime).
- `GMAPS_ANDROID_KEY` → disuntik ke config Android saat build via `app.config.ts`
  (`android.config.googleMaps.apiKey`). iOS tidak memerlukannya.

## 3. Buat DEV BUILD (wajib — Expo Go tak punya modul native peta)
```sh
# iOS (langsung tampil Apple Maps, tanpa key)
npx expo run:ios

# Android (perlu GMAPS_ANDROID_KEY terisi)
npx expo run:android
```
Atau via EAS: `eas build --profile development --platform ios|android`.

> Setelah ganti env/native config, **rebuild** (bukan sekadar reload Metro).

## Verifikasi
- Buka Home → tombol Clock In → langkah **Lokasi**: peta tampil dengan marker
  "Lokasi Anda", marker kantor, dan lingkaran radius shift.
- Bila key salah/absent di Android: peta blank → cek package name & SHA-1 di key,
  dan Maps SDK for Android sudah aktif.

## Catatan keamanan
- Key Android bersifat client-side (embedded di APK) — **wajib dibatasi** per package +
  SHA-1 + Maps SDK for Android saja, agar tak bisa dipakai aplikasi lain.
- Validasi kehadiran (radius/mocked/akurasi) tetap diputuskan **server**; peta hanya visual.

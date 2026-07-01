# Panduan Setup Push Notifikasi (Expo Notifications + EAS Dev Build)

Kode notifikasi sudah selesai (bell + push). Panduan ini mengaktifkan **popup push ke HP**,
yang butuh **dev build** (expo-notifications adalah modul native, tak jalan di Expo Go) +
kredensial **FCM** (Android) / **APNs** (iOS).

> Ringkas: `bell in-app` sudah jalan lewat API tanpa langkah apa pun. Langkah di bawah
> hanya untuk **popup push**. Push Expo **gratis** (tak perlu akun berbayar pihak-ketiga).

---

## 0. Prasyarat
- Akun **Expo** gratis → https://expo.dev (daftar sekali).
- Node 18+ dan npm (sudah ada).
- **Android**: akun **Firebase** gratis (untuk FCM).
- **iOS**: akun **Apple Developer** berbayar ($99/thn) — hanya jika mau push iOS.
- Perangkat **fisik** (emulator tidak menerima push token).

Pasang EAS CLI (sekali):
```bash
npm install -g eas-cli
eas login
```

---

## 1. Inisialisasi EAS + projectId
Dari folder `mobile-app`:
```bash
eas init
```
Ini membuat project di Expo dan **otomatis menambahkan** `expo.extra.eas.projectId` ke `app.json`.
Kode (`src/lib/push.ts`) membaca projectId ini untuk mengambil token push.

Verifikasi `app.json` sekarang memuat:
```json
"extra": { "eas": { "projectId": "xxxxxxxx-xxxx-...." } },
"owner": "<username-atau-org-expo-anda>"
```
> Jika `owner` belum ada, tambahkan manual = username/organisasi Expo Anda.

`eas.json` (profil build) **sudah disiapkan** di repo — tak perlu dibuat.

---

## 2. Kredensial FCM (Android)
1. Buka https://console.firebase.google.com → **Add project** (atau pakai yang ada).
2. **Add app → Android**, isi package name **`id.comuna.app`** (harus sama dgn `app.json`).
3. Unduh **`google-services.json`**, taruh di root `mobile-app/`.
4. Tambahkan ke `app.json` (di `expo.android`):
   ```json
   "android": {
     "package": "id.comuna.app",
     "googleServicesFile": "./google-services.json",
     ...
   }
   ```
5. **FCM V1 service account key** (dipakai server Expo untuk kirim ke Android):
   - Firebase Console → ⚙️ **Project settings → Service accounts** → **Generate new private key** → unduh JSON.
   - Daftarkan ke EAS:
     ```bash
     eas credentials
     ```
     Pilih **Android → (profil) → Google Service Account → FCM V1** → unggah file JSON tadi.

> Tanpa langkah 5, build tetap jadi tapi push Android tak terkirim.

---

## 3. Kredensial APNs (iOS) — opsional (hanya jika rilis iOS)
Paling mudah, biarkan EAS yang mengurus:
```bash
eas credentials
```
Pilih **iOS → (profil) → Push Notifications → Set up Push Notifications** → EAS otomatis membuat
& mengelola **APNs Key**. Butuh login Apple Developer.

---

## 4. Build dev client
```bash
# Android (paling cepat untuk uji)
eas build --profile development --platform android

# iOS (butuh Apple Developer)
eas build --profile development --platform ios
```
Tunggu build selesai di cloud (~10–20 mnt). EAS memberi **link unduhan** (APK untuk Android /
`.ipa` atau install via TestFlight/registered device untuk iOS).

Pasang APK ke HP Android (aktifkan "Install unknown apps" bila diminta).

---

## 5. Jalankan & sambungkan Metro
```bash
npx expo start --dev-client
```
Buka **dev build** (bukan Expo Go) di HP, scan QR / pilih dari daftar. App tersambung ke Metro
Anda seperti biasa, tapi kini modul native (notifikasi, kamera, tflite, image-picker) aktif.

> Pastikan `EXPO_PUBLIC_API_BASE_URL` menunjuk ke server yang benar (lihat `.env`). Untuk uji
> push nyata, arahkan ke **produksi** (`https://portal.comuna.id`) agar server bisa mem-push.

---

## 6. Uji notifikasi
1. Login di app → app minta **izin notifikasi** → **Izinkan**. Ini mendaftarkan token Expo ke
   server (`POST /api/v1/notifications/register-token`). Cek tabel `PushToken` di DB terisi.
2. **Cara cepat kirim tes** (tanpa backend): https://expo.dev/notifications — tempel token
   `ExponentPushToken[...]`, isi judul/isi, **Send**. Popup harus muncul di HP.
   - Ambil token: sementara `console.log` di `registerForPush` (`src/lib/push.ts`) setelah
     `getExpoPushTokenAsync`, atau lihat baris `PushToken` di DB.
3. **Uji alur nyata**: dari web dashboard → **Perusahaan → Kirim Notifikasi** → kirim ke Semua →
   muncul di **lonceng** mobile + **popup**. Atau ajukan cuti (approver dapat notif).
4. **Foreground**: notifikasi juga tampil sebagai banner saat app terbuka (sudah di-handle).
5. **Tap** notifikasi → app membuka layar **Notifikasi** (bell).

---

## 7. Deploy server (Vercel)
- Tidak ada kunci pihak-ketiga di server (Expo Push terbuka). Cukup pastikan deploy produksi
  berjalan → `prisma db push` membuat tabel **`PushToken`** (aditif, aman).
- Tak ada env baru yang wajib untuk push.

---

## 8. Troubleshooting
| Gejala | Kemungkinan sebab |
|---|---|
| Token tak terdaftar / `registerForPush` diam | Dijalankan di **Expo Go** / **emulator** (tak dapat token) → pakai **dev build di device fisik**. |
| `getExpoPushTokenAsync` error "No projectId" | `expo.extra.eas.projectId` belum ada → jalankan `eas init`. |
| Popup tak muncul di Android | FCM V1 key belum diunggah ke EAS (langkah 2.5) / `google-services.json` salah / package name beda. |
| Popup tak muncul di iOS | APNs belum di-setup (langkah 3) / izin notifikasi ditolak. |
| Muncul di bell tapi tak ada popup | Server berhasil buat `Notification` tapi push gagal — cek log server (`sendExpoPush`) & token valid. |
| Badge/bell kosong | Belum ada baris `Notification` untuk user tsb (bell in-app tak butuh push). |

---

## Ringkasan perintah
```bash
npm install -g eas-cli && eas login
eas init                                   # projectId
eas credentials                            # FCM (Android) / APNs (iOS)
eas build --profile development -p android # dev build
npx expo start --dev-client                # jalankan
# lalu: login di app → izinkan notifikasi → uji via expo.dev/notifications atau dashboard
```

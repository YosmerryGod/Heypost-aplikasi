# Panduan Pengembangan

## Persyaratan

- Node.js 22.13 atau lebih baru.
- npm.
- Android Studio dan Android SDK untuk build Android lokal.
- macOS dan Xcode untuk build iOS lokal.
- Expo development build untuk menguji modul native khusus.

## Instalasi

```bash
git clone https://github.com/YosmerryGod/Heypost-aplikasi.git
cd Heypost-aplikasi
npm install
cp .env.example .env
```

Sesuaikan `EXPO_PUBLIC_API_URL` jika menggunakan server selain API produksi HeyPost.

## Menjalankan Metro

```bash
npx expo start
```

## Pemeriksaan

```bash
npx expo-doctor
npm run typecheck
```

## Build lokal

Android:

```bash
npm run android
```

iOS (macOS dengan Xcode):

```bash
npm run ios
```

## Catatan keamanan

- Jangan memasukkan secret backend, Google OAuth client secret, password, PIN, barcode plaintext, atau kredensial produksi ke variabel `EXPO_PUBLIC_*`.
- Semua variabel `EXPO_PUBLIC_*` tertanam dalam bundle aplikasi dan dapat dibaca pengguna.
- Token sesi disimpan melalui Expo SecureStore. Request tRPC mengirimkannya sebagai Authorization Bearer; backend memvalidasi token yang sama dengan sesi cookie.
- Jangan mencatat data autentikasi ke console atau crash report.
- Backend tetap menjadi sumber otorisasi dan kebenaran transaksi.

## Status saat ini

Fondasi Expo, tema, navigasi, provider tRPC, login owner (email/password), login karyawan (barcode/PIN), pemulihan sesi melalui auth.me, dan logout telah dihubungkan ke kontrak backend. Token sesi disimpan melalui SecureStore. Build Android/iOS, typecheck, dan pengujian perangkat belum dijalankan.

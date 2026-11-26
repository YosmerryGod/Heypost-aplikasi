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
- Token/sesi hanya boleh disimpan menggunakan penyimpanan aman platform setelah alur autentikasi dirancang.
- Jangan mencatat data autentikasi ke console atau crash report.
- Backend tetap menjadi sumber otorisasi dan kebenaran transaksi.

## Status saat ini

Fondasi Expo, navigasi awal, tema, layar pembuka, dan kerangka layar login telah dibuat. Layar login belum terhubung ke backend. Belum ada build Android/iOS atau pengujian perangkat yang dijalankan.

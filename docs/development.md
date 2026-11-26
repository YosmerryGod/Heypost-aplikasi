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

Fondasi Expo, tema HeyPost (Archivo/Figtree), navigasi native, login dan registrasi owner, login karyawan manual (barcode/PIN), POS checkout, transaksi harian, produk/stok, laporan, outlet, karyawan, pengeluaran, pengaturan struk, serta preferensi printer lokal telah diimplementasikan pada kode. Token sesi disimpan melalui SecureStore. Google OAuth, pemindai QR kamera, cetak struk Bluetooth, beberapa operasi lanjutan, dan pengujian perangkat fisik masih tertunda. TypeScript, Expo Doctor, serta export bundle Android dan iOS telah berhasil dijalankan.
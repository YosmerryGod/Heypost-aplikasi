# HeyPost Mobile

Aplikasi kasir HeyPost untuk Android dan iOS. Repository ini menjadi aplikasi mobile native berbasis React Native, bukan WebView wrapper.

## Tujuan

Menyediakan pengalaman dan kemampuan inti yang setara dengan `heypost-frontend`, dengan interaksi perangkat yang mengikuti platform Android dan iOS.

## Stack

- Expo SDK 58
- React Native 0.88
- React 19.3
- TypeScript
- Expo Router
- TanStack Query + tRPC untuk komunikasi API
- Expo Modules API untuk kapabilitas native Kotlin dan Swift

Gunakan Node.js 22.13 atau lebih baru sesuai persyaratan SDK 58. Versi paket Expo yang terkait harus dipasang dan diselaraskan menggunakan `npx expo install`.

## Repository terkait

| Repository | Tanggung jawab |
| --- | --- |
| [heypost-frontend](https://github.com/YosmerryGod/heypost-frontend) | Aplikasi web yang tetap berjalan dan tidak diubah oleh proyek mobile |
| [Heypost-aplikasi](https://github.com/YosmerryGod/Heypost-aplikasi) | Aplikasi mobile Android dan iOS |
| [heypost-backend](https://github.com/YosmerryGod/heypost-backend) | Autentikasi, otorisasi, data toko/outlet, produk, stok, transaksi, pengeluaran, dan laporan |

## Fitur yang harus dipertahankan

- Login dan registrasi owner.
- Login karyawan dengan barcode dan PIN.
- Multi-outlet dan perpindahan outlet untuk owner.
- Hak akses owner, manager, dan kasir.
- Katalog, kategori, produk, dan stok.
- Keranjang, checkout, serta transaksi.
- Riwayat transaksi dan pembatalan sesuai izin.
- Struk, preferensi struk, dan cetak thermal.
- Laporan penjualan dan ringkasan seluruh outlet untuk owner.
- Pengelolaan karyawan dan outlet oleh owner.
- Pengeluaran operasional untuk owner/manager.

Matriks rinci dan status implementasi akan dicatat pada `docs/feature-parity.md`. Fitur hanya ditandai selesai setelah perilaku dan aksesnya diverifikasi.

## Keputusan arsitektur

1. Aplikasi memakai React Native dan komponen native; tidak memuat aplikasi web melalui WebView.
2. Backend produksi tetap menjadi sumber data dan otorisasi. Mobile tidak membuat database bisnis lokal yang terpisah.
3. Cache query boleh digunakan untuk pengalaman yang responsif, tetapi transaksi dan perubahan stok harus dikonfirmasi server.
4. Sesi autentikasi harus disimpan dengan aman di perangkat. Jangan menyimpan PIN, password, barcode plaintext, atau cookie sesi di AsyncStorage maupun log.
5. Integrasi API harus mempertahankan kontrak tRPC dan serialisasi SuperJSON dari backend.
6. Kemampuan printer dipisahkan di balik interface platform. Android menggunakan modul native Bluetooth Classic/ESC-POS setelah model printer dan izin perangkat diverifikasi. Dukungan iOS ditentukan oleh protokol printer yang benar-benar tersedia; Bluetooth Classic Android tidak boleh diasumsikan kompatibel dengan iOS.
7. Preferensi perangkat seperti printer yang dipasangkan dapat disimpan lokal per perangkat, bukan di backend akun.
8. UI mengikuti token dan prinsip pada `DESIGN.md` milik frontend: warna hijau pinus, Archivo, Figtree, keterbacaan angka, target sentuh minimal 44 px, dan layout ringkas. Implementasi native boleh menyesuaikan pola navigasi platform.

## Tahapan pembangunan

1. **Fondasi** — konfigurasi Expo, navigasi, tema, struktur modul, dan pemeriksaan TypeScript.
2. **Autentikasi** — login owner (email/password), login karyawan (barcode/PIN), pemulihan sesi, dan logout sudah dihubungkan ke backend; registrasi dan Google OAuth masih berikutnya. Pengujian perangkat belum dilakukan.
3. **POS** — katalog, kategori, keranjang, checkout, dan transaksi.
4. **Operasional** — produk/stok, riwayat transaksi, laporan, outlet, karyawan, dan pengeluaran.
5. **Struk & perangkat** — pengaturan struk, printer Android, serta evaluasi kompatibilitas iOS.
6. **QA & rilis** — uji perangkat fisik, izin role, integrasi backend, build Android/iOS, dan persiapan distribusi.

## Menjalankan proyek

Perintah berikut berlaku setelah fondasi Expo dan file konfigurasi dibuat:

```bash
npm install
npx expo start
```

Untuk kapabilitas native dan pengujian printer, gunakan development build; Expo Go tidak memuat modul native khusus aplikasi.

## Validasi

Sebelum fitur dinyatakan selesai, jalankan pemeriksaan TypeScript, lint, build platform yang tersedia, dan pengujian alur pada perangkat nyata. Catat keterbatasan platform secara eksplisit.

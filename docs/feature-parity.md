# Matriks Kesetaraan Fitur HeyPost

Status ini memisahkan implementasi kode dari verifikasi pada perangkat nyata. Tampilan mobile mengikuti identitas visual HeyPost Web (warna hijau pinus, Archivo, Figtree, permukaan putih, garis pemisah tipis, dan komponen native). Backend tetap menjadi sumber data dan otorisasi.

| Area | Kapabilitas | Status kode | Catatan verifikasi |
| --- | --- | --- | --- |
| Autentikasi | Login email/password | Terhubung | Perlu uji perangkat dan sesi produksi |
| Autentikasi | Registrasi owner/toko/outlet | Terhubung | Perlu uji validasi dan pembuatan sesi |
| Autentikasi | Login barcode + PIN | Terhubung | Input manual tersedia; pemindai QR kamera belum dibuat |
| Autentikasi | Login Google OAuth | Belum | Redirect backend saat ini kembali ke frontend web; perlu rancangan deep-link dan konfigurasi backend |
| Autentikasi | Pemulihan sesi dan logout | Terhubung | Token disimpan dengan SecureStore |
| POS | Katalog, kategori, pencarian | Terhubung | Menggunakan pos.bootstrap |
| POS | Keranjang dan batas stok | Terhubung | Keranjang lokal; stok diverifikasi lagi sebelum checkout |
| POS | Checkout tunai/kartu | Terhubung | QRIS tidak ditampilkan karena UI web saat ini tidak menyediakan opsi tersebut |
| POS | Diskon, pelanggan, jenis pesanan | Terhubung | Perlu uji alur pembayaran nyata |
| POS | Struk transaksi dan cetak ulang | Belum | Perlu modul output/cetak native |
| Transaksi | Riwayat harian dan detail invoice | Terhubung | Tampilan daftar dan detail dasar |
| Transaksi | Pembatalan transaksi oleh owner | Terhubung | Invalidasi transaksi, laporan, dan stok |
| Transaksi | Edit transaksi oleh owner | Belum | Perlu menyelesaikan UI edit item dan validasi |
| Transaksi | Ekspor CSV | Belum | Belum diuji pada Android/iOS |
| Produk | Daftar, pencarian, kategori | Terhubung | Data mengikuti outlet aktif |
| Produk | Tambah kategori/produk | Terhubung | Upload foto produk belum tersedia |
| Produk | Edit harga/menu dan stok | Terhubung | UI membatasi field berdasarkan izin |
| Produk | Aktif/nonaktif dan arsip | Terhubung | Bergantung izin backend |
| Laporan | Ringkasan, tren, metode bayar, produk terlaris | Terhubung | Perlu uji angka terhadap web |
| Laporan | Rentang hari/minggu/bulan/semua | Terhubung | Filter menggunakan pos.summary |
| Laporan | Cakupan semua outlet | Terhubung | Owner saja |
| Laporan | Ekspor laporan | Belum | Perlu implementasi |
| Outlet | Daftar dan pindah outlet | Terhubung | Cache query outlet di-refresh |
| Outlet | Membuat outlet | Terhubung | Perlu uji data dan izin |
| Outlet | Mengubah/nonaktifkan outlet | Belum | Perlu implementasi |
| Karyawan | Daftar, tambah, role, outlet | Terhubung | Owner saja |
| Karyawan | Aktif/nonaktif dan regenerasi barcode | Terhubung | Barcode ditampilkan dari respons backend |
| Karyawan | Edit izin dan detail karyawan | Belum | Perlu implementasi |
| Pengeluaran | Daftar dan filter tanggal | Terhubung | Akses mengikuti permission |
| Pengeluaran | Catat biaya | Terhubung | Form tersedia dari Riwayat Harian |
| Pengeluaran | Batalkan biaya | Terhubung | Owner saja |
| Struk | Preferensi konten dan footer | Terhubung | Disimpan pada backend |
| Printer | Preferensi ukuran kertas/salinan/auto-print | Terhubung lokal | Disimpan di SecureStore per perangkat |
| Printer | Pairing Bluetooth dan cetak ESC/POS | Belum | Perlu model printer, protokol, dan native bridge Android; kompatibilitas iOS harus diverifikasi |

## Batas implementasi yang disengaja

- Tidak menggunakan WebView. Semua layar memakai React Native dan Expo Router.
- Transaksi dan perubahan stok selalu dikonfirmasi backend; cache lokal bukan bukti transaksi berhasil.
- Preferensi printer disimpan lokal per perangkat. Tombol pairing belum mengaku terhubung karena transport Bluetooth native belum tersedia.
- Login Google belum diarahkan ke aplikasi sampai backend menyediakan callback deep-link yang aman. Mengubah GOOGLE_SUCCESS_URL global secara langsung akan mengganggu login web.
- Jangan menandai fitur sebagai selesai sebelum alur sukses, gagal, izin, dan pemulihan diuji pada perangkat Android/iOS.

## Pemeriksaan yang telah dijalankan

- npm run typecheck
- npx expo-doctor
- npx expo export --platform android

Pemeriksaan bundle Android berhasil pada tahap implementasi ini. Pengujian perangkat fisik, iOS, printer, dan seluruh alur produksi masih diperlukan.
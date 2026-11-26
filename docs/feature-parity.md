# Matriks Kesetaraan Fitur HeyPost

Dokumen ini melacak cakupan aplikasi mobile terhadap aplikasi web dan kontrak backend yang diperiksa. Status mencerminkan implementasi kode dan bukti pengujian secara terpisah. Kode yang belum diuji pada perangkat tidak dianggap selesai.

| Area | Kapabilitas | Akses | Sumber kontrak | Status |
| --- | --- | --- | --- | --- |
| Autentikasi | Registrasi owner | Publik | `auth.register` | Belum diimplementasikan |
| Autentikasi | Login email/password | Publik | `auth.login` | Kode terhubung; belum diuji pada perangkat |
| Autentikasi | Login Google OAuth | Owner | Endpoint backend OAuth; alur callback mobile perlu dirancang | Perlu investigasi |
| Autentikasi | Login barcode + PIN 6 digit | Karyawan | `auth.employeeLogin` | Kode terhubung; belum diuji pada perangkat |
| Autentikasi | Memuat sesi dan logout | Semua role | `auth.me`, `auth.logout` | Kode terhubung; belum diuji pada perangkat |
| Outlet | Daftar dan pindah outlet | Owner | `store.switchOutlet` | Belum diimplementasikan |
| Outlet | Membuat dan mengubah outlet | Owner | `store.createOutlet`, `store.updateOutlet` | Belum diimplementasikan |
| POS | Bootstrap katalog dan kategori | Semua role | `pos.bootstrap`, `pos.listProducts` | Belum diimplementasikan |
| POS | Keranjang dan checkout | Semua role dengan `pos.access` | `pos.createTransaction` | Belum diimplementasikan |
| POS | Mengubah/membatalkan transaksi | Berdasarkan izin backend | `pos.updateTransaction`, `pos.cancelTransaction` | Belum diimplementasikan |
| Transaksi | Riwayat transaksi dan detail item | Berdasarkan `history.daily.view` | `pos.transactions` | Belum diimplementasikan |
| Produk | Kategori, produk, gambar, status aktif | Owner/manager sesuai izin | `pos.createCategory`, `pos.createProduct`, `pos.updateProduct`, `pos.archiveProduct` | Belum diimplementasikan |
| Laporan | Ringkasan penjualan | Owner/manager | `pos.summary` | Belum diimplementasikan |
| Laporan | Rekap seluruh outlet | Owner | `pos.summary(allOutlets: true)` | Belum diimplementasikan |
| Karyawan | Daftar, buat, ubah, regenerasi barcode | Owner | `employees.*` | Belum diimplementasikan |
| Pengeluaran | Daftar, catat, batalkan | Owner/manager | `expenses.*` | Belum diimplementasikan |
| Struk | Ambil dan ubah preferensi struk | Owner | `store.getReceiptSettings`, `store.updateReceiptSettings` | Belum diimplementasikan |
| Printer | Temukan, pasangkan, koneksikan printer Android | Owner melalui pengaturan perangkat | Modul native yang akan dibuat | Perlu implementasi |
| Printer | Cetak ESC/POS dan status hasil cetak | Owner melalui pengaturan perangkat | Modul native yang akan dibuat | Perlu implementasi |
| Printer | Cetak iOS | Bergantung pada BLE/MFi/protokol printer | Modul native iOS dan verifikasi perangkat | Perlu investigasi |

## Aturan kesetaraan

- Hak akses final selalu divalidasi backend; menyembunyikan tombol di mobile bukan kontrol keamanan.
- Jangan menampilkan metode pembayaran atau opsi yang belum benar-benar didukung alur backend dan UI yang telah diverifikasi.
- Kontrak tipe frontend menunjukkan enum pembayaran Tunai, QRIS, dan Kartu, sedangkan README frontend menyatakan UI web saat ini hanya menampilkan Tunai dan Kartu. Perbedaan ini harus diperiksa sebelum implementasi checkout mobile.
- Google OAuth perlu meninjau callback/deep link mobile; jangan menganggap redirect web saat ini langsung cocok untuk aplikasi native.
- Offline cache tidak boleh dianggap sebagai transaksi yang berhasil tersimpan.
- Fitur printer harus melaporkan status koneksi dan hasil kirim data yang nyata, bukan hanya menyimpan nama perangkat.

# [ADDED] HeyPost Native Android Preview

Folder ini menyediakan launcher untuk menjalankan aplikasi React Native HeyPost yang sebenarnya pada Android Studio Emulator. Ini bukan mockup, screenshot statis, atau WebView.

## Persiapan satu kali

1. Pasang Node.js 22.13 atau lebih baru.
2. Pasang Android Studio.
3. Dari Android Studio > SDK Manager, pasang Android SDK, Android SDK Platform-Tools, Android Emulator, dan Build-Tools.
4. Dari Android Studio > Device Manager, buat Android Virtual Device (AVD), lalu selesaikan konfigurasi awalnya.
5. Pastikan ANDROID_HOME atau ANDROID_SDK_ROOT menunjuk ke folder Android SDK dan adb dapat dijalankan dari terminal.
6. Pastikan Java Development Kit yang disyaratkan Android Gradle Plugin tersedia di JAVA_HOME.
7. Jalankan npm install dari root repository.

expo-dev-client sudah menjadi dependency proyek agar preview menggunakan development build yang sesuai dengan native modules aplikasi.

## Menjalankan preview

Windows PowerShell, dari root repository:

    .\tools\android-preview\preview.ps1

macOS / Linux, dari root repository:

    chmod +x tools/android-preview/preview.sh
    ./tools/android-preview/preview.sh

Launcher akan:
- menggunakan emulator/perangkat Android yang sudah terhubung;
- jika belum ada perangkat aktif, mencoba menjalankan AVD yang tersedia;
- menjalankan expo run:android melalui Expo Agent CLI;
- membangun dan memasang development app ke emulator, lalu membuka Metro untuk Fast Refresh.

Jika ada beberapa AVD, jalankan salah satunya melalui Android Studio Device Manager atau tentukan nama AVD:

    ANDROID_AVD_NAME="Nama AVD" ./tools/android-preview/preview.sh

PowerShell:

    $env:ANDROID_AVD_NAME = "Nama AVD"
    .\tools\android-preview\preview.ps1

## Siklus pengembangan

Setelah development app terpasang, perubahan JavaScript/TypeScript biasanya tampil melalui Fast Refresh. Perubahan native dependency, config plugin, atau konfigurasi native memerlukan rebuild dengan launcher yang sama.

Untuk menghentikan Metro, tekan Ctrl+C pada terminal yang menjalankan launcher. Emulator dapat dibiarkan terbuka untuk sesi berikutnya.

## Batas lingkungan

Android Emulator memerlukan dukungan virtualisasi hardware (umumnya KVM pada Linux). VPS HeyPost saat ini tidak memiliki /dev/kvm maupun Android SDK/Emulator, sehingga launcher ini harus dijalankan pada komputer yang memasang Android Studio dan memiliki emulator aktif. Source aplikasi tetap berada di repository yang sama.
// [ADDED] Stack workspace: halaman utama berada di grup Tabs, sedangkan Produk menjadi halaman Stack tersendiri.
import { Stack } from "expo-router";
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { getTheme } from "@/constants/theme";

export default function WorkspaceLayout() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ground },
      }}
    >
      {/* [ADDED] Kasir dan Riwayat tetap berada dalam navigasi tab utama. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* [ADDED] Produk berada di Stack agar tidak ikut menjadi tab tersembunyi. */}
      <Stack.Screen name="products" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Halaman preferensi toko dibuka sebagai halaman Stack tersendiri. */}
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Daftar dan pengelolaan outlet dibuka dari menu Pengaturan. */}
      <Stack.Screen name="outlets" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Pengelolaan akun karyawan. */}
      <Stack.Screen name="employees" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Laporan penjualan dibuka sebagai halaman Stack dari menu profil. */}
      <Stack.Screen name="reports" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Pengaturan dan pratinjau struk. */}
      <Stack.Screen name="receipt" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Pengaturan perangkat dan pencetakan struk. */}
      <Stack.Screen name="printer" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Pengaturan QRIS dan rekening pembayaran. */}
      <Stack.Screen name="payment" options={{ headerShown: false, presentation: "card" }} />
      {/* [ADDED] Profil pribadi dan keamanan akun, terpisah dari pengaturan toko. */}
      <Stack.Screen name="account" options={{ headerShown: false, presentation: "card" }} />
    </Stack>
  );
}

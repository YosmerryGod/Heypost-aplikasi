// [ADDED] Halaman Pengaturan toko berdasarkan referensi visual HeyPost.
import {useState, useMemo } from "react";
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTheme, type ThemeColors } from "@/constants/theme";
import { trpc } from "@/providers/trpc"; // [ADDED]

type SettingItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  comingSoon?: boolean;
};

const settingItems: SettingItem[] = [
  { title: "Outlet", description: "Kelola cabang, alamat, dan WhatsApp", icon: "business-outline" },
  { title: "Karyawan", description: "Kelola akun dan hak akses tim", icon: "people-outline" },
  { title: "Pengaturan Struk", description: "Logo, identitas, informasi, dan footer struk", icon: "receipt-outline" },
  { title: "Printer", description: "Hubungkan printer dan preferensi perangkat", icon: "print-outline" },
  { title: "Pembayaran", description: "Atur QRIS dan rekening transfer", icon: "card-outline" },
  { title: "Preferensi", description: "Pengaturan dan perilaku aplikasi", icon: "settings-outline", comingSoon: true },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const session = trpc.auth.me.useQuery();
  const principal = session.data?.principal;
  const can = (key:string) => principal?.role === "owner" || (principal?.permissions as string[] | undefined)?.includes(key) === true;
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const visibleItems = settingItems.filter((item) => item.title === "Outlet" ? can("outlets.manage") : item.title === "Karyawan" ? can("employees.manage") : item.title === "Pengaturan Struk" ? can("receipt.settings") : item.title === "Pembayaran" ? can("payment.settings") : item.title === "Printer" ? can("printer.settings") : true);
  const filteredItems = visibleItems.filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID")));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* [ADDED] Header sederhana dengan tombol kembali, wordmark, dan pencarian. */}
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#6B7280" />
        </Pressable>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={styles.headerSpacer} />
        {searchOpen ? (
          <View style={styles.searchBox}>
            <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Cari pengaturan..." placeholderTextColor="#87938C" style={styles.searchInput} />
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={() => { setSearch(""); setSearchOpen(false); }}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Cari pengaturan" onPress={() => setSearchOpen(true)} style={styles.searchButton}>
            <Ionicons name="search-outline" size={22} color="#6B7280" />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            {filteredItems.map((item, index) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}${item.comingSoon ? ", segera hadir" : ""}`}
                disabled={item.comingSoon}
                onPress={() => { if (item.title === "Outlet") router.push("/(app)/outlets"); else if (item.title === "Karyawan") router.push("/(app)/employees"); else if (item.title === "Pengaturan Struk") router.push("/(app)/receipt"); else if (item.title === "Printer") router.push("/(app)/printer"); else if (item.title === "Pembayaran") router.push("/(app)/payment"); }}
                style={({ pressed }) => [styles.menuRow, index !== filteredItems.length - 1 && styles.menuRowBorder, item.comingSoon && styles.menuRowDisabled, pressed && !item.comingSoon && styles.menuRowPressed]}
              >
                <View style={[styles.iconBox, item.comingSoon && styles.iconBoxDisabled]}>
                  <Ionicons name={item.icon} size={23} color={item.comingSoon ? "#65A58E" : "#F5B900"} />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemTitle, item.comingSoon && styles.itemDisabledText]}>{item.title}</Text>
                  <Text style={[styles.itemDescription, item.comingSoon && styles.itemDisabledDescription]}>{item.description}</Text>
                </View>
                {item.comingSoon ? <Text style={styles.comingSoon}>Segera</Text> : <Ionicons name="chevron-forward" size={22} color="#7D8982" />}
              </Pressable>
            ))}
            {filteredItems.length === 0 ? <Text style={styles.noResults}>Pengaturan tidak ditemukan.</Text> : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// [MODIFIED] Gunakan token warna tema yang mengikuti mode terang/gelap pada seluruh komponen layar.
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  backButton: { width: 34, height: 44, alignItems: "center", justifyContent: "center" },
  // [MODIFIED] Judul halaman dipindahkan ke header menggantikan wordmark.
  headerTitle: { color: colors.ink, fontFamily: "Archivo-Bold", fontSize: 20, fontWeight: "800", letterSpacing: -0.35 },
  headerSpacer: { flex: 1 },
  searchButton: { width: 42, height: 44, alignItems: "center", justifyContent: "center" },
  searchBox: { flex: 1, height: 42, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.line },
  searchInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13, padding: 0 },
  // [MODIFIED] Skala konten dipadatkan agar nyaman di layar ponsel.
  // [MODIFIED] Daftar dimulai lebih dekat ke header setelah judul dipindahkan.
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  menuSection: { gap: 0 },
  menuCard: { overflow: "hidden", borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  menuRow: { minHeight: 84, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 13 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  menuRowPressed: { backgroundColor: colors.line },
  menuRowDisabled: { opacity: 0.82 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.signalSoft },
  iconBoxDisabled: { backgroundColor: colors.line },
  itemCopy: { flex: 1, gap: 3 },
  itemTitle: { color: colors.ink, fontFamily: "Figtree-Bold", fontSize: 15, fontWeight: "800" },
  itemDescription: { color: colors.muted, fontFamily: "Figtree-Regular", fontSize: 12, lineHeight: 17 },
  itemDisabledText: { color: "#647169" },
  itemDisabledDescription: { color: "#87938C" },
  comingSoon: { color: "#647169", fontFamily: "Figtree-Bold", fontSize: 11, fontWeight: "700" },
  noResults: { padding: 24, color: colors.muted, textAlign: "center", fontSize: 14 },
});

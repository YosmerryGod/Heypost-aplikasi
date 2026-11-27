// [ADDED] Halaman Pengaturan toko berdasarkan referensi visual HeyPost.
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

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
  { title: "Pembayaran", description: "Metode pembayaran yang diterima", icon: "card-outline", comingSoon: true },
  { title: "Preferensi", description: "Pengaturan dan perilaku aplikasi", icon: "settings-outline", comingSoon: true },
];

export default function SettingsScreen() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredItems = settingItems.filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID")));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* [ADDED] Header sederhana dengan tombol kembali, wordmark, dan pencarian. */}
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#53635B" />
        </Pressable>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={styles.headerSpacer} />
        {searchOpen ? (
          <View style={styles.searchBox}>
            <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Cari pengaturan..." placeholderTextColor="#87938C" style={styles.searchInput} />
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={() => { setSearch(""); setSearchOpen(false); }}>
              <Ionicons name="close" size={20} color="#53635B" />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Cari pengaturan" onPress={() => setSearchOpen(true)} style={styles.searchButton}>
            <Ionicons name="search-outline" size={22} color="#53635B" />
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
                onPress={() => { if (item.title === "Outlet") router.push("/(app)/outlets"); else if (item.title === "Karyawan") router.push("/(app)/employees"); else if (item.title === "Pengaturan Struk") router.push("/(app)/receipt"); else if (item.title === "Printer") router.push("/(app)/printer"); }}
                style={({ pressed }) => [styles.menuRow, index !== filteredItems.length - 1 && styles.menuRowBorder, item.comingSoon && styles.menuRowDisabled, pressed && !item.comingSoon && styles.menuRowPressed]}
              >
                <View style={[styles.iconBox, item.comingSoon && styles.iconBoxDisabled]}>
                  <Ionicons name={item.icon} size={23} color={item.comingSoon ? "#65A58E" : "#087B58"} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F7F3" },
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E9E3" },
  backButton: { width: 34, height: 44, alignItems: "center", justifyContent: "center" },
  // [MODIFIED] Judul halaman dipindahkan ke header menggantikan wordmark.
  headerTitle: { color: "#15231C", fontFamily: "Archivo-Bold", fontSize: 20, fontWeight: "800", letterSpacing: -0.35 },
  headerSpacer: { flex: 1 },
  searchButton: { width: 42, height: 44, alignItems: "center", justifyContent: "center" },
  searchBox: { flex: 1, height: 42, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "#DCE6DF", backgroundColor: "#F6F9F7" },
  searchInput: { flex: 1, minWidth: 0, color: "#17241D", fontSize: 13, padding: 0 },
  // [MODIFIED] Skala konten dipadatkan agar nyaman di layar ponsel.
  // [MODIFIED] Daftar dimulai lebih dekat ke header setelah judul dipindahkan.
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  menuSection: { gap: 0 },
  menuCard: { overflow: "hidden", borderRadius: 15, borderWidth: 1, borderColor: "#D6E0D9", backgroundColor: "#FFFFFF" },
  menuRow: { minHeight: 84, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 13 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: "#DCE5DF" },
  menuRowPressed: { backgroundColor: "#F7FAF8" },
  menuRowDisabled: { opacity: 0.82 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF5EF" },
  iconBoxDisabled: { backgroundColor: "#EFF6F2" },
  itemCopy: { flex: 1, gap: 3 },
  itemTitle: { color: "#18251E", fontFamily: "Figtree-Bold", fontSize: 15, fontWeight: "800" },
  itemDescription: { color: "#68746D", fontFamily: "Figtree-Regular", fontSize: 12, lineHeight: 17 },
  itemDisabledText: { color: "#647169" },
  itemDisabledDescription: { color: "#87938C" },
  comingSoon: { color: "#647169", fontFamily: "Figtree-Bold", fontSize: 11, fontWeight: "700" },
  noResults: { padding: 24, color: "#68746D", textAlign: "center", fontSize: 14 },
});

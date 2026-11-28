// [ADDED] Shared workspace header for secondary HeyPost management screens.
import { useEffect, useMemo, useState } from "react";
import { router, usePathname } from "expo-router";
import { DeviceEventEmitter, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getTheme, type ThemeColors } from "@/constants/theme";

const titles: Record<string, string> = {
  "/employees": "Karyawan",
  "/outlets": "Outlet",
  "/expenses": "Pengeluaran",
  "/printer": "Printer Bluetooth",
  "/receipt": "Pengaturan struk",
};

export function WorkspaceHeader() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const s = useMemo(() => createStyles(colors), [colors]);
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!searchOpen) return;
    DeviceEventEmitter.emit("heypost:search-query", search);
  }, [search, searchOpen]);

  useEffect(() => {
    setSearch("");
    setSearchOpen(false);
    DeviceEventEmitter.emit("heypost:search-query", "");
  }, [pathname]);

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={23} color={colors.ink} />
        </Pressable>
        <View style={s.brandWrap}>
          <Text style={s.brand}>hey<Text style={s.brandAccent}>post.</Text></Text>
          {titles[pathname] ? <Text style={s.pageTitle}>{titles[pathname]}</Text> : null}
        </View>
        {searchOpen ? <View style={s.search}>
          <Ionicons name="search-outline" size={17} color={colors.muted} />
          <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Cari..." placeholderTextColor={colors.muted} style={s.input} />
          <Pressable onPress={() => { setSearch(""); setSearchOpen(false); DeviceEventEmitter.emit("heypost:search-query", ""); }}><Ionicons name="close" size={18} color={colors.muted} /></Pressable>
        </View> : <Pressable accessibilityRole="button" accessibilityLabel="Cari" onPress={() => setSearchOpen(true)} style={s.action}><Ionicons name="search-outline" size={23} color={colors.ink} /></Pressable>}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10 },
  back: { width: 34, height: 40, alignItems: "center", justifyContent: "center" },
  brandWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "baseline", gap: 10 },
  brand: { color: colors.ink, fontFamily: "Archivo-ExtraBold", fontSize: 23, letterSpacing: -1.4 },
  brandAccent: { color: colors.signal },
  pageTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  action: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  search: { width: 150, height: 38, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: colors.ground },
  input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 12, padding: 0 },
});

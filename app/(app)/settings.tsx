// [MODIFIED] Settings hub follows the grouped HeyPost frontend navigation.
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton, AppScreen, PageHeading, Panel, Tag } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

type SettingsRoute = "/products" | "/reports" | "/outlets" | "/employees" | "/expenses" | "/receipt" | "/printer";
const groups: { title: string; items: { title: string; description: string; route: SettingsRoute; icon: keyof typeof Ionicons.glyphMap; roles: string[] }[] }[] = [
  { title: "TOKO", items: [
    { title: "Outlet", description: "Kelola cabang, alamat, dan WhatsApp", route: "/outlets", icon: "business-outline", roles: ["owner"] },
    { title: "Karyawan", description: "Kelola akun dan hak akses tim", route: "/employees", icon: "people-outline", roles: ["owner"] },
  ] },
  { title: "MENU & LAPORAN", items: [
    { title: "Menu", description: "Kelola produk, kategori, harga, dan stok", route: "/products", icon: "restaurant-outline", roles: ["owner", "manager", "kasir"] },
    { title: "Laporan penjualan", description: "Pantau performa dan produk terlaris", route: "/reports", icon: "bar-chart-outline", roles: ["owner", "manager"] },
    { title: "Pengeluaran", description: "Catat dan pantau biaya operasional", route: "/expenses", icon: "wallet-outline", roles: ["owner", "manager"] },
  ] },
  { title: "TRANSAKSI", items: [
    { title: "Pengaturan struk", description: "Logo, informasi, dan footer struk", route: "/receipt", icon: "receipt-outline", roles: ["owner"] },
    { title: "Printer Bluetooth", description: "Preferensi printer dan ukuran kertas", route: "/printer", icon: "print-outline", roles: ["owner"] },
  ] },
];

export default function SettingsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); router.replace("/login"); },
    onError: (error) => Alert.alert("Gagal keluar", error.message),
  });
  const role = query.data?.principal.role ?? "kasir";
  const roleLabel = role === "owner" ? "Owner" : role === "manager" ? "Manager" : "Kasir";
  const activeOutlet = query.data?.outlets.find((outlet) => outlet.id === query.data?.activeOutletId);

  return (
    <AppScreen>
      <PageHeading eyebrow="PREFERENSI TOKO" title="Pengaturan" subtitle={query.data?.store.name ?? "Kelola toko dan perangkat kasir."} />
      <Panel style={s.accountPanel}>
        <View style={s.accountTop}>
          <View style={s.accountAvatar}><Ionicons name="person-outline" size={23} color={theme.colors.signal} /></View>
          <View style={s.accountCopy}><Text style={s.accountName}>{query.data?.principal.name ?? "Akun"}</Text><Text style={s.accountEmail}>{query.data?.principal.email ?? "Akun karyawan"}</Text></View>
          <Tag>{roleLabel}</Tag>
        </View>
        <View style={s.accountDivider} />
        <View style={s.storeLine}><Ionicons name="storefront-outline" size={17} color={theme.colors.signal} /><View style={{ flex: 1 }}><Text style={s.storeLabel}>OUTLET AKTIF</Text><Text style={s.storeName}>{activeOutlet?.name ?? "Outlet aktif"}</Text></View></View>
      </Panel>

      {groups.map((group) => {
        const visible = group.items.filter((item) => item.roles.includes(role));
        if (!visible.length) return null;
        return <View key={group.title} style={s.group}>
          <Text style={s.groupTitle}>{group.title}</Text>
          <View style={s.linkList}>
            {visible.map((item) => <Pressable key={item.route} accessibilityRole="button" onPress={() => router.push(item.route as never)} style={({ pressed }) => [s.linkRow, pressed && s.linkPressed]}>
              <View style={s.linkIcon}><Ionicons name={item.icon} size={21} color={theme.colors.signal} /></View>
              <View style={s.linkCopy}><Text style={s.linkTitle}>{item.title}</Text><Text style={s.linkDescription}>{item.description}</Text></View>
              <Ionicons name="chevron-forward" size={19} color="#9aa69e" />
            </Pressable>)}
          </View>
        </View>;
      })}

      <Panel style={s.logoutPanel}>
        <View style={s.logoutCopy}><Text style={s.logoutTitle}>Sesi akun</Text><Text style={s.linkDescription}>Keluar akan menghapus sesi tersimpan pada perangkat ini.</Text></View>
        <ActionButton title="Keluar dari akun" danger loading={logout.isPending} onPress={() => Alert.alert("Keluar dari HeyPost?", "Anda perlu masuk kembali untuk menggunakan aplikasi.", [{ text: "Batal", style: "cancel" }, { text: "Keluar", style: "destructive", onPress: () => logout.mutate() }])} />
      </Panel>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  accountPanel: { gap: 13, padding: 15 },
  accountTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  accountAvatar: { width: 43, height: 43, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signalSoft },
  accountCopy: { flex: 1, minWidth: 0, gap: 3 },
  accountName: { color: theme.colors.ink, fontSize: 14, fontWeight: "800" },
  accountEmail: { color: theme.colors.muted, fontSize: 11 },
  accountDivider: { height: 1, backgroundColor: theme.colors.line },
  storeLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  storeLabel: { color: theme.colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  storeName: { color: theme.colors.ink, fontSize: 12, fontWeight: "700", marginTop: 2 },
  group: { gap: 9, marginTop: 5 },
  groupTitle: { color: theme.colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  linkList: { overflow: "hidden", borderWidth: 1, borderColor: theme.colors.line, borderRadius: 13, backgroundColor: theme.colors.surface },
  linkRow: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  linkPressed: { backgroundColor: "#f2f8f4" },
  linkIcon: { width: 41, height: 41, borderRadius: 11, backgroundColor: "#eaf6ef", alignItems: "center", justifyContent: "center" },
  linkCopy: { flex: 1, minWidth: 0, gap: 3 },
  linkTitle: { color: theme.colors.ink, fontSize: 13, fontWeight: "800" },
  linkDescription: { color: theme.colors.muted, fontSize: 11, lineHeight: 15 },
  logoutPanel: { gap: 13, marginTop: 5 },
  logoutCopy: { gap: 4 },
  logoutTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "800" },
});

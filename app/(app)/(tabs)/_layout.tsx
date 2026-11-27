// [MODIFIED] Workspace header includes the HeyPost profile popup while preserving cashier search and cart actions.
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, DeviceEventEmitter, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";
import { Tabs, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

function AppHeader() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  // [ADDED] Menahan Modal tetap terpasang sampai animasi penutupan selesai.
  const [searchVisible, setSearchVisible] = useState(false);
  const [search, setSearch] = useState("");
  // [ADDED] Animasi search berkembang dari titik tengah header.
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchWidth = Math.max(220, Dimensions.get("window").width - 40);
  const [cartCount, setCartCount] = useState(0);
  // [ADDED] Sembunyikan shortcut keranjang saat layar pembayaran aktif.
  const [paymentActive, setPaymentActive] = useState(false);
  // [ADDED] Profile popup and account/session data.
  const [profileOpen, setProfileOpen] = useState(false);
  // [ADDED] Tunda navigasi sampai native profile Modal selesai ditutup.
  const [pendingProfileRoute, setPendingProfileRoute] = useState<"/(app)/products" | "/(app)/settings" | null>(null);
  const session = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setProfileOpen(false);
      router.replace("/login");
    },
    onError: (error) => Alert.alert("Tidak bisa keluar", error.message),
  });
  const switchOutlet = trpc.store.switchOutlet.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setProfileOpen(false);
    },
    onError: (error) => Alert.alert("Gagal mengganti outlet", error.message),
  });
  const principal = session.data?.principal;
  const store = session.data?.store;
  const outlets = session.data?.outlets ?? [];
  const activeOutlet = outlets.find((outlet) => outlet.id === session.data?.activeOutletId);

  useEffect(() => {
    const cartSubscription = DeviceEventEmitter.addListener("heypost:cart-count", (count: number) => setCartCount(count));
    const clearSubscription = DeviceEventEmitter.addListener("heypost:clear-search", () => {
      setSearchOpen(false);
    });
    const paymentSubscription = DeviceEventEmitter.addListener("heypost:payment-step", (active: boolean) => setPaymentActive(active));
    return () => {
      cartSubscription.remove();
      clearSubscription.remove();
      paymentSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    DeviceEventEmitter.emit("heypost:search-query", search);
  }, [search, searchOpen]);

  // [MODIFIED] Animasi buka dan tutup memakai kurva berbeda; Modal baru dilepas setelah animasi tutup selesai.
  useEffect(() => {
    if (searchOpen) {
      Animated.timing(searchAnimation, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }
    if (!searchVisible) return;
    Animated.timing(searchAnimation, {
      toValue: 0,
      duration: 280,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setSearchVisible(false);
      setSearch("");
      DeviceEventEmitter.emit("heypost:search-query", "");
    });
  }, [searchOpen, searchVisible, searchAnimation]);

  const openSearch = () => {
    searchAnimation.setValue(0);
    setSearchVisible(true);
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
  };

  useEffect(() => {
    // [ADDED] Log perubahan route untuk melacak apakah layar Produk benar-benar aktif.
    console.log(`[NAV_DEBUG] ${new Date().toISOString()} pathname=${pathname}`);
    setSearchOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // [ADDED] Navigasi dijalankan setelah Modal profil benar-benar tertutup agar tidak kalah oleh transisi native.
  useEffect(() => {
    console.log(`[NAV_DEBUG] ${new Date().toISOString()} profileOpen=${profileOpen} pendingRoute=${pendingProfileRoute ?? "none"} pathname=${pathname}`);
    if (profileOpen || !pendingProfileRoute) return;
    const route = pendingProfileRoute;
    console.log(`[NAV_DEBUG] ${new Date().toISOString()} NAV_PUSH_BEGIN route=${route} from=${pathname}`);
    setPendingProfileRoute(null);
    try {
      router.push(route);
      console.log(`[NAV_DEBUG] ${new Date().toISOString()} NAV_PUSH_CALLED route=${route}`);
    } catch (error) {
      console.error(`[NAV_DEBUG] ${new Date().toISOString()} NAV_PUSH_ERROR route=${route}`, error);
    }
  }, [profileOpen, pendingProfileRoute, pathname]);

  const searchPlaceholder = "Cari menu...";
  const openOutletPicker = () => {
    if (outlets.length < 2) return;
    Alert.alert(
      "Pilih outlet",
      "Pilih outlet aktif untuk transaksi berikutnya.",
      [
        ...outlets.map((outlet) => ({
          text: outlet.name + (outlet.id === session.data?.activeOutletId ? " ✓" : ""),
          onPress: () => {
            if (outlet.id !== session.data?.activeOutletId) switchOutlet.mutate({ outletId: outlet.id });
          },
        })),
        { text: "Batal", style: "cancel" as const },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.header}>
        {/* [MODIFIED] Logo, keranjang, dan profil disembunyikan saat mode pencarian aktif. */}
        {!searchVisible ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke kasir" onPress={() => router.replace("/(app)/(tabs)/cashier")}>
              <Text style={styles.brand}><Text style={styles.brandHey}>hey</Text><Text style={styles.brandPost}>post.</Text></Text>
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cari" style={styles.headerButton} onPress={openSearch}>
                <Ionicons name="search-outline" size={25} color={theme.colors.ink} />
              </Pressable>
              {!paymentActive ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Keranjang, ${cartCount} item`} style={styles.headerButton} onPress={() => DeviceEventEmitter.emit("heypost:open-cart")}>
                  <Ionicons name="bag-handle-outline" size={24} color={theme.colors.ink} />
                  {cartCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text></View> : null}
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Buka menu profil" style={styles.profileHeaderButton} onPress={() => setProfileOpen(true)}>
                <Ionicons name="person-outline" size={25} color={theme.colors.signal} />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.searchModePlaceholder} />
        )}
      </View>

      {/* [ADDED] Search modal transparan: sentuhan di luar header menutup pencarian. */}
      <Modal visible={searchVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSearch}>
        <View style={styles.searchModalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" style={StyleSheet.absoluteFill} onPress={closeSearch} />
          <Animated.View
            style={[
              styles.searchModalField,
              {
                top: insets.top + 8,
                width: searchAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, searchWidth] }),
                opacity: searchAnimation,
                transform: [{ scaleX: searchAnimation }],
              },
            ]}
          >
            <Ionicons name="search-outline" size={21} color={theme.colors.muted} />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Cari produk..."
              placeholderTextColor={theme.colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={closeSearch} style={styles.searchCloseButton}>
              <Ionicons name="close" size={21} color={theme.colors.muted} />
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* [ADDED] Profile menu popup based on the supplied HeyPost reference. */}
      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable style={styles.profileOverlay} onPress={() => setProfileOpen(false)}>
          <Pressable style={styles.profileCard} onPress={() => undefined}>
            <ScrollView style={styles.profileScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileContent}>
              <Text style={styles.profileSectionTitle}>AKUN</Text>
              <View style={styles.accountRow}>
                <View style={styles.accountAvatar}>
                  <Ionicons name="person-outline" size={26} color={theme.colors.signal} />
                </View>
                <View style={styles.accountDetails}>
                  <Text style={styles.accountName} numberOfLines={1}>{principal?.name ?? "Memuat akun..."}</Text>
                  <Text style={styles.roleBadge}>{principal?.role === "owner" ? "Owner" : principal?.role === "manager" ? "Manager" : "Kasir"}</Text>
                </View>
              </View>
              {principal?.email ? (
                <View style={styles.emailRow}>
                  <Ionicons name="mail-outline" size={18} color={theme.colors.muted} />
                  <Text style={styles.emailText} numberOfLines={1}>{principal.email}</Text>
                </View>
              ) : null}

              <View style={styles.profileDivider} />

              <View style={styles.storeHeading}>
                <Text style={styles.profileSectionTitle}>TOKO</Text>
                <View style={styles.editStoreButton}>
                  <Ionicons name="pencil-outline" size={18} color={theme.colors.muted} />
                </View>
              </View>
              <View style={styles.storeNameRow}>
                <Ionicons name="storefront-outline" size={23} color={theme.colors.signal} />
                <Text style={styles.storeName} numberOfLines={2}>{store?.name ?? "Memuat toko..."}</Text>
              </View>

              <View style={styles.outletHeading}>
                <Text style={styles.profileSectionTitle}>OUTLET</Text>
                <Text style={styles.currentLabel}>SAAT INI</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pilih outlet aktif"
                onPress={openOutletPicker}
                disabled={outlets.length < 2 || switchOutlet.isPending}
                style={styles.outletSelector}
              >
                <Text style={styles.outletName} numberOfLines={1}>{activeOutlet?.name ?? "Outlet belum tersedia"}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.ink} />
              </Pressable>

              <View style={styles.profileDivider} />

              <Text style={styles.profileSectionTitle}>MENU</Text>
              {/* [ADDED] These entries remain presentation-only while their old pages are intentionally being rebuilt. */}
              <View style={styles.profileMenuList}>
                {/* [MODIFIED] Produk membuka halaman manajemen katalog. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Buka halaman produk"
                  onPress={() => {
                    console.log(`[NAV_DEBUG] ${new Date().toISOString()} PROFILE_PRODUCT_PRESS pathname=${pathname}`);
                    setPendingProfileRoute("/(app)/products");
                    setProfileOpen(false);
                    console.log(`[NAV_DEBUG] ${new Date().toISOString()} PROFILE_MODAL_CLOSE_REQUESTED`);
                  }}
                  style={styles.profileMenuItem}
                >
                  <Ionicons name="cube-outline" size={22} color={theme.colors.muted} />
                  <Text style={styles.profileMenuLabel}>Produk</Text>
                  <Ionicons name="chevron-forward" size={16} color="#7d8982" />
                </Pressable>
                {/* [ADDED] Pengaturan membuka halaman preferensi toko. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Buka halaman pengaturan"
                  onPress={() => {
                    setPendingProfileRoute("/(app)/settings");
                    setProfileOpen(false);
                  }}
                  style={styles.profileMenuItem}
                >
                  <Ionicons name="settings-outline" size={20} color={theme.colors.muted} />
                  <Text style={styles.profileMenuLabel}>Pengaturan</Text>
                  <Ionicons name="chevron-forward" size={16} color="#7d8982" />
                </Pressable>
                <View style={styles.profileMenuItem}>
                  <Ionicons name="bar-chart-outline" size={20} color={theme.colors.muted} />
                  <Text style={styles.profileMenuLabel}>Laporan</Text>
                  <Ionicons name="chevron-forward" size={16} color="#7d8982" />
                </View>
              </View>

            </ScrollView>
            {/* [ADDED] Fixed footer keeps the logout action visible without scrolling to the end of the menu. */}
            <View style={styles.profileFooter}>
              <View style={styles.profileDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Keluar dari akun"
                disabled={logout.isPending}
                onPress={() => Alert.alert("Keluar dari akun?", "Anda perlu login kembali untuk menggunakan HeyPost.", [
                  { text: "Batal", style: "cancel" },
                  { text: "Keluar", style: "destructive", onPress: () => logout.mutate() },
                ])}
                style={styles.logoutButton}
              >
                <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
                <Text style={styles.logoutLabel}>{logout.isPending ? "Sedang keluar..." : "Keluar dari akun ini"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// [MODIFIED] Render the entire tab button ourselves so icon and label share a predictable responsive layout.
function FloatingTabButton({
  name,
  label,
  onPress,
  onLongPress,
  focused,
  accessibilityLabel,
  testID,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  onPress?: (...args: any[]) => void;
  onLongPress?: (...args: any[]) => void;
  accessibilityLabel?: string;
  testID?: string;
}) {

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: focused }}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <View style={[styles.tabButtonContent, focused && styles.tabButtonContentActive]}>
        {/* [MODIFIED] Active tab keeps its label visible beside the icon; both use the HeyPost signal color. */}
        <Ionicons name={name} size={22} color={focused ? theme.colors.signal : theme.colors.muted} />
        {focused ? <Text numberOfLines={1} style={styles.tabLabelActive}>{label}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function WorkspaceLayout() {
  const insets = useSafeAreaInsets();
  // [ADDED] Derive the selected tab from the actual Expo Router path; tabBarButton does not reliably forward selected state.
  const pathname = usePathname();
  const cashierFocused = pathname.endsWith("/cashier");
  const historyFocused = pathname.endsWith("/transactions");
  const session = trpc.auth.me.useQuery();
  const principal = session.data?.principal;
  const owner = principal?.role === "owner";
  const can = (permission: "pos.access" | "history.daily.view") =>
    owner || principal?.permissions.includes(permission) === true;

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        headerShown: true,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.signal,
        tabBarInactiveTintColor: theme.colors.muted,
        // [MODIFIED] Floating pill navigation with spacing above Android's system gesture area.
        // [MODIFIED] Sembunyikan navigasi Kasir/Riwayat saat halaman Produk dibuka dari profil.
        tabBarStyle: [styles.tabBar, { bottom: Math.max(insets.bottom, 8) + 12 }, pathname.endsWith("/products") && styles.tabBarHidden],
        tabBarItemStyle: styles.tabBarItem,
        sceneStyle: { backgroundColor: theme.colors.ground },
      }}
    >
      <Tabs.Screen
        name="cashier"
        listeners={{
          focus: () => console.log(`[NAV_DEBUG] ${new Date().toISOString()} SCREEN_FOCUS cashier`),
          blur: () => console.log(`[NAV_DEBUG] ${new Date().toISOString()} SCREEN_BLUR cashier`),
        }}
        options={{
          title: "Kasir",
          // [MODIFIED] Pass route-derived active state explicitly so the selected label always renders.
          tabBarButton: can("pos.access") ? (props) => <FloatingTabButton {...props} focused={cashierFocused} name="bag-handle-outline" label="Kasir" /> : () => null,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Riwayat Harian",
          // [MODIFIED] Pass route-derived active state explicitly so the selected label always renders.
          tabBarButton: can("history.daily.view") ? (props) => <FloatingTabButton {...props} focused={historyFocused} name="receipt-outline" label="Riwayat Harian" /> : () => null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerSafe: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  header: { minHeight: 60, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 27, letterSpacing: -1.7, fontFamily: "Archivo-ExtraBold" },
  brandHey: { color: theme.colors.ink },
  brandPost: { color: theme.colors.signal },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerButton: { width: 36, height: 42, alignItems: "center", justifyContent: "center", position: "relative" },
  // [ADDED] Header profile icon button.
  profileHeaderButton: { width: 48, height: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signalSoft },
  cartBadge: { position: "absolute", top: 0, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signal },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  // [ADDED] Search overlay menempati header dan berkembang dari titik tengah.
  searchModePlaceholder: { flex: 1, height: 42 },
  searchModalRoot: { flex: 1, backgroundColor: "transparent" },
  searchModalField: { position: "absolute", top: 8, left: 20, height: 44, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, backgroundColor: "#FFFFFF", elevation: 8, shadowColor: "#000000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
  searchInput: { flex: 1, minWidth: 0, color: theme.colors.ink, fontSize: 14, padding: 0 },
  searchCloseButton: { width: 30, height: 34, alignItems: "center", justifyContent: "center" },
  // [MODIFIED] Right-side drawer occupies 75% of the screen; tapping the remaining overlay closes it.
  profileOverlay: { flex: 1, flexDirection: "row", justifyContent: "flex-end", backgroundColor: "rgba(16, 31, 24, 0.28)" },
  profileCard: { width: "75%", height: "100%", maxHeight: "100%", flexDirection: "column", backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderBottomLeftRadius: 24, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderLeftWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e3eae5", overflow: "hidden", elevation: 15, shadowColor: "#173d2e", shadowOffset: { width: -5, height: 0 }, shadowOpacity: 0.13, shadowRadius: 20 },
  // [ADDED] Scrollable menu body and permanently visible logout footer.
  profileScroll: { flex: 1 },
  profileFooter: { paddingHorizontal: 14, paddingBottom: 8, backgroundColor: "#ffffff" },
  // [MODIFIED] Keep content clear of the Android status bar and system navigation area.
  profileContent: { paddingHorizontal: 14, paddingTop: 24, paddingBottom: 8 },
  profileSectionTitle: { color: "#7b8780", fontSize: 12, fontWeight: "800", letterSpacing: 1.1 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  accountAvatar: { width: 58, height: 58, borderRadius: 17, backgroundColor: "#e4f4eb", alignItems: "center", justifyContent: "center" },
  accountDetails: { flex: 1, minWidth: 0, gap: 4 },
  accountName: { color: "#111c17", fontSize: 16, fontWeight: "800", letterSpacing: -0.4 },
  roleBadge: { alignSelf: "flex-start", color: "#5f6c64", fontSize: 11, fontWeight: "700", backgroundColor: "#f1f5f2", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, overflow: "hidden" },
  // [MODIFIED] Email aligns with the drawer content and wraps safely in the narrower panel.
  emailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  emailText: { flex: 1, color: "#5e6963", fontSize: 11 },
  profileDivider: { height: 1, backgroundColor: "#dfe7e1", marginVertical: 12 },
  storeHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editStoreButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#dce5df", alignItems: "center", justifyContent: "center" },
  storeNameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7 },
  storeName: { flex: 1, color: "#17221c", fontSize: 16, fontWeight: "800" },
  outletHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 6 },
  currentLabel: { color: theme.colors.signal, fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  outletSelector: { minHeight: 44, borderWidth: 1, borderColor: "#dce5df", borderRadius: 11, backgroundColor: "#f3f7f4", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  outletName: { flex: 1, color: "#1b2821", fontSize: 14, fontWeight: "700" },
  profileMenuList: { marginTop: 4, marginBottom: 0 },
  profileMenuItem: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10 },
  profileMenuLabel: { flex: 1, color: "#58645d", fontSize: 14, fontWeight: "700" },
  logoutButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10 },
  logoutLabel: { color: theme.colors.danger, fontSize: 14, fontWeight: "800" },
  // [MODIFIED] Floating bar uses symmetric edges; each tab owns its complete icon-label layout.
  // [ADDED] Halaman Produk menggunakan ruang penuh tanpa bottom navigation utama.
  tabBarHidden: { display: "none" },
  tabBar: {
    position: "absolute",
    left: 18,
    right: 18,
    height: 76,
    paddingTop: 7,
    paddingBottom: 7,
    paddingHorizontal: 10,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "#e4ebe6",
    borderRadius: 38,
    backgroundColor: "#ffffff",
    elevation: 9,
    shadowColor: "#173d2e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tabBarItem: { flex: 1, minWidth: 0, justifyContent: "center", alignItems: "stretch" },
  // [ADDED] Full-width touch target prevents React Navigation's icon slot from clipping the label.
  tabButton: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  tabButtonContent: { minWidth: 64, maxWidth: "100%", minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, borderRadius: 28 },
  // [MODIFIED] Selected tab highlight and label use the shared HeyPost theme tokens.
  tabButtonContentActive: { width: "92%", backgroundColor: theme.colors.signalSoft },
  tabLabelActive: { color: theme.colors.signal, fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "800", flexShrink: 1 },
});

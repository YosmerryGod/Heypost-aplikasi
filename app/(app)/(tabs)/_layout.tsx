import { showToast } from "@/components/native-ui"; // [ADDED] Feedback visual HeyPost.
// [MODIFIED] Workspace header includes the HeyPost profile popup while preserving cashier search and cart actions.
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Appearance, DeviceEventEmitter, Dimensions, Easing, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView, useColorScheme } from "react-native"; // [MODIFIED] Tema berubah reaktif tanpa reload aplikasi.
import { Tabs, router, usePathname } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getTheme, type ThemeColors } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

function AppHeader() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // [MODIFIED] Palette dan style mengikuti Appearance tanpa memuat ulang halaman.
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
  // [ADDED] Dropdown outlet khusus menampilkan outlet yang masih aktif.
  const [outletPickerOpen, setOutletPickerOpen] = useState(false);
  // [ADDED] State dialog untuk mengubah nama toko.
  const [storeEditorOpen, setStoreEditorOpen] = useState(false);
  const [storeNameDraft, setStoreNameDraft] = useState("");
  // [ADDED] Tunda navigasi sampai native profile Modal selesai ditutup.
  const [pendingProfileRoute, setPendingProfileRoute] = useState<"/(app)/products" | "/(app)/settings" | "/(app)/reports" | "/(app)/account" | null>(null);
  const session = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setProfileOpen(false);
      router.replace("/login");
    },
    onError: (error) => showToast("Tidak bisa keluar", error.message, "info"),
  });
  const switchOutlet = trpc.store.switchOutlet.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setOutletPickerOpen(false);
      setProfileOpen(false);
    },
    onError: (error) => showToast("Gagal mengganti outlet", error.message, "error"),
  });
  // [ADDED] Simpan nama toko melalui endpoint store.updateProfile yang sudah tersedia.
  const updateStore = trpc.store.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setStoreEditorOpen(false);
      showToast("Berhasil", "Nama toko berhasil diperbarui.", "success");
    },
    onError: (error) => showToast("Gagal memperbarui toko", error.message, "error"),
  });
  const principal = session.data?.principal;
  const owner = principal?.role === "owner";
  const canEditStore = owner || principal?.permissions.includes("store.settings") === true;
  const store = session.data?.store;
  const outlets = session.data?.outlets ?? [];
  // [ADDED] Outlet nonaktif tidak pernah ditawarkan pada pemilih outlet.
  const activeOutlets = outlets.filter((outlet) => outlet.active);
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
  // [MODIFIED] Pemilih outlet menggunakan dropdown inline agar pilihan terlihat jelas dan konsisten.
  const openOutletPicker = () => {
    if (activeOutlets.length < 2 || switchOutlet.isPending) return;
    setOutletPickerOpen((open) => !open);
  };
  const chooseOutlet = (outletId: number) => {
    if (outletId === session.data?.activeOutletId || switchOutlet.isPending) return;
    switchOutlet.mutate({ outletId });
  };
  // [ADDED] Buka form dengan nama toko saat ini sebagai nilai awal.
  const openStoreEditor = () => {
    if (!canEditStore || updateStore.isPending) return;
    setStoreNameDraft(store?.name ?? "");
    setStoreEditorOpen(true);
  };
  const saveStoreName = () => {
    const name = storeNameDraft.trim();
    if (!name) {
      showToast("Nama toko wajib diisi", "Masukkan nama toko terlebih dahulu.", "error");
      return;
    }
    if (name.length > 100) {
      showToast("Nama terlalu panjang", "Nama toko maksimal 100 karakter.", "error");
      return;
    }
    if (name === store?.name) {
      setStoreEditorOpen(false);
      return;
    }
    updateStore.mutate({ name });
  };
  // [MODIFIED] Toggle tema tanpa toast; perubahan visual ditangani overlay transisi global.
  const toggleAppearance = () => {
    const nextScheme = colorScheme === "dark" ? "light" : "dark";
    DeviceEventEmitter.emit("heypost:theme-transition");
    Appearance.setColorScheme(nextScheme);
    void SecureStore.setItemAsync("heypost-color-scheme", nextScheme).catch((error) => {
      console.warn("[THEME] Gagal menyimpan preferensi tema:", error);
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.header}>
        {/* [MODIFIED] Logo, keranjang, dan profil disembunyikan saat mode pencarian aktif. */}
        {!searchVisible ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke kasir" onPress={() => router.replace("/(app)/(tabs)/cashier")}>
              <Text style={styles.brand}><Text style={styles.brandHey}>Hey</Text><Text style={styles.brandPost}>Post</Text></Text>
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cari" style={styles.headerButton} onPress={openSearch}>
                <Ionicons name="search-outline" size={25} color={colors.ink} />
              </Pressable>
              {!paymentActive ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Keranjang, ${cartCount} item`} style={styles.headerButton} onPress={() => DeviceEventEmitter.emit("heypost:open-cart")}>
                  <Ionicons name="bag-handle-outline" size={24} color={colors.ink} />
                  {cartCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text></View> : null}
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Buka menu profil" style={styles.profileHeaderButton} onPress={() => setProfileOpen(true)}>
                {/* [MODIFIED] Ikon profil hitam pada mode terang, putih pada mode gelap. */}
                <Ionicons name="person-outline" size={25} color={colors.ink} />
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
            <Ionicons name="search-outline" size={21} color={colors.muted} />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Cari produk..."
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={closeSearch} style={styles.searchCloseButton}>
              <Ionicons name="close" size={21} color={colors.muted} />
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
        <Pressable style={[styles.profileOverlay, { backgroundColor: colorScheme === "dark" ? "rgba(0,0,0,0.62)" : "rgba(16, 31, 24, 0.28)" }]} onPress={() => setProfileOpen(false)}>
          <Pressable style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.line }]} onPress={() => undefined}>
            <ScrollView style={styles.profileScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileContent}>
              <Text style={[styles.profileSectionTitle, { color: colors.muted }]}>AKUN</Text>
              <View style={styles.accountRow}>
                <View style={[styles.accountAvatar, { backgroundColor: colors.signalSoft }]} >
                  {principal?.avatarUrl ? <Image source={{ uri: principal.avatarUrl }} style={styles.accountAvatarImage} /> : <Ionicons name="person-outline" size={26} color={colors.signal} />}
                </View>
                <View style={styles.accountDetails}>
                  {/* [MODIFIED] Nama dan jabatan berada dalam satu baris; email tepat di bawahnya. */}
                  <View style={styles.accountNameLine}>
                    <Text style={[styles.accountName, { color: colors.ink }]} numberOfLines={1}>{principal?.name ?? "Memuat akun..."}</Text>
                    <Text style={[styles.roleBadge, { color: colors.muted, backgroundColor: colors.line }]}>{principal?.role === "owner" ? "Owner" : principal?.role === "manager" ? "Manager" : principal?.role === "kasir" ? "Kasir" : principal?.customTitle || "Karyawan"}</Text>
                  </View>
                  {principal?.email ? (
                    <View style={styles.accountEmailLine}>
                      <Ionicons name="mail-outline" size={14} color={colors.muted} />
                      <Text style={[styles.emailText, { color: colors.muted }]} numberOfLines={1}>{principal.email}</Text>
                    </View>
                  ) : null}
                </View>
                {/* [ADDED] Tombol tema dan pengaturan akun sejajar di kanan informasi pengguna. */}
                <View style={styles.accountActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={colorScheme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"} onPress={toggleAppearance} style={styles.accountActionButton}>
                    <Ionicons name={colorScheme === "dark" ? "sunny-outline" : "moon-outline"} size={19} color={colors.signal} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Buka pengaturan" onPress={() => { setPendingProfileRoute("/(app)/account"); setProfileOpen(false); }} style={styles.accountActionButton}>
                    <Ionicons name="settings-outline" size={19} color={colors.signal} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.profileDivider, { backgroundColor: colors.line }]} />

              <View style={styles.storeHeading}>
                <Text style={[styles.profileSectionTitle, { color: colors.muted }]}>TOKO</Text>
                {canEditStore ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Edit nama toko" disabled={updateStore.isPending} onPress={openStoreEditor} style={styles.editStoreButton}>
                    {/* [MODIFIED] Icon edit sekarang menjadi tombol yang membuka form nama toko. */}
                    <Ionicons name="create" size={18} color={colors.signal} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.storeNameRow}>
                <Ionicons name="storefront-outline" size={23} color={colors.signal} />
                <Text style={[styles.storeName, { color: colors.ink }]} numberOfLines={2}>{store?.name ?? "Memuat toko..."}</Text>
              </View>

              <View style={styles.outletHeading}>
                <Text style={[styles.profileSectionTitle, { color: colors.muted }]}>OUTLET</Text>
                <Text style={styles.currentLabel}>SAAT INI</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pilih outlet aktif"
                onPress={openOutletPicker}
                disabled={activeOutlets.length < 2 || switchOutlet.isPending}
                style={[styles.outletSelector, outletPickerOpen && styles.outletSelectorOpen]}
              >
                <View style={styles.outletSelectorText}>
                  <Text style={styles.outletName} numberOfLines={1}>{activeOutlet?.name ?? "Outlet belum tersedia"}</Text>
                  <Text style={styles.outletSelectorHint}>{activeOutlets.length === 0 ? "Tidak ada outlet aktif" : activeOutlets.length === 1 ? "1 outlet aktif" : `${activeOutlets.length} outlet aktif · Ketuk untuk mengganti`}</Text>
                </View>
                <Ionicons name={outletPickerOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.signal} />
              </Pressable>
              {/* [ADDED] Daftar pilihan outlet berbentuk panel, hanya memuat outlet aktif. */}
              {outletPickerOpen ? (
                <View style={styles.outletDropdown}>
                  <View style={styles.outletDropdownHeader}>
                    <Text style={styles.outletDropdownTitle}>Pilih outlet aktif</Text>
                    <Text style={styles.outletDropdownCount}>{activeOutlets.length}</Text>
                  </View>
                  {activeOutlets.map((outlet, index) => {
                    const selected = outlet.id === session.data?.activeOutletId;
                    return (
                      <Pressable
                        key={outlet.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Pilih outlet ${outlet.name}${selected ? ", sedang aktif" : ""}`}
                        accessibilityState={{ selected, disabled: selected || switchOutlet.isPending }}
                        disabled={selected || switchOutlet.isPending}
                        onPress={() => chooseOutlet(outlet.id)}
                        style={[styles.outletOption, index < activeOutlets.length - 1 && styles.outletOptionDivider, selected && styles.outletOptionSelected]}
                      >
                        <View style={[styles.outletOptionIcon, selected && styles.outletOptionIconSelected]}>
                          <Ionicons name="storefront-outline" size={18} color={selected ? colors.signal : colors.muted} />
                        </View>
                        <View style={styles.outletOptionInfo}>
                          <Text numberOfLines={1} style={[styles.outletOptionName, selected && styles.outletOptionNameSelected]}>{outlet.name}</Text>
                          <Text numberOfLines={1} style={styles.outletOptionAddress}>{outlet.address || "Outlet aktif"}</Text>
                        </View>
                        {selected ? <View style={styles.outletCurrentBadge}><Ionicons name="checkmark" size={12} color="#FFFFFF" /><Text style={styles.outletCurrentText}>Aktif</Text></View> : <Ionicons name="chevron-forward" size={16} color="#9AA59E" />}
                      </Pressable>
                    );
                  })}
                  {activeOutlets.length === 0 ? <Text style={styles.outletEmpty}>Belum ada outlet yang aktif.</Text> : null}
                </View>
              ) : null}

              <View style={[styles.profileDivider, { backgroundColor: colors.line }]} />

              <Text style={[styles.profileSectionTitle, { color: colors.muted }]}>MENU</Text>
              {/* [ADDED] These entries remain presentation-only while their old pages are intentionally being rebuilt. */}
              <View style={styles.profileMenuList}>
                {/* [MODIFIED] Produk membuka halaman manajemen katalog. */}
                {(owner || principal?.permissions.some((key) => ["menu.create", "menu.edit", "stock.edit"].includes(key)) ) ? <Pressable
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
                  <Ionicons name="cube-outline" size={22} color={colors.muted} />
                  <Text style={[styles.profileMenuLabel, { color: colors.ink }]}>Produk</Text>
                  <Ionicons name="chevron-forward" size={16} color="#7d8982" />
                </Pressable> : null}
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
                  <Ionicons name="settings-outline" size={20} color={colors.muted} />
                  <Text style={[styles.profileMenuLabel, { color: colors.ink }]}>Pengaturan</Text>
                  <Ionicons name="chevron-forward" size={16} color="#7d8982" />
                </Pressable>
                {/* [MODIFIED] Laporan membuka halaman analisis penjualan. */}
                {(owner || principal?.permissions.includes("reports.sales.view")) ? <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Buka halaman laporan"
                  onPress={() => {
                    setPendingProfileRoute("/(app)/reports");
                    setProfileOpen(false);
                  }}
                  style={styles.profileMenuItem}
                >
                  <Ionicons name="bar-chart-outline" size={20} color={colors.muted} />
                  <Text style={[styles.profileMenuLabel, { color: colors.ink }]}>Laporan</Text>
                  <Ionicons name="chevron-forward" size={16} color="#7d8982" />
                </Pressable> : null}
              </View>

            </ScrollView>
            {/* [ADDED] Fixed footer keeps the logout action visible without scrolling to the end of the menu. */}
            <View style={[styles.profileFooter, { backgroundColor: colors.surface }]}>
              <View style={[styles.profileDivider, { backgroundColor: colors.line }]} />
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
                <Ionicons name="log-out-outline" size={22} color={colors.danger} />
                <Text style={styles.logoutLabel}>{logout.isPending ? "Sedang keluar..." : "Keluar dari akun ini"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* [ADDED] Form edit nama toko dengan validasi dan penyimpanan ke backend. */}
      <Modal visible={storeEditorOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setStoreEditorOpen(false)}>
        <View style={styles.storeEditorOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStoreEditorOpen(false)} />
          <View style={styles.storeEditorCard}>
            <View style={styles.storeEditorHeading}>
              <View style={styles.storeEditorIcon}><Ionicons name="storefront-outline" size={21} color={colors.signal} /></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup edit nama toko" onPress={() => setStoreEditorOpen(false)} style={styles.storeEditorClose}>
                <Ionicons name="close" size={21} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.storeEditorTitle}>Edit nama toko</Text>
            <Text style={styles.storeEditorDescription}>Nama ini akan ditampilkan di profil dan informasi toko.</Text>
            <Text style={styles.storeEditorLabel}>Nama toko</Text>
            <TextInput autoFocus value={storeNameDraft} onChangeText={setStoreNameDraft} placeholder="Masukkan nama toko" placeholderTextColor="#87938C" maxLength={100} returnKeyType="done" onSubmitEditing={saveStoreName} editable={!updateStore.isPending} style={styles.storeEditorInput} />
            <Text style={styles.storeEditorCounter}>{storeNameDraft.trim().length}/100</Text>
            <View style={styles.storeEditorActions}>
              <Pressable accessibilityRole="button" disabled={updateStore.isPending} onPress={() => setStoreEditorOpen(false)} style={styles.storeEditorCancel}><Text style={styles.storeEditorCancelText}>Batal</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={updateStore.isPending} onPress={saveStoreName} style={[styles.storeEditorSave, updateStore.isPending && styles.storeEditorSaveDisabled]}>
                <Text style={styles.storeEditorSaveText}>{updateStore.isPending ? "Menyimpan..." : "Simpan perubahan"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        {/* [MODIFIED] Semua ikon bottom navigation mengikuti warna teks utama tema. */}
        <Ionicons name={name} size={22} color={colors.ink} />
        {focused ? <Text numberOfLines={1} style={styles.tabLabelActive}>{label}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function WorkspaceLayout() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        // [MODIFIED] Ikon dan label navigasi hitam pada light, putih pada dark.
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.ink,
        // [MODIFIED] Floating pill navigation with spacing above Android's system gesture area.
        // [MODIFIED] Sembunyikan navigasi Kasir/Riwayat saat halaman Produk dibuka dari profil.
        tabBarStyle: [styles.tabBar, { bottom: Math.max(insets.bottom, 8) + 12, backgroundColor: colors.surface, borderColor: colors.line }, pathname.endsWith("/products") && styles.tabBarHidden],
        tabBarItemStyle: styles.tabBarItem,
        sceneStyle: { backgroundColor: colors.ground },
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

// [MODIFIED] Gunakan token warna tema yang mengikuti mode terang/gelap pada seluruh komponen layar.
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerSafe: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  header: { minHeight: 60, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 27, letterSpacing: -1.7, fontFamily: "Archivo-ExtraBold" },
  brandHey: { color: colors.ink },
  brandPost: { color: colors.signal },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerButton: { width: 36, height: 42, alignItems: "center", justifyContent: "center", position: "relative" },
  // [ADDED] Header profile icon button.
  profileHeaderButton: { width: 48, height: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.signalSoft },
  cartBadge: { position: "absolute", top: 0, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: colors.signal },
  cartBadgeText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  // [ADDED] Search overlay menempati header dan berkembang dari titik tengah.
  searchModePlaceholder: { flex: 1, height: 42 },
  searchModalRoot: { flex: 1, backgroundColor: "transparent" },
  searchModalField: { position: "absolute", top: 8, left: 20, height: 44, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface, elevation: 8, shadowColor: "#000000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
  searchInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14, padding: 0 },
  searchCloseButton: { width: 30, height: 34, alignItems: "center", justifyContent: "center" },
  // [MODIFIED] Right-side drawer occupies 75% of the screen; tapping the remaining overlay closes it.
  profileOverlay: { flex: 1, flexDirection: "row", justifyContent: "flex-end", backgroundColor: "rgba(16, 31, 24, 0.28)" },
  profileCard: { width: "75%", height: "100%", maxHeight: "100%", flexDirection: "column", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderBottomLeftRadius: 24, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderLeftWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e3eae5", overflow: "hidden", elevation: 15, shadowColor: "#173d2e", shadowOffset: { width: -5, height: 0 }, shadowOpacity: 0.13, shadowRadius: 20 },
  // [ADDED] Scrollable menu body and permanently visible logout footer.
  profileScroll: { flex: 1 },
  profileFooter: { paddingHorizontal: 14, paddingBottom: 8, backgroundColor: colors.surface },
  // [MODIFIED] Keep content clear of the Android status bar and system navigation area.
  profileContent: { paddingHorizontal: 14, paddingTop: 24, paddingBottom: 8 },
  profileSectionTitle: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.1 },
  // [MODIFIED] Akun memakai baris horizontal: avatar, identitas, lalu dua tombol sejajar.
  accountRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12 },
  accountAvatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#e4f4eb", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  // [ADDED] Foto profil akun ditampilkan pada ringkasan popup.
  accountAvatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  accountDetails: { flex: 1, minWidth: 0, gap: 5 },
  accountNameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  accountName: { color: colors.ink, fontSize: 15, fontWeight: "800", letterSpacing: -0.4, flexShrink: 1 },
  roleBadge: { alignSelf: "flex-start", color: "#5f6c64", fontSize: 10, fontWeight: "700", backgroundColor: "#f1f5f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, overflow: "hidden" },
  // [ADDED] Email ditampilkan tepat di bawah nama dan jabatan.
  accountEmailLine: { flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
  emailText: { flex: 1, minWidth: 0, color: colors.muted, fontSize: 10 },
  // [ADDED] Tombol tema dan pengaturan berukuran sama dan sejajar horizontal.
  accountActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  accountActionButton: { width: 35, height: 35, borderRadius: 11, backgroundColor: "#eaf4ed", alignItems: "center", justifyContent: "center" },
  profileDivider: { height: 1, backgroundColor: "#dfe7e1", marginVertical: 12 },
  storeHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // [MODIFIED] Tombol ikon edit toko memakai bidang lembut tanpa garis kotak yang berat.
  editStoreButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eaf4ed", alignItems: "center", justifyContent: "center" },
  // [ADDED] Tampilan dialog penggantian nama toko.
  storeEditorOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 22, backgroundColor: "rgba(16, 31, 24, 0.42)" },
  storeEditorCard: { width: "100%", maxWidth: 420, padding: 20, borderRadius: 20, backgroundColor: colors.surface, elevation: 16, shadowColor: "#173d2e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 16 },
  storeEditorHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  storeEditorIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#eaf4ed" },
  storeEditorClose: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f6f4" },
  storeEditorTitle: { marginTop: 14, color: "#17221c", fontSize: 19, fontWeight: "800" },
  storeEditorDescription: { marginTop: 5, color: "#748078", fontSize: 12, lineHeight: 18 },
  storeEditorLabel: { marginTop: 18, marginBottom: 7, color: "#374151", fontSize: 12, fontWeight: "800" },
  storeEditorInput: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: "#dce5df", borderRadius: 11, color: "#17221c", fontSize: 14, backgroundColor: "#f8faf8" },
  storeEditorCounter: { marginTop: 5, color: "#87938c", fontSize: 10, textAlign: "right" },
  storeEditorActions: { flexDirection: "row", gap: 9, marginTop: 18 },
  storeEditorCancel: { minHeight: 44, minWidth: 78, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, borderRadius: 11, backgroundColor: "#f1f4f2" },
  storeEditorCancelText: { color: "#5e6a63", fontSize: 13, fontWeight: "700" },
  storeEditorSave: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.signal },
  storeEditorSaveDisabled: { opacity: 0.65 },
  storeEditorSaveText: { color: colors.surface, fontSize: 13, fontWeight: "800" },
  storeNameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7 },
  storeName: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: "800" },
  outletHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 6 },
  currentLabel: { color: colors.signal, fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  // [MODIFIED] Selector outlet menampilkan nama dan petunjuk dalam satu bidang ringkas.
  outletSelector: { minHeight: 54, borderWidth: 1, borderColor: "#dce5df", borderRadius: 12, backgroundColor: "#f5f8f6", paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  outletSelectorOpen: { borderColor: colors.signal, backgroundColor: "#f0f7f2" },
  outletSelectorText: { flex: 1, minWidth: 0, gap: 2 },
  outletName: { flex: 1, color: "#1b2821", fontSize: 14, fontWeight: "800" },
  outletSelectorHint: { color: "#829087", fontSize: 10, fontWeight: "600" },
  // [ADDED] Panel dropdown dengan baris pilihan, indikator outlet aktif, dan alamat.
  outletDropdown: { marginTop: 7, padding: 7, borderWidth: 1, borderColor: "#e0e8e2", borderRadius: 13, backgroundColor: colors.surface, elevation: 3, shadowColor: "#173d2e", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 7 },
  outletDropdownHeader: { minHeight: 29, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 7 },
  outletDropdownTitle: { color: "#7b8780", fontSize: 10, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  outletDropdownCount: { minWidth: 21, height: 21, borderRadius: 11, textAlign: "center", textAlignVertical: "center", overflow: "hidden", color: colors.signal, backgroundColor: "#eaf4ed", fontSize: 10, fontWeight: "800" },
  outletOption: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 6, paddingVertical: 7, borderRadius: 9 },
  outletOptionDivider: { borderBottomWidth: 1, borderBottomColor: "#edf1ee" },
  outletOptionSelected: { backgroundColor: "#f0f7f2" },
  outletOptionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f2f5f3", alignItems: "center", justifyContent: "center" },
  outletOptionIconSelected: { backgroundColor: "#dff1e6" },
  outletOptionInfo: { flex: 1, minWidth: 0, gap: 2 },
  outletOptionName: { color: "#354239", fontSize: 12, fontWeight: "700" },
  outletOptionNameSelected: { color: "#086b4a", fontWeight: "900" },
  outletOptionAddress: { color: "#87928b", fontSize: 10 },
  outletCurrentBadge: { minHeight: 22, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, borderRadius: 11, backgroundColor: colors.signal },
  outletCurrentText: { color: colors.surface, fontSize: 9, fontWeight: "800" },
  outletEmpty: { paddingHorizontal: 8, paddingVertical: 13, color: "#829087", fontSize: 11, textAlign: "center" },
  profileMenuList: { marginTop: 4, marginBottom: 0 },
  profileMenuItem: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10 },
  profileMenuLabel: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "700" },
  logoutButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10 },
  logoutLabel: { color: colors.danger, fontSize: 14, fontWeight: "800" },
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
    backgroundColor: colors.surface,
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
  tabButtonContentActive: { width: "92%", backgroundColor: colors.signalSoft },
  // [MODIFIED] Label tab aktif menggunakan warna teks utama, bukan warna aksen.
  tabLabelActive: { color: colors.ink, fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "800", flexShrink: 1 },
});

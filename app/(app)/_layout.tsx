function AppHeader() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  // [ADDED] Profile popover state and authenticated workspace data.
  const [profileOpen, setProfileOpen] = useState(false);
  const [outletPickerOpen, setOutletPickerOpen] = useState(false);
  // [ADDED] Defer profile navigation until the native modal has fully closed.
  const [pendingProfileRoute, setPendingProfileRoute] = useState<"/products" | "/settings" | "/reports" | null>(null);
  const account = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const profileData = account.data;
  const activeOutlet = profileData?.outlets.find((outlet) => outlet.id === profileData.activeOutletId);
  const role = profileData?.principal.role ?? "kasir";
  const canCreateMenu = role === "owner" || profileData?.principal.permissions.includes("menu.create") === true;
  const roleLabel = role === "owner" ? "Owner" : role === "manager" ? "Manager" : "Kasir";
  const switchOutlet = trpc.store.switchOutlet.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.auth.me.invalidate(), utils.pos.invalidate()]);
      setOutletPickerOpen(false);
      setProfileOpen(false);
    },
    onError: (error) => Alert.alert("Gagal mengganti outlet", error.message),
  });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setProfileOpen(false);
      router.replace("/login");
    },
    onError: (error) => Alert.alert("Gagal keluar", error.message),
  });

  useEffect(() => {
    const cartSubscription = DeviceEventEmitter.addListener("heypost:cart-count", (count: number) => setCartCount(count));
    const clearSubscription = DeviceEventEmitter.addListener("heypost:clear-search", () => {
      setSearch("");
      setSearchOpen(false);
      DeviceEventEmitter.emit("heypost:search-query", "");
    });
    return () => {
      cartSubscription.remove();
      clearSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    DeviceEventEmitter.emit("heypost:search-query", search);
  }, [search, searchOpen]);

  useEffect(() => {
    setSearch("");
    setSearchOpen(false);
    DeviceEventEmitter.emit("heypost:search-query", "");
  }, [pathname]);

  // [ADDED] Navigate only after React Native finishes dismissing the profile Modal.
  useEffect(() => {
    if (profileOpen || !pendingProfileRoute) return;
    router.push(pendingProfileRoute);
    setPendingProfileRoute(null);
  }, [profileOpen, pendingProfileRoute]);

  const searchPlaceholder = pathname.includes("products") ? "Cari produk..." : "Cari menu...";
  // [ADDED] Product management uses the compact page header from the supplied reference.
  const isProductsPage = pathname.endsWith("/products");

  return (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.header}>
        {isProductsPage ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali" style={styles.pageHeaderBack} onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(app)/cashier"); }}>
            <Ionicons name="arrow-back" size={25} color={theme.colors.ink} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke kasir" onPress={() => router.replace("/(app)/cashier")}>
            <Text style={styles.brand}><Text style={styles.brandHey}>hey</Text><Text style={styles.brandPost}>post.</Text></Text>
          </Pressable>
        )}
        {isProductsPage ? <Text style={styles.pageHeaderTitle}>Menu</Text> : null}
        <View style={[styles.headerActions, isProductsPage && styles.pageHeaderActions]}>
          {searchOpen ? (
            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={19} color={theme.colors.muted} />
              <TextInput
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.colors.muted}
                returnKeyType="search"
                style={styles.searchInput}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={() => { setSearch(""); setSearchOpen(false); DeviceEventEmitter.emit("heypost:search-query", ""); }}>
                <Ionicons name="close-circle" size={19} color={theme.colors.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Cari" style={styles.headerButton} onPress={() => setSearchOpen(true)}>
              <Ionicons name="search-outline" size={25} color={theme.colors.ink} />
            </Pressable>
          )}
          {isProductsPage ? (
            canCreateMenu ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Tambah produk" style={styles.addProductHeaderButton} onPress={() => DeviceEventEmitter.emit("heypost:products-add")}>
                <Ionicons name="add" size={29} color="#ffffff" />
              </Pressable>
            ) : null
          ) : (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={`Keranjang, ${cartCount} item`} style={styles.headerButton} onPress={() => DeviceEventEmitter.emit("heypost:open-cart")}>
                <Ionicons name="bag-handle-outline" size={24} color={theme.colors.ink} />
                {cartCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text></View> : null}
              </Pressable>
              {/* [ADDED] Profile icon opens the account/store popover shown in the HeyPost reference. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka menu akun"
                accessibilityState={{ expanded: profileOpen }}
                style={[styles.headerButton, profileOpen && styles.headerButtonActive]}
                onPress={() => { setProfileOpen((open) => !open); setOutletPickerOpen(false); }}
              >
                <Ionicons name="person-outline" size={24} color={profileOpen ? theme.colors.signal : theme.colors.ink} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* [ADDED] Account popover: profile, store, outlet switcher, shortcuts, and sign-out. */}
      <Modal visible={profileOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setProfileOpen(false)}>
        <View style={styles.profileOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup menu akun" style={StyleSheet.absoluteFill} onPress={() => setProfileOpen(false)} />
          <View style={[styles.profileCard, { marginTop: insets.top + 62 }]}>
            <Text style={styles.profileSectionLabel}>AKUN</Text>
            <View style={styles.profileAccountRow}>
              <View style={styles.profileAvatar}><Ionicons name="person-outline" size={25} color={theme.colors.signal} /></View>
              <View style={styles.profileAccountCopy}>
                <Text numberOfLines={1} style={styles.profileName}>{profileData?.principal.name ?? (account.isLoading ? "Memuat akun..." : "Akun")}</Text>
                <Text style={styles.profileRole}>{roleLabel}</Text>
              </View>
            </View>
            <View style={styles.profileEmailRow}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.muted} />
              <Text numberOfLines={1} style={styles.profileEmail}>{profileData?.principal.email ?? "Email tidak tersedia"}</Text>
            </View>

            <View style={styles.profileDivider} />
            <View style={styles.profileSectionHeader}>
              <Text style={styles.profileSectionLabel}>TOKO</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Edit informasi toko" style={styles.profileEditButton} onPress={() => { setProfileOpen(false); router.push("/outlets"); }}>
                <Ionicons name="pencil-outline" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
            <View style={styles.profileStoreRow}>
              <Ionicons name="storefront-outline" size={25} color={theme.colors.signal} />
              <Text numberOfLines={2} style={styles.profileStoreName}>{profileData?.store.name ?? "Toko"}</Text>
            </View>

            <View style={styles.profileOutletHeader}>
              <Text style={styles.profileSectionLabel}>OUTLET</Text>
              <Text style={styles.profileCurrentLabel}>SAAT INI</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: outletPickerOpen }} style={styles.profileOutletSelect} onPress={() => setOutletPickerOpen((open) => !open)}>
              <Text numberOfLines={1} style={styles.profileOutletText}>{activeOutlet?.name ?? "Pilih outlet"}</Text>
              <Ionicons name={outletPickerOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.ink} />
            </Pressable>
            {outletPickerOpen ? (
              <View style={styles.profileOutletOptions}>
                {(profileData?.outlets ?? []).filter((outlet) => outlet.active).map((outlet) => (
                  <Pressable key={outlet.id} disabled={switchOutlet.isPending || outlet.id === profileData?.activeOutletId} onPress={() => switchOutlet.mutate({ outletId: outlet.id })} style={styles.profileOutletOption}>
                    <Text numberOfLines={1} style={[styles.profileOutletOptionText, outlet.id === profileData?.activeOutletId && styles.profileOutletOptionActive]}>{outlet.name}</Text>
                    {outlet.id === profileData?.activeOutletId ? <Ionicons name="checkmark" size={18} color={theme.colors.signal} /> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.profileDivider} />
            <Text style={styles.profileSectionLabel}>MENU</Text>
            <View style={styles.profileMenuList}>
              {[
                // [MODIFIED] Keep the product catalog accessible from the profile menu for every signed-in role.
                // [MODIFIED] Use the canonical product URL shared with the Settings shortcut.
                { title: "Produk", icon: "cube-outline" as const, route: "/products" as const, visible: true },
                { title: "Pengaturan", icon: "settings-outline" as const, route: "/settings" as const, visible: true },
                { title: "Laporan", icon: "stats-chart-outline" as const, route: "/reports" as const, visible: role === "owner" || role === "manager" },
              ].filter((item) => item.visible).map((item) => (
                <Pressable key={item.title} accessibilityRole="button" style={styles.profileMenuItem} onPress={() => {
                  // [MODIFIED] Queue navigation; dispatch it after the native profile Modal closes.
                  setPendingProfileRoute(item.route);
                  setProfileOpen(false);
                }}>
                  <Ionicons name={item.icon} size={23} color={theme.colors.muted} />
                  <Text style={styles.profileMenuText}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
                </Pressable>
              ))}
            </View>
            <View style={styles.profileDivider} />
            <Pressable accessibilityRole="button" disabled={logout.isPending} style={styles.profileLogout} onPress={() => Alert.alert("Keluar dari HeyPost?", "Anda perlu masuk kembali untuk menggunakan aplikasi.", [{ text: "Batal", style: "cancel" }, { text: "Keluar", style: "destructive", onPress: () => logout.mutate() }])}>
              <Ionicons name="log-out-outline" size={23} color={theme.colors.danger} />
              <Text style={styles.profileLogoutText}>{logout.isPending ? "Keluar..." : "Keluar"}</Text>
            </Pressable>
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
        tabBarStyle: [styles.tabBar, { bottom: Math.max(insets.bottom, 8) + 12 }],
        tabBarItemStyle: styles.tabBarItem,
        sceneStyle: { backgroundColor: theme.colors.ground },
      }}
    >
      <Tabs.Screen
        name="cashier"
        options={{
          title: "Kasir",
          // [MODIFIED] Pass route-derived active state explicitly so the selected label always renders.
          tabBarButton: (props) => <FloatingTabButton {...props} focused={cashierFocused} name="bag-handle-outline" label="Kasir" />,
          href: can("pos.access") ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Riwayat Harian",
          // [MODIFIED] Pass route-derived active state explicitly so the selected label always renders.
          tabBarButton: (props) => <FloatingTabButton {...props} focused={historyFocused} name="receipt-outline" label="Riwayat Harian" />,
          href: can("history.daily.view") ? undefined : null,
        }}
      />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerSafe: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  // [ADDED] Profile action visual state and anchored account card layout.
  headerButtonActive: { borderRadius: 13, backgroundColor: theme.colors.signalSoft },
  profileOverlay: { flex: 1, backgroundColor: "rgba(17, 35, 27, 0.10)", paddingHorizontal: 12 },
  profileCard: { width: "100%", maxWidth: 560, maxHeight: "84%", alignSelf: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderRadius: 25, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: "#ffffff", elevation: 14, shadowColor: "#163b2b", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18 },
  profileSectionLabel: { color: "#7b8981", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  profileAccountRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 17 },
  profileAvatar: { width: 66, height: 66, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signalSoft },
  profileAccountCopy: { flex: 1, minWidth: 0, gap: 7 },
  profileName: { color: theme.colors.ink, fontSize: 20, fontWeight: "800" },
  profileRole: { alignSelf: "flex-start", color: theme.colors.muted, fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.colors.ground, overflow: "hidden" },
  profileEmailRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, marginBottom: 18, paddingLeft: 82 },
  profileEmail: { flex: 1, minWidth: 0, color: theme.colors.muted, fontSize: 14 },
  profileDivider: { height: 1, backgroundColor: theme.colors.line, marginVertical: 15 },
  profileSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileEditButton: { width: 48, height: 48, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.line, alignItems: "center", justifyContent: "center" },
  profileStoreRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 14, marginBottom: 20 },
  profileStoreName: { flex: 1, color: theme.colors.ink, fontSize: 17, fontWeight: "800" },
  profileOutletHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  profileCurrentLabel: { color: theme.colors.signal, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  profileOutletSelect: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.ground },
  profileOutletText: { flex: 1, color: theme.colors.ink, fontSize: 15, fontWeight: "700" },
  profileOutletOptions: { marginTop: 7, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, overflow: "hidden" },
  profileOutletOption: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  profileOutletOptionText: { flex: 1, color: theme.colors.muted, fontSize: 13, fontWeight: "600" },
  profileOutletOptionActive: { color: theme.colors.signal, fontWeight: "800" },
  profileMenuList: { marginTop: 7 },
  profileMenuItem: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 12 },
  profileMenuText: { flex: 1, color: "#59665f", fontSize: 16, fontWeight: "700" },
  profileLogout: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 15, paddingHorizontal: 12 },
  profileLogoutText: { color: theme.colors.danger, fontSize: 16, fontWeight: "800" },
  // [MODIFIED] Product header matches the compact back-title-search-add arrangement in the reference.
  header: { minHeight: 60, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageHeaderBack: { width: 42, height: 48, alignItems: "flex-start", justifyContent: "center" },
  pageHeaderTitle: { flex: 1, color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 21, fontWeight: "800" },
  pageHeaderActions: { gap: 16 },
  addProductHeaderButton: { width: 54, height: 54, borderRadius: 15, backgroundColor: theme.colors.signal, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 27, letterSpacing: -1.7, fontFamily: "Archivo-ExtraBold" },
  brandHey: { color: theme.colors.ink },
  brandPost: { color: theme.colors.signal },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 13 },
  headerButton: { width: 36, height: 42, alignItems: "center", justifyContent: "center", position: "relative" },
  cartBadge: { position: "absolute", top: 0, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signal },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  searchField: { width: 150, height: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 10, backgroundColor: theme.colors.ground },
  searchInput: { flex: 1, minWidth: 0, color: theme.colors.ink, fontSize: 13, padding: 0 },
  // [MODIFIED] Floating bar uses symmetric edges; each tab owns its complete icon-label layout.
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
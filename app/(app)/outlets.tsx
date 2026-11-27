// [ADDED] Halaman daftar outlet mengikuti referensi visual dari pengguna.
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/providers/trpc";

type OutletTimezone = "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura";
type Outlet = { id: number; name: string; address: string | null; whatsappNumber: string | null; whatsappUseMain?: boolean; openingTime?: string | null; closingTime?: string | null; timezone?: OutletTimezone | null; active: boolean };

// [ADDED] Perkiraan zona waktu dari kota/provinsi pada alamat outlet.
const detectOutletTimezone = (address: string): OutletTimezone => {
  const value = address.toLocaleLowerCase("id-ID");
  const wit = ["papua", "papua barat", "papua selatan", "papua tengah", "papua pegunungan", "papua barat daya", "maluku", "maluku utara"];
  const wib = ["aceh", "sumatera", "medan", "padang", "pekanbaru", "jambi", "bengkulu", "palembang", "lampung", "bangka", "belitung", "jakarta", "banten", "bandung", "jawa barat", "jawa tengah", "yogyakarta", "jawa timur", "kalimantan barat", "kalimantan tengah"];
  if (wit.some((name) => value.includes(name))) return "Asia/Jayapura";
  if (wib.some((name) => value.includes(name))) return "Asia/Jakarta";
  return "Asia/Makassar";
};
const timezoneOptions: { label: string; value: OutletTimezone; detail: string }[] = [
  { label: "WIB", value: "Asia/Jakarta", detail: "UTC+7 · Sumatera, Jawa, Kalimantan Barat & Tengah" },
  { label: "WITA", value: "Asia/Makassar", detail: "UTC+8 · Bali, Nusa Tenggara, Sulawesi, Kalimantan lainnya" },
  { label: "WIT", value: "Asia/Jayapura", detail: "UTC+9 · Maluku & Papua" },
];

export default function OutletsScreen() {
  const utils = trpc.useUtils();
  const session = trpc.auth.me.useQuery();
  const outlets = (session.data?.outlets ?? []) as Outlet[];
  const activeOutletId = session.data?.activeOutletId;
  // [ADDED] Ringkasan jumlah outlet berdasarkan status aktif/nonaktif dari backend.
  const openOutletCount = outlets.filter((outlet) => outlet.active).length;
  const closedOutletCount = outlets.length - openOutletCount;
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [editorOpen, setEditorOpen] = useState(false);
  // [ADDED] Memilih outlet sumber untuk menyalin kategori dan menu saat outlet baru dibuat.
  const [copyMenuFromOutletId, setCopyMenuFromOutletId] = useState<number | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  // [ADDED] Outlet tujuan yang sedang dipilih untuk mengganti seluruh menu.
  const [syncTargetOutlet, setSyncTargetOutlet] = useState<Outlet | null>(null);
  // [ADDED] Toast ringkas untuk hasil aksi tanpa dialog native yang mengganggu alur.
  const [toast, setToast] = useState<{ title: string; message: string; type: "success" | "error" } | null>(null);
  const showToast = (title: string, message: string, type: "success" | "error" = "success") => setToast({ title, message, type });
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timeout);
  }, [toast]);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappUseMain, setWhatsappUseMain] = useState(false);
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [timezone, setTimezone] = useState<"Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura">("Asia/Makassar");
  const [timezoneMode, setTimezoneMode] = useState<"auto" | "manual">("auto");
  const detectedTimezone = detectOutletTimezone(address);
  const selectedTimezone = timezoneMode === "auto" ? detectedTimezone : timezone;
  const mainOutlet = [...outlets].sort((a, b) => a.id - b.id)[0] ?? null;
  const switchOutlet = trpc.store.switchOutlet.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); showToast("Outlet berhasil dibuka", "Data kasir menggunakan outlet yang dipilih."); },
    onError: (error) => showToast("Gagal membuka outlet", error.message, "error"),
  });
  const createOutlet = trpc.store.createOutlet.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); setEditorOpen(false); showToast("Outlet ditambahkan", "Outlet baru berhasil dibuat."); },
    onError: (error) => showToast("Gagal menambahkan outlet", error.message, "error"),
  });
  const updateOutlet = trpc.store.updateOutlet.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); setEditorOpen(false); showToast("Outlet diperbarui", "Perubahan outlet berhasil disimpan."); },
    onError: (error) => showToast("Gagal memperbarui outlet", error.message, "error"),
  });
  // [ADDED] Mutasi khusus status agar tombol aktif/nonaktif tidak menutup editor atau memunculkan dialog berulang.
  const toggleOutletStatus = trpc.store.updateOutlet.useMutation({
    onSuccess: async (_result, variables) => {
      await utils.auth.me.invalidate();
      showToast(variables.active ? "Outlet dibuka" : "Outlet ditutup", variables.active ? "Status outlet sekarang aktif." : "Status outlet sekarang nonaktif.");
    },
    onError: (error) => {
      void utils.auth.me.invalidate();
      showToast("Status outlet gagal diubah", error.message, "error");
    },
  });
  // [ADDED] Sinkronisasi katalog dijalankan di backend dalam satu transaksi.
  const syncOutletMenu = trpc.store.syncOutletMenu.useMutation({
    onSuccess: async (result) => {
      await Promise.all([utils.auth.me.invalidate(), utils.pos.listProducts.invalidate(), utils.pos.bootstrap.invalidate()]);
      setSyncTargetOutlet(null);
      showToast("Menu berhasil disinkronkan", `${result.copiedProducts} produk dan ${result.copiedCategories} kategori berhasil disalin.`);
    },
    onError: (error) => showToast("Sinkronisasi gagal", error.message, "error"),
  });
  const confirmSyncOutletMenu = (sourceOutletId: number) => {
    if (!syncTargetOutlet) return;
    const target = syncTargetOutlet;
    Alert.alert(
      "Ganti seluruh menu outlet?",
      `Menu di outlet “${target.name}” akan diganti dengan menu dari “${outlets.find((item) => item.id === sourceOutletId)?.name ?? "outlet sumber"}”. Produk lama dinonaktifkan agar riwayat transaksi tetap aman.`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Ganti menu", style: "destructive", onPress: () => syncOutletMenu.mutate({ targetOutletId: target.id, sourceOutletId }) },
      ],
    );
  };
  const visibleOutlets = useMemo(() => outlets.filter((outlet) => {
    const matchesSearch = `${outlet.name} ${outlet.address ?? ""}`.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID"));
    const matchesFilter = filter === "Semua" || (filter === "Aktif" ? outlet.active : !outlet.active);
    return matchesSearch && matchesFilter;
  }), [outlets, search, filter]);

  const openEditor = (outlet?: Outlet) => {
    setEditing(outlet ?? null);
    setCopyMenuFromOutletId(null);
    setName(outlet?.name ?? "");
    setAddress(outlet?.address ?? "");
    setWhatsapp(outlet?.whatsappNumber ?? "");
    setWhatsappUseMain(outlet?.whatsappUseMain ?? false);
    setOpeningTime(outlet?.openingTime ?? "08:00");
    setClosingTime(outlet?.closingTime ?? "22:00");
    setTimezone(outlet?.timezone ?? "Asia/Makassar");
    setTimezoneMode(outlet?.timezone ? "manual" : "auto");
    setEditorOpen(true);
  };
  const saveOutlet = () => {
    if (!name.trim()) { showToast("Nama outlet wajib diisi", "Masukkan nama sebelum menyimpan.", "error"); return; }
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(openingTime) || !timePattern.test(closingTime)) { showToast("Jam operasional tidak valid", "Gunakan format 24 jam, contoh 08:00.", "error"); return; }
    if (editing) updateOutlet.mutate({ id: editing.id, name: name.trim(), address: address.trim() || null, whatsappNumber: whatsappUseMain ? null : (whatsapp.trim() || null), whatsappUseMain, openingTime, closingTime, timezone: selectedTimezone });
    else createOutlet.mutate({ name: name.trim(), address: address.trim() || undefined, whatsappNumber: whatsappUseMain ? null : (whatsapp.trim() || null), whatsappUseMain, openingTime, closingTime, timezone: selectedTimezone, ...(copyMenuFromOutletId ? { copyMenuFromOutletId } : {}) });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.headerIcon}><Ionicons name="arrow-back" size={22} color="#53635B" /></Pressable>
        {/* [MODIFIED] Nama halaman cukup ditampilkan di header. */}
        <Text style={styles.headerTitle}>Outlet</Text>
        <View style={styles.spacer} />
        <Pressable accessibilityRole="button" accessibilityLabel="Cari outlet" onPress={() => setSearchOpen((value) => !value)} style={styles.headerIcon}><Ionicons name="search-outline" size={22} color="#53635B" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter outlet" onPress={() => setFilterOpen(true)} style={styles.headerIcon}><Ionicons name="filter-outline" size={22} color="#53635B" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tambah outlet" onPress={() => openEditor()} style={styles.addButton}><Ionicons name="add" size={24} color="#FFFFFF" /></Pressable>
      </View>
      {searchOpen ? <View style={styles.searchBar}><Ionicons name="search-outline" size={19} color="#6B7971" /><TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Cari nama atau alamat outlet" placeholderTextColor="#87938C" style={styles.searchInput} /><Pressable onPress={() => { setSearch(""); setSearchOpen(false); }}><Ionicons name="close" size={20} color="#53635B" /></Pressable></View> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* [ADDED] Ringkasan outlet dibagi menjadi buka, tutup, dan total. */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}><View style={styles.statusDotOpen} /><Text style={styles.summaryLabel}>Outlet buka</Text></View>
            <Text style={styles.summaryValue}>{session.isLoading ? "—" : openOutletCount}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}><View style={styles.statusDotClosed} /><Text style={styles.summaryLabel}>Outlet tutup</Text></View>
            <Text style={styles.summaryValue}>{session.isLoading ? "—" : closedOutletCount}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total outlet</Text>
            <Text style={styles.summaryValue}>{session.isLoading ? "—" : outlets.length}</Text>
          </View>
        </View>
        {session.isLoading ? <Text style={styles.message}>Memuat outlet...</Text> : null}
        {session.error ? <Text style={styles.error}>{session.error.message}</Text> : null}
        <View style={styles.listCard}>
          {visibleOutlets.map((outlet, index) => {
            const isCurrent = outlet.id === activeOutletId;
            return (
              <View key={outlet.id} style={[styles.outletRow, index !== visibleOutlets.length - 1 && styles.rowBorder]}>
                <View style={styles.outletIcon}><Ionicons name="business-outline" size={22} color="#087B58" /></View>
                <View style={styles.outletContent}>
                  <View style={styles.nameLine}>
                    <Text style={styles.outletName}>{outlet.name}</Text>
                    {isCurrent ? <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Outlet aktif</Text></View> : null}
                  </View>
                  <Text numberOfLines={1} style={styles.address}>{outlet.address?.trim() || "Alamat belum diisi"}</Text>
                  <Text style={styles.hours}><Ionicons name="time-outline" size={12} color="#68746D" />  {outlet.openingTime || "08:00"}–{outlet.closingTime || "22:00"} · {timezoneOptions.find((item) => item.value === (outlet.timezone || "Asia/Makassar"))?.label ?? "WITA"}</Text>
                </View>
                <View style={styles.rowActions}>
                  {/* [MODIFIED] Ikon edit disamakan dengan halaman Produk tanpa kotak/border tambahan. */}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${outlet.name}`} onPress={() => openEditor(outlet)} style={styles.editButton}><Ionicons name="create-outline" size={21} color="#56645D" /></Pressable>
                  {/* [MODIFIED] Ikon sinkronisasi memakai simbol kotak produk dengan panah melingkar. */}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Sinkronkan menu produk untuk ${outlet.name}`} onPress={() => setSyncTargetOutlet(outlet)} disabled={syncOutletMenu.isPending} style={styles.syncButton}>
                    <View style={styles.syncIcon}>
                      <Ionicons name="cube-outline" size={18} color="#087B58" />
                      <View style={styles.syncIconBadge}><Ionicons name="refresh" size={9} color="#087B58" /></View>
                    </View>
                  </Pressable>
                  <Switch
                    value={outlet.active}
                    onValueChange={(active) => toggleOutletStatus.mutate({ id: outlet.id, active })}
                    disabled={toggleOutletStatus.isPending}
                    accessibilityLabel={outlet.active ? `Tutup outlet ${outlet.name}` : `Buka outlet ${outlet.name}`}
                    accessibilityHint="Ubah status operasional outlet"
                    trackColor={{ false: "#D8DEDA", true: "#16835E" }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D8DEDA"
                    style={styles.statusSwitch}
                  />
                </View>
              </View>
            );
          })}
          {!session.isLoading && visibleOutlets.length === 0 ? <Text style={styles.message}>Outlet tidak ditemukan.</Text> : null}
        </View>
      </ScrollView>

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)}>
          <View style={styles.filterCard}>
            <Text style={styles.modalTitle}>Filter outlet</Text>
            {(["Semua", "Aktif", "Nonaktif"] as const).map((value) => <Pressable key={value} onPress={() => { setFilter(value); setFilterOpen(false); }} style={styles.filterOption}><Text style={styles.filterText}>{value}</Text>{filter === value ? <Ionicons name="checkmark" size={20} color="#087B58" /> : null}</Pressable>)}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={sourcePickerOpen} transparent animationType="fade" onRequestClose={() => setSourcePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSourcePickerOpen(false)}>
          <View style={styles.filterCard}>
            <Text style={styles.modalTitle}>Pilih outlet sumber</Text>
            <Pressable onPress={() => { setCopyMenuFromOutletId(null); setSourcePickerOpen(false); }} style={styles.filterOption}><Text style={styles.filterText}>Jangan salin menu</Text>{copyMenuFromOutletId === null ? <Ionicons name="checkmark" size={20} color="#087B58" /> : null}</Pressable>
            {outlets.map((source) => <Pressable key={source.id} onPress={() => { setCopyMenuFromOutletId(source.id); setSourcePickerOpen(false); }} style={styles.filterOption}><View style={styles.sourceOptionText}><Text style={styles.filterText}>{source.name}</Text><Text style={styles.sourceOptionMeta}>{source.active ? "Aktif" : "Nonaktif"}</Text></View>{copyMenuFromOutletId === source.id ? <Ionicons name="checkmark" size={20} color="#087B58" /> : null}</Pressable>)}
          </View>
        </Pressable>
      </Modal>

      {/* [ADDED] Pilih outlet sumber sebelum konfirmasi penggantian katalog tujuan. */}
      <Modal visible={syncTargetOutlet !== null} transparent animationType="fade" onRequestClose={() => setSyncTargetOutlet(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSyncTargetOutlet(null)}>
          <View style={styles.filterCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.modalTitle}>Sinkronkan menu produk</Text>
              <Pressable onPress={() => setSyncTargetOutlet(null)}><Ionicons name="close" size={22} color="#53635B" /></Pressable>
            </View>
            <Text style={styles.syncDescription}>Pilih outlet sumber. Seluruh menu di outlet {syncTargetOutlet?.name ?? "tujuan"} akan diganti.</Text>
            {outlets.filter((source) => source.id !== syncTargetOutlet?.id).map((source) => (
              <Pressable key={source.id} onPress={() => confirmSyncOutletMenu(source.id)} style={styles.filterOption}>
                <View style={styles.sourceOptionText}>
                  <Text style={styles.filterText}>{source.name}</Text>
                  <Text style={styles.sourceOptionMeta}>{source.active ? "Outlet aktif" : "Outlet nonaktif"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#68746D" />
              </Pressable>
            ))}
            {outlets.filter((source) => source.id !== syncTargetOutlet?.id).length === 0 ? (
              <View style={styles.emptySource}>
                <View style={styles.emptySourceIcon}><Ionicons name="git-compare-outline" size={22} color="#087B58" /></View>
                <Text style={styles.emptySourceTitle}>Belum ada outlet lain</Text>
                <Text style={styles.emptySourceText}>Tambahkan outlet terlebih dahulu untuk menyalin menu dari outlet sumber.</Text>
                <Pressable onPress={() => setSyncTargetOutlet(null)} style={styles.emptySourceButton}><Text style={styles.emptySourceButtonText}>Mengerti</Text></Pressable>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}><Text style={styles.modalTitle}>{editing ? "Edit outlet" : "Tambah outlet"}</Text><Pressable onPress={() => setEditorOpen(false)}><Ionicons name="close" size={24} color="#53635B" /></Pressable></View>
            <Text style={styles.fieldLabel}>Nama outlet</Text><TextInput value={name} onChangeText={setName} placeholder="Nama outlet" style={styles.input} />
            <Text style={styles.fieldLabel}>Alamat</Text><TextInput value={address} onChangeText={setAddress} placeholder="Alamat outlet" style={styles.input} />
            <Text style={styles.fieldLabel}>Jam operasional</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}><Text style={styles.timeCaption}>Jam buka</Text><TextInput value={openingTime} onChangeText={setOpeningTime} keyboardType="numbers-and-punctuation" placeholder="08:00" maxLength={5} style={styles.input} /></View>
              <View style={styles.timeField}><Text style={styles.timeCaption}>Jam tutup</Text><TextInput value={closingTime} onChangeText={setClosingTime} keyboardType="numbers-and-punctuation" placeholder="22:00" maxLength={5} style={styles.input} /></View>
            </View>
            <Text style={styles.fieldLabel}>Zona waktu outlet</Text>
            <View style={styles.timezoneModeRow}>
              <Pressable onPress={() => setTimezoneMode("auto")} style={[styles.timezoneModeButton, timezoneMode === "auto" && styles.timezoneModeSelected]}><Ionicons name="navigate-outline" size={15} color={timezoneMode === "auto" ? "#087B58" : "#68746D"} /><Text style={[styles.timezoneModeText, timezoneMode === "auto" && styles.timezoneModeTextSelected]}>Otomatis dari alamat</Text></Pressable>
              <Pressable onPress={() => setTimezoneMode("manual")} style={[styles.timezoneModeButton, timezoneMode === "manual" && styles.timezoneModeSelected]}><Ionicons name="options-outline" size={15} color={timezoneMode === "manual" ? "#087B58" : "#68746D"} /><Text style={[styles.timezoneModeText, timezoneMode === "manual" && styles.timezoneModeTextSelected]}>Pilih manual</Text></Pressable>
            </View>
            {timezoneMode === "auto" ? <Text style={styles.timezoneHint}>Terdeteksi: {timezoneOptions.find((item) => item.value === detectedTimezone)?.label} berdasarkan alamat yang diisi. Periksa kembali hasil deteksi.</Text> : <View style={styles.timezoneChoices}>{timezoneOptions.map((item) => <Pressable key={item.value} onPress={() => setTimezone(item.value)} style={[styles.timezoneChoice, timezone === item.value && styles.timezoneChoiceSelected]}><View style={styles.timezoneChoiceTop}><Text style={styles.timezoneChoiceLabel}>{item.label}</Text>{timezone === item.value ? <Ionicons name="checkmark-circle" size={17} color="#087B58" /> : null}</View><Text style={styles.timezoneChoiceDetail}>{item.detail}</Text></Pressable>)}</View>}
            <Text style={styles.fieldLabel}>WhatsApp outlet</Text>
            {mainOutlet && (!editing || editing.id !== mainOutlet.id) ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: whatsappUseMain }} onPress={() => setWhatsappUseMain((value) => !value)} style={styles.mainWhatsappOption}><Ionicons name={whatsappUseMain ? "checkbox" : "square-outline"} size={21} color={whatsappUseMain ? "#087B58" : "#68746D"} /><View style={styles.mainWhatsappText}><Text style={styles.mainWhatsappTitle}>Gunakan nomor outlet utama</Text><Text style={styles.mainWhatsappHint}>{mainOutlet.whatsappNumber || "Nomor outlet utama belum diisi"}</Text></View></Pressable> : null}
            {!whatsappUseMain ? <TextInput value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="Nomor WhatsApp" style={styles.input} /> : null}
            {!editing && outlets.length > 0 ? <>
              <Text style={styles.fieldLabel}>Salin menu dari outlet</Text>
              <Pressable accessibilityRole="button" onPress={() => setSourcePickerOpen(true)} style={styles.sourcePicker}>
                <View style={styles.sourcePickerText}><Ionicons name="copy-outline" size={17} color="#087B58" /><Text numberOfLines={1} style={styles.sourcePickerLabel}>{copyMenuFromOutletId ? outlets.find((item) => item.id === copyMenuFromOutletId)?.name : "Pilih outlet sumber (opsional)"}</Text></View>
                <Ionicons name="chevron-down" size={18} color="#68746D" />
              </Pressable>
              <Text style={styles.timezoneHint}>Kategori, menu, harga, stok, dan foto akan disalin dari outlet yang dipilih.</Text>
            </> : null}
            <Pressable accessibilityRole="button" onPress={saveOutlet} disabled={createOutlet.isPending || updateOutlet.isPending} style={styles.saveButton}><Text style={styles.saveButtonText}>{createOutlet.isPending || updateOutlet.isPending ? "Menyimpan..." : "Simpan outlet"}</Text></Pressable>
          </View>
        </View>
      </Modal>
      {/* [ADDED] Toast status konsisten untuk sukses dan kegagalan aksi outlet. */}
      {toast ? (
        <View pointerEvents="none" style={styles.toastPosition}>
          <View style={[styles.toastCard, toast.type === "error" && styles.toastCardError]}>
            <View style={[styles.toastIcon, toast.type === "error" && styles.toastIconError]}>
              <Ionicons name={toast.type === "success" ? "checkmark" : "alert-circle"} size={17} color={toast.type === "success" ? "#087B58" : "#B42318"} />
            </View>
            <View style={styles.toastCopy}>
              <Text style={styles.toastTitle}>{toast.title}</Text>
              <Text style={styles.toastMessage}>{toast.message}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F7F3" },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E9E3" },
  headerIcon: { width: 42, height: 48, alignItems: "center", justifyContent: "center" },
  // [MODIFIED] Header menggunakan judul halaman, bukan logo HeyPost.
  headerTitle: { color: "#15231C", fontFamily: "Archivo-Bold", fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  spacer: { flex: 1 },
  // [MODIFIED] Tombol header dibuat proporsional.
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#087B58", alignItems: "center", justifyContent: "center" },
  searchBar: { height: 48, flexDirection: "row", alignItems: "center", gap: 9, marginHorizontal: 20, marginTop: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#D6E0D9", borderRadius: 12, backgroundColor: "#FFFFFF" },
  searchInput: { flex: 1, color: "#17241D", fontSize: 14, padding: 0 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28, gap: 0 },
  // [ADDED] Satu kartu ringkasan dengan tiga kolom status outlet.
  summaryCard: { minHeight: 94, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 13, marginBottom: 16, borderRadius: 15, borderWidth: 1, borderColor: "#D6E0D9", backgroundColor: "#FFFFFF" },
  summaryItem: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 7 },
  summaryLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  summaryLabel: { color: "#68746D", fontFamily: "Figtree-Medium", fontSize: 11, textAlign: "center" },
  summaryValue: { color: "#18251E", fontFamily: "Archivo-Bold", fontSize: 22, fontWeight: "800" },
  summaryDivider: { width: 1, height: 42, backgroundColor: "#E3EAE5" },
  statusDotOpen: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#16835E" },
  statusDotClosed: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#C28A43" },
  listCard: { overflow: "hidden", borderRadius: 15, borderWidth: 1, borderColor: "#D6E0D9", backgroundColor: "#FFFFFF" },
  // [MODIFIED] Baris outlet dipadatkan agar informasi dan kontrol sejajar.
  outletRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 11, paddingVertical: 10, minHeight: 76 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#DCE5DF" },
  outletIcon: { width: 30, alignItems: "center", justifyContent: "center" },
  outletContent: { flex: 1, minWidth: 0, gap: 4 },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 9 },
  outletName: { color: "#18251E", fontFamily: "Figtree-Medium", fontSize: 14, flexShrink: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#E4F5EC" },
  activeBadgeText: { color: "#075D43", fontFamily: "Figtree-Bold", fontSize: 10, fontWeight: "800" },
  address: { color: "#68746D", fontFamily: "Figtree-Regular", fontSize: 11, lineHeight: 15 },
  // [ADDED] Informasi jam operasional pada kartu outlet.
  hours: { color: "#68746D", fontFamily: "Figtree-Medium", fontSize: 10 },
  // [ADDED] Kontrol status dan edit ditempatkan sejajar di sisi kanan.
  rowActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  // [MODIFIED] Switch outlet memakai tampilan yang sama dengan toggle status produk.
  statusSwitch: { transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }], marginHorizontal: -3 },
  // [MODIFIED] Tombol edit mengikuti halaman Produk: tanpa kotak pembungkus.
  editButton: { width: 32, height: 36, alignItems: "center", justifyContent: "center" },
  // [MODIFIED] Ikon sinkronisasi menggabungkan kotak produk dan panah melingkar.
  syncButton: { width: 30, height: 36, alignItems: "center", justifyContent: "center" },
  syncIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  syncIconBadge: { position: "absolute", right: -3, bottom: -2, width: 12, height: 12, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  openButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderColor: "#D6E0D9", borderRadius: 14, backgroundColor: "#FFFFFF" },
  openButtonText: { color: "#18251E", fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "800" },
  message: { padding: 24, color: "#68746D", fontSize: 15, textAlign: "center" },
  error: { padding: 18, color: "#B42318", fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(0,0,0,0.35)" },
  filterCard: { padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF" },
  modalTitle: { color: "#18251E", fontSize: 18, fontWeight: "800" },
  filterOption: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E7EDE9" },
  filterText: { color: "#26342C", fontSize: 14 },
  // [ADDED] Tampilan pemilih outlet sumber untuk penyalinan menu.
  sourcePicker: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderWidth: 1, borderColor: "#D6E0D9", borderRadius: 11, backgroundColor: "#FFFFFF" },
  sourcePickerText: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  sourcePickerLabel: { color: "#26342C", fontSize: 13, flex: 1 },
  sourceOptionText: { flex: 1, gap: 2 },
  sourceOptionMeta: { color: "#87938C", fontSize: 11 },
  // [ADDED] Keterangan singkat untuk konsekuensi penggantian menu.
  syncDescription: { color: "#68746D", fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 8 },
  // [ADDED] Empty state lebih terarah dan seimbang pada modal sinkronisasi.
  emptySource: { alignItems: "center", paddingHorizontal: 14, paddingTop: 22, paddingBottom: 8 },
  emptySourceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF6EF", marginBottom: 10 },
  emptySourceTitle: { color: "#18251E", fontSize: 14, fontWeight: "700" },
  emptySourceText: { maxWidth: 250, color: "#68746D", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 5 },
  emptySourceButton: { minHeight: 36, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#087B58", marginTop: 15 },
  emptySourceButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  // [ADDED] Toast ringan, konsisten, dan tidak menutupi kontrol utama.
  toastPosition: { position: "absolute", left: 16, right: 16, bottom: 24, alignItems: "center" },
  toastCard: { width: "100%", maxWidth: 440, minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: "#D7E8DD", backgroundColor: "#FFFFFF", shadowColor: "#14251B", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  toastCardError: { borderColor: "#F1D3D0" },
  toastIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF6EF" },
  toastIconError: { backgroundColor: "#FDEDEC" },
  toastCopy: { flex: 1, gap: 2 },
  toastTitle: { color: "#18251E", fontSize: 13, fontWeight: "700" },
  toastMessage: { color: "#68746D", fontSize: 11, lineHeight: 15 },
  editorCard: { padding: 16, borderRadius: 16, gap: 10, backgroundColor: "#FFFFFF" },
  editorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  fieldLabel: { color: "#53635B", fontSize: 13, fontWeight: "700", marginTop: 5 },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: "#D6E0D9", borderRadius: 11, color: "#17241D", backgroundColor: "#FFFFFF" },
  // [ADDED] Dua kolom input jam buka dan jam tutup.
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1, gap: 5 },
  timeCaption: { color: "#68746D", fontSize: 12, fontWeight: "600" },
  // [ADDED] Pilihan zona waktu otomatis atau manual.
  timezoneModeRow: { flexDirection: "row", gap: 8 },
  timezoneModeButton: { flex: 1, minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: "#D6E0D9", borderRadius: 10, backgroundColor: "#FFFFFF" },
  timezoneModeSelected: { borderColor: "#9CCDB9", backgroundColor: "#EFF8F3" },
  timezoneModeText: { color: "#68746D", fontSize: 11, fontWeight: "600" },
  timezoneModeTextSelected: { color: "#087B58" },
  timezoneHint: { color: "#68746D", fontSize: 11, lineHeight: 16 },
  timezoneChoices: { gap: 6 },
  timezoneChoice: { padding: 10, borderWidth: 1, borderColor: "#D6E0D9", borderRadius: 10, backgroundColor: "#FFFFFF" },
  timezoneChoiceSelected: { borderColor: "#8DBFA9", backgroundColor: "#F1F8F4" },
  timezoneChoiceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timezoneChoiceLabel: { color: "#26342C", fontSize: 13, fontWeight: "700" },
  timezoneChoiceDetail: { color: "#68746D", fontSize: 10, marginTop: 3 },
  mainWhatsappOption: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 11, borderWidth: 1, borderColor: "#D6E0D9", borderRadius: 11, backgroundColor: "#F7FAF8" },
  mainWhatsappText: { flex: 1, gap: 2 },
  mainWhatsappTitle: { color: "#26342C", fontSize: 13, fontWeight: "700" },
  mainWhatsappHint: { color: "#68746D", fontSize: 11 },
  saveButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 12, borderRadius: 13, backgroundColor: "#087B58" },
  saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});

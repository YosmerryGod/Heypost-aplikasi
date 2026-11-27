// [MODIFIED] Outlet management follows HeyPost frontend's grouped settings-list pattern.
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton, AppScreen, EmptyState, Field, PageHeading, Panel, Tag } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

type OutletForm = { id?: number; name: string; address: string; whatsappNumber: string; copyMenuFromOutletId: number };

export default function OutletsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.auth.me.useQuery();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState<OutletForm | null>(null);

  useEffect(() => { const subscription = DeviceEventEmitter.addListener("heypost:search-query", (value: string) => setSearch(value)); return () => subscription.remove(); }, []);

  const refresh = async () => { await utils.auth.me.invalidate(); await utils.pos.invalidate(); };
  const switchOutlet = trpc.store.switchOutlet.useMutation({
    onSuccess: async () => { await refresh(); Alert.alert("Outlet aktif diperbarui", "Data outlet berhasil dimuat ulang."); },
    onError: (error) => Alert.alert("Gagal mengganti outlet", error.message),
  });
  const create = trpc.store.createOutlet.useMutation({
    onSuccess: async () => { await refresh(); setForm(null); },
    onError: (error) => Alert.alert("Gagal membuat outlet", error.message),
  });
  const update = trpc.store.updateOutlet.useMutation({
    onSuccess: async () => { await refresh(); setForm(null); },
    onError: (error) => Alert.alert("Gagal memperbarui outlet", error.message),
  });

  const data = query.data;
  const outlets = data?.outlets ?? [];
  const filtered = useMemo(() => outlets.filter((outlet) =>
    outlet.name.toLocaleLowerCase("id-ID").includes(search.toLocaleLowerCase("id-ID")) &&
    (statusFilter === "all" || (statusFilter === "active" ? outlet.active : !outlet.active))), [outlets, search, statusFilter]);

  if (!data || data.principal.role !== "owner") return <AppScreen><EmptyState title="Akses khusus owner" /></AppScreen>;

  const openCreate = () => setForm({ name: "", address: "", whatsappNumber: "", copyMenuFromOutletId: data.activeOutletId });
  const openEdit = (outlet: typeof outlets[number]) => setForm({ id: outlet.id, name: outlet.name, address: outlet.address ?? "", whatsappNumber: outlet.whatsappNumber ?? "", copyMenuFromOutletId: 0 });
  const submit = () => {
    if (!form || form.name.trim().length < 2) return;
    if (form.id) update.mutate({ id: form.id, name: form.name.trim(), address: form.address.trim() || null, whatsappNumber: form.whatsappNumber.trim() || null });
    else create.mutate({ name: form.name.trim(), address: form.address.trim() || undefined, whatsappNumber: form.whatsappNumber.trim() || undefined, copyMenuFromOutletId: form.copyMenuFromOutletId || undefined });
  };

  return (
    <AppScreen>
      <PageHeading title="Outlet" subtitle={`${filtered.length} outlet · Kelola lokasi usaha.`} right={<ActionButton title="Tambah" compact onPress={openCreate} />} />
      <View style={s.summary}>
        <View><Text style={s.summaryValue}>{outlets.length}</Text><Text style={s.summaryLabel}>Total outlet</Text></View>
        <View><Text style={s.summaryValue}>{outlets.filter((outlet) => outlet.active).length}</Text><Text style={s.summaryLabel}>Aktif</Text></View>
        <View><Text style={s.summaryValue}>{outlets.filter((outlet) => !outlet.active).length}</Text><Text style={s.summaryLabel}>Nonaktif</Text></View>
      </View>
      <View style={s.toolbar}>
        <Text style={s.sectionTitle}>Daftar outlet</Text>
        <Pressable onPress={() => setStatusFilter((current) => current === "all" ? "active" : current === "active" ? "inactive" : "all")} style={s.filterButton}><Ionicons name="filter-outline" size={16} color={theme.colors.ink} /><Text style={s.filterText}>{statusFilter === "all" ? "Semua" : statusFilter === "active" ? "Aktif" : "Nonaktif"}</Text></Pressable>
      </View>
      {filtered.length ? <View style={s.list}>
        {filtered.map((outlet) => <View key={outlet.id} style={s.outletRow}>
          <View style={s.iconBox}><Ionicons name="business-outline" size={21} color={theme.colors.signal} /></View>
          <View style={s.outletInfo}>
            <View style={s.outletTitleRow}><Text style={s.outletName}>{outlet.name}</Text>{data.activeOutletId === outlet.id ? <Tag tone="green">Sedang dibuka</Tag> : <Tag tone={outlet.active ? "neutral" : "red"}>{outlet.active ? "Aktif" : "Nonaktif"}</Tag>}</View>
            <Text numberOfLines={2} style={s.outletMeta}>{outlet.address || "Alamat belum diisi"}</Text>
            {outlet.whatsappNumber ? <Text style={s.outletMeta}>WhatsApp: {outlet.whatsappNumber}</Text> : null}
            <View style={s.actions}>
              {data.activeOutletId !== outlet.id && outlet.active ? <Pressable disabled={switchOutlet.isPending} onPress={() => switchOutlet.mutate({ outletId: outlet.id })} style={s.smallAction}><Ionicons name="swap-horizontal-outline" size={15} color={theme.colors.signal} /><Text style={s.smallActionText}>Buka outlet</Text></Pressable> : null}
              <Pressable onPress={() => openEdit(outlet)} style={s.smallAction}><Ionicons name="create-outline" size={15} color={theme.colors.signal} /><Text style={s.smallActionText}>Edit</Text></Pressable>
            </View>
          </View>
        </View>)}
      </View> : <EmptyState title="Outlet tidak ditemukan" description="Coba kata pencarian atau filter lain." />}

      <Modal visible={!!form} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setForm(null)}>
        <AppScreen><PageHeading title={form?.id ? "Edit outlet" : "Tambah outlet"} subtitle={form?.id ? "Perbarui informasi cabang." : "Cabang baru memiliki katalog, stok, dan laporan sendiri."} />
          {form ? <>
            <Field label="Nama outlet" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="Contoh: Cabang utama" />
            <Field label="Alamat (opsional)" value={form.address} onChangeText={(value) => setForm({ ...form, address: value })} placeholder="Alamat lengkap" multiline />
            <Field label="Nomor WhatsApp outlet" value={form.whatsappNumber} onChangeText={(value) => setForm({ ...form, whatsappNumber: value })} keyboardType="phone-pad" placeholder="628..." />
            {!form.id ? <>
              <Text style={s.formLabel}>Isi menu awal</Text>
              <View style={s.copyChoices}>
                <Pressable onPress={() => setForm({ ...form, copyMenuFromOutletId: 0 })} style={[s.copyChoice, form.copyMenuFromOutletId === 0 && s.copyChoiceActive]}><Text style={[s.copyChoiceText, form.copyMenuFromOutletId === 0 && s.copyChoiceTextActive]}>Katalog kosong</Text></Pressable>
                {outlets.map((outlet) => <Pressable key={outlet.id} onPress={() => setForm({ ...form, copyMenuFromOutletId: outlet.id })} style={[s.copyChoice, form.copyMenuFromOutletId === outlet.id && s.copyChoiceActive]}><Text style={[s.copyChoiceText, form.copyMenuFromOutletId === outlet.id && s.copyChoiceTextActive]}>Salin dari {outlet.name}</Text></Pressable>)}
              </View>
              <Text style={s.helper}>Penyalinan mencakup kategori, produk, harga, dan stok saat ini.</Text>
            </> : null}
            <ActionButton title={create.isPending || update.isPending ? "Menyimpan..." : form.id ? "Simpan perubahan" : "Buat outlet"} loading={create.isPending || update.isPending} disabled={!form.name.trim()} onPress={submit} />
            <ActionButton title="Batal" secondary onPress={() => setForm(null)} />
          </> : null}
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  summary: { flexDirection: "row", justifyContent: "space-around", padding: 14 },
  summaryValue: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 19 },
  summaryLabel: { color: theme.colors.muted, fontSize: 10 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 17 },
  filterButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 8 },
  filterText: { color: theme.colors.ink, fontSize: 11, fontWeight: "700" },
  list: { overflow: "hidden", borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, backgroundColor: theme.colors.surface },
  outletRow: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  iconBox: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signalSoft },
  outletInfo: { flex: 1, minWidth: 0, gap: 4 },
  outletTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  outletName: { color: theme.colors.ink, fontSize: 13, fontWeight: "800" },
  outletMeta: { color: theme.colors.muted, fontSize: 11 },
  actions: { flexDirection: "row", gap: 15, marginTop: 5 },
  smallAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  smallActionText: { color: theme.colors.signal, fontSize: 11, fontWeight: "800" },
  formLabel: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" },
  copyChoices: { gap: 7 },
  copyChoice: { padding: 11, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 9 },
  copyChoiceActive: { borderColor: theme.colors.signal, backgroundColor: theme.colors.signalSoft },
  copyChoiceText: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  copyChoiceTextActive: { color: theme.colors.signal },
  helper: { color: theme.colors.muted, fontSize: 10 },
});
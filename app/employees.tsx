// [MODIFIED] Employee administration adapted to HeyPost frontend's team list and access-card flow.
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

type Role = "manager" | "kasir";
type Permission = "pos.access" | "history.daily.view" | "invoice.edit" | "expenses.daily.create" | "expenses.daily.view" | "menu.create" | "menu.edit" | "stock.edit" | "reports.sales.view" | "outlets.create" | "employees.create" | "receipt.settings";
type Employee = { id: number; name: string; role: Role; outletId: number; outletName: string; active: boolean; permissions: Permission[]; lastLoginAt: Date | null; lockedUntil: Date | null };
type EmployeeForm = { id?: number; name: string; role: Role; outletId: number; pin: string; active: boolean; permissions: Permission[] };
type Credential = { name: string; barcode: string; pin?: string };
const defaults: Record<Role, Permission[]> = {
  manager: ["pos.access", "history.daily.view", "expenses.daily.create", "expenses.daily.view", "menu.create", "menu.edit", "stock.edit", "reports.sales.view"],
  kasir: ["pos.access", "history.daily.view"],
};
const permissionGroups: { title: string; items: { key: Permission; label: string }[] }[] = [
  { title: "Kasir", items: [{ key: "pos.access", label: "Akses kasir" }, { key: "history.daily.view", label: "Riwayat harian" }, { key: "invoice.edit", label: "Edit invoice" }] },
  { title: "Operasional", items: [{ key: "expenses.daily.create", label: "Catat pengeluaran" }, { key: "expenses.daily.view", label: "Lihat pengeluaran" }] },
  { title: "Menu & stok", items: [{ key: "menu.create", label: "Tambah menu" }, { key: "menu.edit", label: "Edit menu" }, { key: "stock.edit", label: "Edit stok" }] },
  { title: "Manajemen", items: [{ key: "reports.sales.view", label: "Lihat laporan" }, { key: "outlets.create", label: "Tambah outlet" }, { key: "employees.create", label: "Tambah karyawan" }, { key: "receipt.settings", label: "Pengaturan struk" }] },
];

export default function EmployeesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.employees.list.useQuery();
  const session = trpc.auth.me.useQuery();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<EmployeeForm | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const create = trpc.employees.create.useMutation({
    onSuccess: async (employee, variables) => { await utils.employees.list.invalidate(); setForm(null); setCredential({ name: employee.name, barcode: employee.barcode, pin: variables.pin }); },
    onError: (error) => Alert.alert("Gagal membuat karyawan", error.message),
  });
  const update = trpc.employees.update.useMutation({
    onSuccess: async () => { await utils.employees.list.invalidate(); setForm(null); Alert.alert("Tersimpan", "Data karyawan diperbarui dan sesi lama ditutup."); },
    onError: (error) => Alert.alert("Gagal memperbarui karyawan", error.message),
  });
  const regenerate = trpc.employees.regenerateBarcode.useMutation({
    onSuccess: async (result, variables) => { await utils.employees.list.invalidate(); const employee = employees.find((item) => item.id === variables.id); setCredential({ name: employee?.name ?? "Karyawan", barcode: result.barcode }); },
    onError: (error) => Alert.alert("Gagal membuat barcode", error.message),
  });

  useEffect(() => { const subscription = DeviceEventEmitter.addListener("heypost:search-query", (value: string) => setSearch(value)); return () => subscription.remove(); }, []);

  const employees = (query.data ?? []) as Employee[];
  const filtered = useMemo(() => employees.filter((employee) =>
    `${employee.name} ${employee.outletName} ${employee.role}`.toLocaleLowerCase("id-ID").includes(search.toLocaleLowerCase("id-ID")) &&
    (filterRole === "all" || employee.role === filterRole) &&
    (filterStatus === "all" || (filterStatus === "active" ? employee.active : !employee.active))), [employees, search, filterRole, filterStatus]);

  if (session.data?.principal.role !== "owner") return <AppScreen><EmptyState title="Akses khusus owner" /></AppScreen>;
  if (query.isLoading) return <AppScreen><LoadingState /></AppScreen>;
  if (query.error) return <AppScreen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></AppScreen>;

  const outlets = session.data.outlets;
  const openCreate = () => setForm({ name: "", role: "kasir", outletId: session.data?.activeOutletId ?? outlets[0]?.id ?? 0, pin: "", active: true, permissions: [...defaults.kasir] });
  const openEdit = (employee: Employee) => setForm({ id: employee.id, name: employee.name, role: employee.role, outletId: employee.outletId, pin: "", active: employee.active, permissions: [...employee.permissions] });
  const submit = () => {
    if (!form || !form.outletId || form.name.trim().length < 2) return;
    if (form.id) update.mutate({ id: form.id, name: form.name.trim(), role: form.role, outletId: form.outletId, active: form.active, pin: form.pin || undefined, permissions: form.permissions });
    else create.mutate({ name: form.name.trim(), role: form.role, outletId: form.outletId, pin: form.pin, permissions: form.permissions });
  };

  return (
    <AppScreen>
      <PageHeading title="Karyawan" subtitle={`${filtered.length} karyawan`} right={<ActionButton title="Tambah" compact onPress={openCreate} />} />
      <View style={s.filters}>
        <Pressable onPress={() => setFilterOpen(true)} style={s.filterButton}><Ionicons name="filter-outline" size={17} color={theme.colors.ink} /><Text style={s.filterText}>Filter</Text></Pressable>
        <Text style={s.resultCount}>{employees.filter((employee) => employee.active).length} aktif · {employees.filter((employee) => !employee.active).length} nonaktif</Text>
      </View>
      {filtered.length === 0 ? <EmptyState title={employees.length ? "Karyawan tidak ditemukan" : "Belum ada karyawan"} description={employees.length ? "Coba kata kunci pencarian lain." : "Tambahkan manager atau kasir, lalu berikan kartu aksesnya."} action={!employees.length ? <ActionButton title="Tambah karyawan pertama" onPress={openCreate} /> : null} /> : (
        <View style={s.list}>
          {filtered.map((employee) => <View key={employee.id} style={s.employeeRow}>
            <View style={s.avatar}><Ionicons name="person-outline" size={20} color={theme.colors.signal} /></View>
            <View style={s.employeeInfo}>
              <View style={s.employeeNameRow}><Text numberOfLines={1} style={s.employeeName}>{employee.name}</Text><Tag tone={employee.active ? "green" : "neutral"}>{employee.active ? "Aktif" : "Nonaktif"}</Tag></View>
              <Text style={s.employeeMeta}>{employee.role === "manager" ? "Manager" : "Kasir"} · {employee.outletName}</Text>
              <Text style={s.employeeLast}>{employee.lockedUntil && new Date(employee.lockedUntil).getTime() > Date.now() ? "Login dikunci sementara" : employee.lastLoginAt ? `Masuk ${new Date(employee.lastLoginAt).toLocaleString("id-ID")}` : "Belum pernah masuk"}</Text>
              <View style={s.employeeActions}>
                <Pressable onPress={() => openEdit(employee)} style={s.smallAction}><Ionicons name="create-outline" size={15} color={theme.colors.signal} /><Text style={s.smallActionText}>Edit</Text></Pressable>
                <Pressable disabled={regenerate.isPending} onPress={() => Alert.alert("Buat barcode baru?", "Barcode lama dan sesi aktif karyawan akan dinonaktifkan.", [{ text: "Batal", style: "cancel" }, { text: "Buat baru", onPress: () => regenerate.mutate({ id: employee.id }) }])} style={s.smallAction}><Ionicons name="refresh-outline" size={15} color={theme.colors.signal} /><Text style={s.smallActionText}>Barcode baru</Text></Pressable>
              </View>
            </View>
          </View>)}
        </View>
      )}

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <View style={s.overlay}><View style={s.dialog}><Text style={s.dialogTitle}>Filter karyawan</Text><Text style={s.formLabel}>Role</Text><View style={s.chips}>{(["all", "manager", "kasir"] as const).map((value) => <Pressable key={value} onPress={() => setFilterRole(value)} style={[s.chip, filterRole === value && s.chipActive]}><Text style={[s.chipText, filterRole === value && s.chipTextActive]}>{value === "all" ? "Semua role" : value === "manager" ? "Manager" : "Kasir"}</Text></Pressable>)}</View><Text style={s.formLabel}>Status</Text><View style={s.chips}>{(["all", "active", "inactive"] as const).map((value) => <Pressable key={value} onPress={() => setFilterStatus(value)} style={[s.chip, filterStatus === value && s.chipActive]}><Text style={[s.chipText, filterStatus === value && s.chipTextActive]}>{value === "all" ? "Semua status" : value === "active" ? "Aktif" : "Nonaktif"}</Text></Pressable>)}</View><View style={s.dialogActions}><ActionButton title="Reset" compact secondary onPress={() => { setFilterRole("all"); setFilterStatus("all"); }} /><ActionButton title="Terapkan" compact onPress={() => setFilterOpen(false)} /></View></View></View>
      </Modal>

      <Modal visible={!!form} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setForm(null)}>
        <AppScreen><PageHeading title={form?.id ? "Edit karyawan" : "Tambah karyawan"} subtitle="Atur identitas dan hak akses tim." />
          {form ? <>
            <Field label="Nama karyawan" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="Nama lengkap" />
            <Text style={s.formLabel}>Role</Text><View style={s.chips}>{(["kasir", "manager"] as Role[]).map((value) => <Pressable key={value} onPress={() => setForm({ ...form, role: value, permissions: [...defaults[value]] })} style={[s.chip, form.role === value && s.chipActive]}><Text style={[s.chipText, form.role === value && s.chipTextActive]}>{value === "kasir" ? "Kasir" : "Manager"}</Text></Pressable>)}</View>
            <Text style={s.formLabel}>Outlet</Text><View style={s.chips}>{outlets.map((outlet) => <Pressable key={outlet.id} onPress={() => setForm({ ...form, outletId: outlet.id })} style={[s.chip, form.outletId === outlet.id && s.chipActive]}><Text style={[s.chipText, form.outletId === outlet.id && s.chipTextActive]}>{outlet.name}</Text></Pressable>)}</View>
            <Field label={form.id ? "PIN baru (opsional)" : "PIN 6 digit"} value={form.pin} onChangeText={(value) => setForm({ ...form, pin: value.replace(/\D/g, "").slice(0, 6) })} keyboardType="number-pad" secureTextEntry placeholder={form.id ? "Kosongkan jika tidak diganti" : "6 digit angka"} />
            {permissionGroups.map((group) => <Panel key={group.title} style={s.permissionPanel}><Text style={s.formLabel}>{group.title}</Text>{group.items.map((item) => <View key={item.key} style={s.permissionRow}><Text style={s.permissionText}>{item.label}</Text><Switch value={form.permissions.includes(item.key)} onValueChange={(value) => setForm({ ...form, permissions: value ? [...form.permissions, item.key] : form.permissions.filter((permission) => permission !== item.key) })} trackColor={{ true: theme.colors.signal }} /></View>)}</Panel>)}
            {form.id ? <View style={s.permissionRow}><Text style={s.permissionText}>Akses aktif</Text><Switch value={form.active} onValueChange={(value) => setForm({ ...form, active: value })} trackColor={{ true: theme.colors.signal }} /></View> : null}
            <ActionButton title={create.isPending || update.isPending ? "Menyimpan..." : form.id ? "Simpan perubahan" : "Buat kartu akses"} loading={create.isPending || update.isPending} disabled={!form.name.trim() || (!form.id && form.pin.length !== 6) || (!!form.id && !!form.pin && form.pin.length !== 6)} onPress={submit} />
            <ActionButton title="Batal" secondary onPress={() => setForm(null)} />
          </> : null}
        </AppScreen>
      </Modal>

      <Modal visible={!!credential} transparent animationType="fade" onRequestClose={() => setCredential(null)}>
        <View style={s.overlay}><View style={s.credentialCard}><View style={s.credentialBrand}><Text style={s.brandText}>hey<Text style={{ color: theme.colors.signal }}>post.</Text></Text></View><Text style={s.dialogTitle}>Kartu akses karyawan</Text><Text style={s.employeeMeta}>{credential?.name}</Text><View style={s.barcodeBox}><Ionicons name="barcode-outline" size={56} color={theme.colors.ink} /><Text selectable style={s.barcodeText}>{credential?.barcode}</Text></View>{credential?.pin ? <View style={s.pinBox}><Text style={s.employeeMeta}>PIN LOGIN</Text><Text style={s.pinText}>{credential.pin}</Text></View> : null}<Text style={s.employeeLast}>Simpan barcode ini sekarang. Barcode lengkap tidak dapat ditampilkan kembali setelah dialog ditutup.</Text><ActionButton title="Selesai, sudah disimpan" onPress={() => setCredential(null)} /></View></View>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  filters: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  filterButton: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 8, backgroundColor: theme.colors.surface },
  filterText: { color: theme.colors.ink, fontSize: 12, fontWeight: "700" },
  resultCount: { color: theme.colors.muted, fontSize: 11 },
  list: { overflow: "hidden", borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, backgroundColor: theme.colors.surface },
  employeeRow: { flexDirection: "row", gap: 11, padding: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  avatar: { width: 42, height: 42, borderRadius: 11, backgroundColor: theme.colors.signalSoft, alignItems: "center", justifyContent: "center" },
  employeeInfo: { flex: 1, minWidth: 0, gap: 5 },
  employeeNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  employeeName: { flex: 1, color: theme.colors.ink, fontSize: 13, fontWeight: "800" },
  employeeMeta: { color: theme.colors.muted, fontSize: 11 },
  employeeLast: { color: theme.colors.muted, fontSize: 10 },
  employeeActions: { flexDirection: "row", gap: 14, marginTop: 4 },
  smallAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  smallActionText: { color: theme.colors.signal, fontSize: 11, fontWeight: "800" },
  overlay: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "#0007" },
  dialog: { padding: 20, gap: 13, borderRadius: 16, backgroundColor: theme.colors.surface },
  dialogTitle: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 20 },
  formLabel: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 18, backgroundColor: "#edf2ee" },
  chipActive: { backgroundColor: theme.colors.signal },
  chipText: { color: theme.colors.muted, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  permissionPanel: { gap: 6 },
  permissionRow: { minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  permissionText: { color: theme.colors.ink, fontSize: 12, fontWeight: "600" },
  credentialCard: { padding: 22, borderRadius: 18, backgroundColor: theme.colors.surface, gap: 12 },
  credentialBrand: { alignItems: "center" },
  brandText: { color: theme.colors.ink, fontFamily: "Archivo-ExtraBold", fontSize: 26 },
  barcodeBox: { alignItems: "center", padding: 18, borderWidth: 1, borderStyle: "dashed", borderColor: theme.colors.line, borderRadius: 12 },
  barcodeText: { color: theme.colors.ink, fontSize: 11, textAlign: "center" },
  pinBox: { alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: theme.colors.signalSoft },
  pinText: { color: theme.colors.signal, fontFamily: "Archivo-ExtraBold", fontSize: 25, letterSpacing: 5 },
});

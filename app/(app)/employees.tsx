import { LoadingState, showToast } from "@/components/native-ui"; // [ADDED] Feedback visual HeyPost.
// [ADDED] Halaman pengelolaan karyawan dengan data langsung dari backend.
import { useEffect, useMemo, useRef, useState } from "react";
import {Alert, Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from "react-native"; // [MODIFIED] Gunakan switch status seperti halaman Produk.
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg"; // [ADDED] Render barcode Code 128 sebagai SVG.
import bwipjs from "bwip-js/generic"; // [MODIFIED] Gunakan build SVG murni tanpa modul Brotli/Node yang gagal di Hermes.
import { trpc } from "@/providers/trpc";
import { getTheme, type ThemeColors } from "@/constants/theme";

type EmployeeRole = "manager" | "kasir" | "lainnya";
type PermissionKey = "pos.access" | "history.daily.view" | "invoice.edit" | "expenses.daily.create" | "expenses.daily.view" | "menu.create" | "menu.edit" | "stock.edit" | "reports.sales.view" | "outlets.create" | "employees.create" | "receipt.settings" | "expenses.daily.cancel" | "transactions.cancel" | "outlets.manage" | "employees.manage" | "payment.settings" | "store.settings" | "printer.settings" | "outlets.view" | "outlets.edit" | "outlets.deactivate" | "outlets.assign" | "outlets.view_all" | "employees.view" | "employees.edit" | "employees.deactivate" | "employees.role.manage" | "employees.permissions.manage" | "employees.pin.reset" | "employees.outlet.assign";
const cashierDefaults: PermissionKey[] = ["pos.access", "history.daily.view", "expenses.daily.create", "expenses.daily.view"];
const managerDefaults: PermissionKey[] = ["pos.access", "history.daily.view", "expenses.daily.create", "expenses.daily.view", "expenses.daily.cancel", "menu.create", "menu.edit", "stock.edit", "reports.sales.view", "invoice.edit", "transactions.cancel"];
const permissionGroups = [
  { title:"Operasional", items:[ ["pos.access","Halaman Kasir"], ["history.daily.view","Riwayat Harian"], ["invoice.edit","Edit transaksi"], ["transactions.cancel","Batalkan transaksi"] ] },
  { title:"Keuangan", items:[ ["expenses.daily.create","Tambah pengeluaran"], ["expenses.daily.view","Lihat pengeluaran"], ["expenses.daily.cancel","Batalkan pengeluaran"] ] },
  { title:"Produk & laporan", items:[ ["menu.create","Tambah menu/produk"], ["menu.edit","Edit menu/produk"], ["stock.edit","Kelola stok"], ["reports.sales.view","Lihat laporan penjualan"] ] },
  { title:"Kelola outlet", items:[ ["outlets.view","Lihat daftar outlet"], ["outlets.create","Tambah outlet"], ["outlets.edit","Edit informasi outlet"], ["outlets.deactivate","Aktifkan/nonaktifkan outlet"], ["outlets.assign","Atur penugasan outlet"], ["outlets.view_all","Lihat semua outlet"] ] },
  { title:"Kelola karyawan", items:[ ["employees.view","Lihat daftar karyawan"], ["employees.create","Tambah karyawan"], ["employees.edit","Edit data karyawan"], ["employees.deactivate","Aktifkan/nonaktifkan karyawan"], ["employees.role.manage","Atur jabatan"], ["employees.permissions.manage","Atur hak akses"], ["employees.pin.reset","Atur/reset PIN dan barcode"], ["employees.outlet.assign","Pindahkan/atur outlet karyawan"] ] },
  { title:"Pengaturan toko", items:[ ["receipt.settings","Pengaturan struk"], ["payment.settings","Pengaturan pembayaran"], ["store.settings","Profil toko"], ["printer.settings","Pengaturan printer"] ] },
] as const;
const roleLabel = (role:EmployeeRole, customTitle?:string|null) => role === "manager" ? "Manager" : role === "kasir" ? "Kasir" : customTitle || "Lainnya";
type EmployeeItem = { id:number; name:string; role:EmployeeRole; customTitle:string|null; outletId:number; outletIds:number[]; outletNames:{id:number;name:string}[]; outletName:string; active:boolean; permissions:PermissionKey[]; outletPermissions?:Record<string,PermissionKey[]>; lockedUntil:Date|null; lastLoginAt:Date|null; createdAt:Date };
const dateLabel = (date:Date|null) => date ? new Date(date).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "Belum pernah masuk";

export default function EmployeesScreen() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const s = useMemo(() => createStyles(colors), [colors]);
  const utils = trpc.useUtils();
  const insets = useSafeAreaInsets();
  // [ADDED] Pencarian header memakai transisi yang sama seperti pencarian Kasir.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchWidth = Math.max(220, Dimensions.get("window").width - 40);
  const session = trpc.auth.me.useQuery();
  const employeesQuery = trpc.employees.list.useQuery();
  const outlets = session.data?.outlets ?? [];
  // [ADDED] Kontrol editor mengikuti izin yang berlaku di outlet aktif.
  const principal = session.data?.principal;
  // [ADDED] Daftar pilihan penugasan dibatasi ke outlet yang memang ditugaskan kepada akun.
  const assignableOutlets = principal?.role === "owner" ? outlets : outlets.filter((outlet) => principal?.assignedOutletIds?.includes(outlet.id));
  const currentPermissions = principal?.permissions ?? [];
  const isOwner = principal?.role === "owner";
  const canViewEmployees = isOwner || currentPermissions.includes("employees.view") || currentPermissions.includes("employees.manage");
  const canCreateEmployee = isOwner || currentPermissions.includes("employees.create") || currentPermissions.includes("employees.manage");
  const canEditEmployee = isOwner || currentPermissions.includes("employees.edit") || currentPermissions.includes("employees.manage");
  const canDeactivateEmployee = isOwner || currentPermissions.includes("employees.deactivate") || currentPermissions.includes("employees.manage");
  const canResetEmployeePin = isOwner || currentPermissions.includes("employees.pin.reset") || currentPermissions.includes("employees.manage");
  const canManageEmployeeRole = isOwner || currentPermissions.includes("employees.role.manage") || currentPermissions.includes("employees.manage");
  const canManageEmployeePermissions = isOwner || currentPermissions.includes("employees.permissions.manage") || currentPermissions.includes("employees.manage");
  const canAssignEmployeeOutlets = isOwner || currentPermissions.includes("employees.outlet.assign") || currentPermissions.includes("employees.manage");
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState<"Semua"|"Aktif"|"Nonaktif">("Semua");
  const [editorOpen,setEditorOpen] = useState(false);
  const [editing,setEditing] = useState<EmployeeItem|null>(null);
  const [name,setName] = useState("");
  const [role,setRole] = useState<EmployeeRole>("kasir");
  const [customTitle,setCustomTitle] = useState("");
  const [outletIds,setOutletIds] = useState<number[]>(session.data?.activeOutletId ? [session.data.activeOutletId] : []);
  const [permissions,setPermissions] = useState<PermissionKey[]>(cashierDefaults);
  // [ADDED] Hak akses disimpan terpisah untuk setiap outlet yang dipilih.
  const [outletPermissions,setOutletPermissions] = useState<Record<string,PermissionKey[]>>({});
  const [permissionOutletId,setPermissionOutletId] = useState<number|null>(null);
  const [pin,setPin] = useState("");
  const [barcodeValue,setBarcodeValue] = useState<string|null>(null);
  const [barcodeName,setBarcodeName] = useState("");
  const [barcodePin,setBarcodePin] = useState<string|null>(null); // [ADDED] PIN hanya ditampilkan saat karyawan baru dibuat.
  const create = trpc.employees.create.useMutation({ onSuccess: async (result) => { await utils.employees.list.invalidate(); setEditorOpen(false); setBarcodeName(result.name); setBarcodePin(pin); setBarcodeValue(result.barcode); setPin(""); }, onError: e => showToast("Gagal menambahkan karyawan", e.message, "error") }); // [MODIFIED] Setelah dibuat, tampilkan barcode visual agar bisa langsung dipindai.
  const update = trpc.employees.update.useMutation({ onSuccess: async () => { await utils.employees.list.invalidate(); setEditorOpen(false); showToast("Tersimpan", "Data karyawan berhasil diperbarui.", "success"); }, onError:e=>showToast("Gagal menyimpan", e.message, "error") });
  // [ADDED] Mutasi status terpisah agar toggle tidak memunculkan dialog sukses edit.
  const setEmployeeActive = trpc.employees.update.useMutation({ onSuccess: () => utils.employees.list.invalidate(), onError: (error) => showToast("Gagal mengubah status", error.message, "error") });
  const regenerate = trpc.employees.regenerateBarcode.useMutation({ onSuccess: result => { setBarcodePin(null); setBarcodeValue(result.barcode); }, onError:e=>showToast("Barcode gagal dibuat", e.message, "error") }); // [MODIFIED] Barcode baru ditampilkan dalam format visual.
  const list = useMemo(() => (employeesQuery.data ?? []).filter((e) => `${e.name} ${e.outletNames.map(o=>o.name).join(" ")} ${roleLabel(e.role,e.customTitle)}`.toLowerCase().includes(search.toLowerCase()) && (filter === "Semua" || (filter === "Aktif" ? e.active : !e.active))), [employeesQuery.data,search,filter]);
  // [ADDED] Buat barcode Code 128 dari token login yang sama dengan data backend.
  const barcodeSvg = useMemo(() => {
    if (!barcodeValue) return "";
    try {
      return bwipjs.toSVG({ bcid: "code128", text: barcodeValue, scale: 3, height: 22, includetext: false, padding: 12, backgroundcolor: "FFFFFF", barcolor: "000000" });
    } catch {
      return "";
    }
  }, [barcodeValue]);
  // [ADDED] Kontrol animasi buka/tutup kolom pencarian.
  useEffect(() => {
    if (searchOpen) {
      Animated.timing(searchAnimation, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      return;
    }
    if (!searchVisible) return;
    Animated.timing(searchAnimation, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        setSearchVisible(false);
        setSearch("");
      }
    });
  }, [searchOpen, searchVisible, searchAnimation]);
  const openSearch = () => {
    searchAnimation.setValue(0);
    setSearchVisible(true);
    setSearchOpen(true);
  };
  const closeSearch = () => setSearchOpen(false);
  // [ADDED] Ringkasan status karyawan untuk card di bagian atas halaman.
  const activeEmployeeCount = (employeesQuery.data ?? []).filter((employee) => employee.active).length;
  const inactiveEmployeeCount = (employeesQuery.data ?? []).length - activeEmployeeCount;
  const openCreate = () => {
    const initialOutletIds = [session.data?.activeOutletId ?? assignableOutlets[0]?.id ?? 0].filter((id) => id && assignableOutlets.some((outlet) => outlet.id === id));
    setEditing(null); setName(""); setRole("kasir"); setCustomTitle(""); setOutletIds(initialOutletIds);
    setPermissions([...cashierDefaults]); setOutletPermissions(Object.fromEntries(initialOutletIds.map((id) => [String(id), [...cashierDefaults]])));
    setPermissionOutletId(initialOutletIds[0] ?? null); setPin(""); setEditorOpen(true);
  };
  const openEdit = (employee:EmployeeItem) => {
    const assigned = employee.outletIds?.length ? employee.outletIds : [employee.outletId];
    const saved = employee.outletPermissions ?? {};
    const perOutlet = Object.fromEntries(assigned.map((id) => [String(id), saved[String(id)] ?? employee.permissions]));
    setEditing(employee); setName(employee.name); setRole(employee.role); setCustomTitle(employee.customTitle ?? ""); setOutletIds(assigned);
    setOutletPermissions(perOutlet); setPermissionOutletId(assigned[0] ?? null); setPermissions([...employee.permissions]); setPin(""); setEditorOpen(true);
  };
  const changeRole = (next:EmployeeRole) => {
    setRole(next);
    const defaults = next === "kasir" ? cashierDefaults : next === "manager" ? managerDefaults : [];
    setOutletPermissions(Object.fromEntries(outletIds.map((id) => [String(id), [...defaults]])));
    setPermissions([...defaults]);
  };
  const toggleOutlet = (id:number) => {
    setOutletIds((current) => {
      const next = current.includes(id) ? current.filter((value)=>value!==id) : [...current,id];
      if (!current.includes(id)) {
        const defaults = role === "kasir" ? cashierDefaults : role === "manager" ? managerDefaults : [];
        setOutletPermissions((saved) => ({ ...saved, [String(id)]: [...defaults] }));
        setPermissionOutletId(id);
      } else {
        setOutletPermissions((saved) => { const copy = { ...saved }; delete copy[String(id)]; return copy; });
        if (permissionOutletId === id) setPermissionOutletId(next[0] ?? null);
      }
      return next;
    });
  };
  const togglePermission = (key:PermissionKey) => {
    if (permissionOutletId === null) return;
    setOutletPermissions((current) => {
      const outletKey = String(permissionOutletId);
      const existing = current[outletKey] ?? [];
      const updated = existing.includes(key) ? existing.filter((value)=>value!==key) : [...existing,key];
      return { ...current, [outletKey]: updated };
    });
  };
  const submit = () => {
    if(name.trim().length < 2) return showToast("Nama belum valid", "Masukkan minimal 2 karakter.", "error");
    if(role === "lainnya" && customTitle.trim().length < 2) return showToast("Jabatan belum diisi", "Masukkan nama jabatan.", "error");
    if(!outletIds.length) return showToast("Pilih outlet", "Karyawan harus terhubung ke outlet.", "info");
    const assignedPermissions = Object.fromEntries(outletIds.map((id) => [String(id), outletPermissions[String(id)] ?? []]));
    const allPermissions = [...new Set(Object.values(assignedPermissions).flat())];
    if(editing) update.mutate({ id:editing.id, name:name.trim(), role, customTitle:role === "lainnya" ? customTitle.trim() : null, outletIds, permissions:allPermissions, outletPermissions:assignedPermissions, ...(pin ? {pin} : {}) });
    else if(!/^\d{6}$/.test(pin)) showToast("PIN tidak valid", "PIN harus terdiri dari 6 digit angka.", "error");
    else create.mutate({ name:name.trim(), role, ...(role === "lainnya" ? {customTitle:customTitle.trim()} : {}), outletIds, permissions:allPermissions, outletPermissions:assignedPermissions, pin });
  };
  const askBarcode = (employee:EmployeeItem) => Alert.alert("Buat barcode baru?", `Barcode lama ${employee.name} tidak akan berlaku lagi.`, [{text:"Batal",style:"cancel"},{text:"Buat barcode",onPress:()=>{setBarcodeName(employee.name);setBarcodeValue(null);regenerate.mutate({id:employee.id});}}]);
  // [MODIFIED] Status aktif/nonaktif diubah langsung melalui switch pada setiap baris.

  return <SafeAreaView style={s.safe} edges={["top","left","right"]}>
    {/* [MODIFIED] Judul halaman dipindahkan ke header seperti halaman Outlet. */}
    <View style={s.header}><Pressable onPress={()=>router.back()} style={s.headerIcon}><Ionicons name="arrow-back" size={23} color={s.ink.color as string}/></Pressable><Text style={s.headerTitle}>Karyawan</Text><View style={{flex:1}}/><Pressable accessibilityRole="button" accessibilityLabel="Cari karyawan" onPress={openSearch} style={s.headerIcon}><Ionicons name="search-outline" size={23} color="#6B7280"/></Pressable><Pressable onPress={()=>setFilter(v=>v === "Semua" ? "Aktif" : v === "Aktif" ? "Nonaktif" : "Semua")} style={s.headerIcon}><Ionicons name="filter-outline" size={23} color="#6B7280"/></Pressable>{canCreateEmployee ? <Pressable onPress={openCreate} style={s.addButton}><Ionicons name="add" size={27} color="#FFFFFF"/></Pressable> : null}</View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* [ADDED] Ringkasan karyawan mengikuti struktur card ringkasan pada halaman Outlet. */}
      <View style={s.summaryCard}>
        <View style={s.summaryItem}><View style={s.summaryLabelRow}><View style={s.activeDot}/><Text style={s.summaryLabel}>Aktif</Text></View><Text style={s.summaryValue}>{employeesQuery.isLoading || employeesQuery.isError ? "—" : activeEmployeeCount}</Text></View>
        <View style={s.summaryDivider}/>
        <View style={s.summaryItem}><View style={s.summaryLabelRow}><View style={s.inactiveDot}/><Text style={s.summaryLabel}>Nonaktif</Text></View><Text style={s.summaryValue}>{employeesQuery.isLoading || employeesQuery.isError ? "—" : inactiveEmployeeCount}</Text></View>
        <View style={s.summaryDivider}/>
        <View style={s.summaryItem}><Text style={s.summaryLabel}>Total karyawan</Text><Text style={s.summaryValue}>{employeesQuery.isLoading || employeesQuery.isError ? "—" : (employeesQuery.data ?? []).length}</Text></View>
      </View>
      <View style={s.countRow}><Text style={s.count}>{list.length} karyawan</Text><Text style={s.filterLabel}>{filter}</Text></View>
      {!canViewEmployees ? <Text style={s.message}>Akun ini belum memiliki izin untuk melihat karyawan.</Text> : employeesQuery.isLoading ? <LoadingState /> : employeesQuery.isError ? <Pressable onPress={()=>employeesQuery.refetch()}><Text style={s.error}>{employeesQuery.error.message.includes("hanya untuk owner") ? "Akses dibatasi. Masuk menggunakan akun owner untuk mengelola karyawan." : "Gagal memuat data. Ketuk untuk mencoba lagi."}</Text></Pressable> : list.length === 0 ? <Text style={s.message}>Belum ada karyawan yang sesuai.</Text> : <View style={s.card}>{list.map((employee,index)=><View key={employee.id} style={[s.employeeRow,index !== list.length-1 && s.rowBorder,!employee.active && s.inactiveRow]}>
        {/* [MODIFIED] Ikon identitas dan seluruh informasi disejajarkan vertikal seperti baris Outlet. */}
        <View style={s.personIcon}><Ionicons name="person-outline" size={22} color="#F5B900"/></View>
        <View style={s.employeeInfo}><View style={s.nameLine}><Text numberOfLines={1} style={s.employeeName}>{employee.name}</Text><Text style={s.roleBadge}>{roleLabel(employee.role,employee.customTitle)}</Text><Text style={[s.statusBadge,employee.active ? s.active : s.inactive]}>{employee.active ? "Aktif" : "Nonaktif"}</Text></View><Text numberOfLines={1} style={s.outletName}>{(employee.outletNames?.map(o=>o.name).join(" · ") || employee.outletName).toUpperCase()}</Text><Text numberOfLines={1} style={s.lastLogin}>Masuk {dateLabel(employee.lastLoginAt)}</Text></View>
        {/* [MODIFIED] Toggle status langsung seperti halaman Produk, tanpa dialog konfirmasi. */}
        <View style={s.actions}>{canDeactivateEmployee ? <Switch value={employee.active} onValueChange={(active)=>setEmployeeActive.mutate({id:employee.id,active})} disabled={setEmployeeActive.isPending} accessibilityRole="switch" accessibilityLabel={`Status ${employee.name}`} accessibilityHint="Aktifkan atau nonaktifkan akses karyawan" trackColor={{false:"#E5E7EB",true:"#16835E"}} thumbColor="#FFFFFF" ios_backgroundColor="#E5E7EB" style={s.statusSwitch}/> : null}{canEditEmployee ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${employee.name}`} onPress={()=>openEdit(employee)} style={s.editButton}><Ionicons name="create-outline" size={20} color="#6B7280"/></Pressable> : null}{canResetEmployeePin ? <Pressable accessibilityRole="button" accessibilityLabel={`Buat barcode baru untuk ${employee.name}`} onPress={()=>askBarcode(employee)} style={s.barcodeButton}><Ionicons name="barcode-outline" size={20} color="#F5B900"/></Pressable> : null}</View>
      </View>)}</View>}
    </ScrollView>
    {/* [ADDED] Pencarian membesar dari tengah header seperti animasi pencarian Kasir. */}
    <Modal visible={searchVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSearch}>
      <View style={s.searchModalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" style={StyleSheet.absoluteFill} onPress={closeSearch}/>
        <Animated.View style={[s.searchModalField,{top:insets.top+8,width:searchAnimation.interpolate({inputRange:[0,1],outputRange:[0,searchWidth]}),opacity:searchAnimation,transform:[{scaleX:searchAnimation}]}]}>
          <Ionicons name="search-outline" size={21} color="#6B7280"/>
          <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Cari nama karyawan..." placeholderTextColor="#89958E" returnKeyType="search" style={s.searchInput}/>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={closeSearch} style={s.searchCloseButton}><Ionicons name="close" size={21} color="#6B7280"/></Pressable>
        </Animated.View>
      </View>
    </Modal>
    <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={()=>setEditorOpen(false)}><View style={s.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setEditorOpen(false)}/><View style={s.editor}><View style={s.modalHeader}><Text style={s.modalTitle}>{editing ? "Edit karyawan" : "Tambah karyawan"}</Text><Pressable onPress={()=>setEditorOpen(false)}><Ionicons name="close" size={23} color="#6B7280"/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled"><Text style={s.label}>Nama karyawan</Text><TextInput value={name} onChangeText={setName} placeholder="Nama lengkap" style={s.input}/><Text style={s.label}>Jabatan</Text><View style={s.choiceRow}>{(["kasir","manager","lainnya"] as EmployeeRole[]).map(v=><Pressable key={v} disabled={!!editing&&!canManageEmployeeRole} onPress={()=>changeRole(v)} style={[s.choice,role===v && s.choiceActive,!!editing&&!canManageEmployeeRole&&{opacity:.5}]}><Text style={[s.choiceText,role===v && s.choiceTextActive]}>{v === "lainnya" ? "Lainnya" : roleLabel(v)}</Text></Pressable>)}</View>{role === "lainnya" ? <><Text style={s.label}>Nama jabatan</Text><TextInput value={customTitle} onChangeText={setCustomTitle} placeholder="Contoh: Supervisor" style={s.input}/></> : null}<Text style={s.label}>Outlet (bisa lebih dari satu)</Text>{outlets.map(o=><Pressable key={o.id} disabled={!canAssignEmployeeOutlets&&o.id!==session.data?.activeOutletId} onPress={()=>toggleOutlet(o.id)} style={[s.outletChoice,!canAssignEmployeeOutlets&&o.id!==session.data?.activeOutletId&&{opacity:.5}]}><Text style={s.choiceText}>{o.name}</Text><Ionicons name={outletIds.includes(o.id) ? "checkbox" : "square-outline"} size={20} color="#F5B900"/></Pressable>)}<Text style={s.label}>Hak akses per outlet</Text><View style={s.permissionOutletTabs}>{outletIds.map((id)=>{const outlet=outlets.find((item)=>item.id===id);return <Pressable key={id} onPress={()=>setPermissionOutletId(id)} style={[s.permissionOutletTab,permissionOutletId===id&&s.permissionOutletTabActive]}><Text style={[s.permissionOutletTabText,permissionOutletId===id&&s.permissionOutletTabTextActive]}>{outlet?.name ?? `Outlet ${id}`}</Text></Pressable>})}</View><View style={s.permissionCard}>{permissionGroups.map(group=><View key={group.title} style={s.permissionGroup}><Text style={s.permissionGroupTitle}>{group.title}</Text>{group.items.map(([key,label])=>{const permissionKey=key as PermissionKey;const fixed=role === "kasir" && cashierDefaults.includes(permissionKey);const checked=(outletPermissions[String(permissionOutletId)] ?? []).includes(permissionKey);return <Pressable key={key} accessibilityRole="checkbox" accessibilityState={{checked,disabled:fixed||permissionOutletId===null}} onPress={()=>!fixed&&canManageEmployeePermissions&&togglePermission(permissionKey)} disabled={!canManageEmployeePermissions} style={[s.permissionRow,!canManageEmployeePermissions&&{opacity:.5}]}><Text style={[s.permissionLabel,fixed&&s.permissionFixed]}>{label}</Text><Ionicons name={checked?"checkbox":"square-outline"} size={20} color={checked?"#F5B900":"#9AA59E"}/></Pressable>})}</View>)}</View><Text style={s.label}>{editing ? "PIN baru (opsional)" : "PIN akses (6 digit)"}</Text><TextInput value={pin} onChangeText={v=>setPin(v.replace(/\D/g,"").slice(0,6))} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder={editing ? "Kosongkan jika tidak diubah" : "••••••"} style={s.input}/><Pressable disabled={create.isPending||update.isPending} onPress={submit} style={s.saveButton}><Text style={s.saveText}>{create.isPending||update.isPending ? "Menyimpan..." : "Simpan karyawan"}</Text></Pressable></ScrollView></View></View></Modal>
    {/* [MODIFIED] Barcode ditampilkan sebagai Code 128 yang dapat dipindai kamera/login scanner. */}
    <Modal visible={!!barcodeValue} transparent animationType="fade" onRequestClose={()=>{setBarcodeValue(null);setBarcodePin(null);}}><View style={s.barcodeBackdrop}><View style={s.barcodeModal}><View style={s.barcodeHeader}><Text style={s.modalTitle}>Barcode {barcodeName}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tutup barcode" onPress={()=>{setBarcodeValue(null);setBarcodePin(null);}}><Ionicons name="close" size={23} color="#6B7280"/></Pressable></View><Text style={s.barcodeHint}>Arahkan kamera aplikasi HeyPost ke barcode ini untuk login.</Text>{barcodeSvg ? <View style={s.barcodeImage}><SvgXml xml={barcodeSvg} width="100%" height={104}/></View> : <Text style={s.error}>Barcode tidak dapat ditampilkan. Kode: {barcodeValue}</Text>}<Text selectable style={s.barcodeValue}>{barcodeValue}</Text>{barcodePin ? <View style={s.pinInfo}><Text style={s.pinLabel}>PIN login</Text><Text selectable style={s.pinValue}>{barcodePin}</Text></View> : <Text style={s.lastLogin}>PIN karyawan tidak berubah. Barcode lama sudah tidak berlaku.</Text>}<Pressable onPress={()=>{setBarcodeValue(null);setBarcodePin(null);}} style={s.saveButton}><Text style={s.saveText}>Selesai</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({safe:{flex:1,backgroundColor:colors.surface},ink:{color:colors.ink},header:{minHeight:68,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:8,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.line},headerIcon:{width:38,height:42,alignItems:"center",justifyContent:"center"},headerTitle:{fontFamily:"Archivo-Bold",fontSize:19,color:colors.ink,letterSpacing:-.3},searchModalRoot:{flex:1,backgroundColor:"transparent"},searchModalField:{position:"absolute",left:20,height:52,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,borderRadius:14,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,elevation:8,shadowColor:"#090909",shadowOpacity:.12,shadowRadius:12,shadowOffset:{width:0,height:5}},searchInput:{flex:1,minWidth:0,color:colors.ink,fontSize:14,padding:0},searchCloseButton:{width:30,height:36,alignItems:"center",justifyContent:"center"},addButton:{width:44,height:44,borderRadius:12,backgroundColor:"#F5B900",alignItems:"center",justifyContent:"center"},content:{padding:16,paddingTop:16,paddingBottom:32,gap:13},summaryCard:{minHeight:104,flexDirection:"row",alignItems:"center",paddingVertical:16,paddingHorizontal:10,borderWidth:1,borderColor:colors.line,borderRadius:16,backgroundColor:colors.surface},summaryItem:{flex:1,alignItems:"center",justifyContent:"center",gap:8},summaryLabelRow:{flexDirection:"row",alignItems:"center",gap:6},summaryLabel:{fontSize:11,color:colors.muted,textAlign:"center"},summaryValue:{fontSize:21,fontWeight:"800",color:colors.ink},summaryDivider:{width:1,height:48,backgroundColor:colors.line},activeDot:{width:7,height:7,borderRadius:4,backgroundColor:"#16835E"},inactiveDot:{width:7,height:7,borderRadius:4,backgroundColor:"#C18A3D"},countRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},count:{fontSize:15,color:"#374151"},filterLabel:{fontSize:12,color:colors.muted},card:{borderWidth:1,borderColor:colors.line,borderRadius:16,backgroundColor:colors.surface,overflow:"hidden"},/* [MODIFIED] Baris karyawan dipadatkan dan disejajarkan seperti baris Outlet. */ employeeRow:{flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:11,paddingVertical:10,minHeight:76},inactiveRow:{opacity:0.58},rowBorder:{borderBottomWidth:1,borderBottomColor:colors.line},personIcon:{width:30,alignItems:"center",justifyContent:"center"},employeeInfo:{flex:1,minWidth:0,gap:4},nameLine:{flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:6},employeeName:{fontFamily:"Figtree-Medium",fontSize:14,color:colors.ink,fontWeight:"500",flexShrink:1},roleBadge:{fontFamily:"Figtree-Bold",fontSize:10,fontWeight:"700",color:"#176447",backgroundColor:colors.signalSoft,paddingHorizontal:8,paddingVertical:4,borderRadius:7},statusBadge:{fontFamily:"Figtree-Bold",fontSize:10,fontWeight:"700",paddingHorizontal:8,paddingVertical:4,borderRadius:7},active:{color:"#086B4A",backgroundColor:"#E2F5EA"},inactive:{color:colors.muted,backgroundColor:colors.line},outletName:{fontFamily:"Figtree-Regular",fontSize:11,color:colors.muted,letterSpacing:.2},lastLogin:{fontFamily:"Figtree-Medium",fontSize:10,color:"#849088"},actions:{flexDirection:"row",alignItems:"center",gap:2,flexShrink:0},statusSwitch:{transform:[{scaleX:0.88},{scaleY:0.88}]},editButton:{width:30,height:36,alignItems:"center",justifyContent:"center"},barcodeButton:{width:30,height:36,alignItems:"center",justifyContent:"center"},message:{padding:18,textAlign:"center",color:colors.muted,fontSize:13},error:{padding:16,color:"#B42318",fontSize:13},modalBackdrop:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(0,0,0,.35)"},editor:{maxHeight:"88%",padding:18,paddingBottom:28,borderTopLeftRadius:20,borderTopRightRadius:20,backgroundColor:colors.surface},modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12},modalTitle:{fontSize:19,fontWeight:"800",color:colors.ink},label:{fontSize:13,fontWeight:"700",color:colors.muted,marginTop:12,marginBottom:6},input:{minHeight:44,borderWidth:1,borderColor:colors.line,borderRadius:10,paddingHorizontal:12,color:colors.ink,fontSize:14},choiceRow:{flexDirection:"row",gap:8},choice:{flex:1,minHeight:40,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:colors.line,borderRadius:10},choiceActive:{backgroundColor:colors.signalSoft,borderColor:"#F5B900"},choiceText:{fontSize:13,color:colors.muted},choiceTextActive:{color:"#9A7100",fontWeight:"700"},outletChoice:{minHeight:42,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#E7EDE9"},permissionCard:{borderWidth:1,borderColor:colors.line,borderRadius:12,paddingHorizontal:12,backgroundColor:colors.ground},permissionOutletTabs:{flexDirection:"row",flexWrap:"wrap",gap:7,marginBottom:8},permissionOutletTab:{minHeight:34,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:colors.line,borderRadius:9,backgroundColor:colors.surface},permissionOutletTabActive:{borderColor:"#F5B900",backgroundColor:colors.signalSoft},permissionOutletTabText:{fontSize:12,color:colors.muted},permissionOutletTabTextActive:{color:"#9A7100",fontWeight:"700"},permissionGroup:{paddingVertical:8,borderBottomWidth:1,borderBottomColor:"#E7EDE9"},permissionGroupTitle:{fontSize:12,fontWeight:"800",color:"#F5B900",marginBottom:5},permissionRow:{minHeight:38,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},permissionLabel:{fontSize:12,color:"#34433A"},permissionFixed:{fontWeight:"800",color:"#F5B900"},saveButton:{minHeight:44,alignItems:"center",justifyContent:"center",marginTop:16,borderRadius:11,backgroundColor:"#F5B900"},saveText:{fontSize:14,fontWeight:"800",color:colors.surface},barcodeBackdrop:{flex:1,justifyContent:"center",padding:18,backgroundColor:"rgba(0,0,0,.48)"},barcodeModal:{width:"100%",maxWidth:440,alignSelf:"center",padding:20,borderRadius:18,backgroundColor:colors.surface,gap:12},barcodeHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},barcodeHint:{fontSize:13,lineHeight:19,color:colors.muted},barcodeImage:{width:"100%",height:112,alignItems:"center",justifyContent:"center",paddingHorizontal:4,borderRadius:10,backgroundColor:colors.surface,overflow:"hidden"},barcodeValue:{padding:11,textAlign:"center",fontSize:12,fontWeight:"700",color:colors.ink,backgroundColor:colors.surface,letterSpacing:.5},pinInfo:{padding:12,borderRadius:10,backgroundColor:colors.surface,gap:4},pinLabel:{fontSize:12,color:colors.muted},pinValue:{fontSize:20,fontWeight:"800",letterSpacing:2,color:colors.ink,textAlign:"center"}});

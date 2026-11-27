// [ADDED] Halaman pengelolaan karyawan dengan data langsung dari backend.
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/providers/trpc";
import { theme } from "@/constants/theme";

type EmployeeRole = "manager" | "kasir";
type EmployeeItem = { id:number; name:string; role:EmployeeRole; outletId:number; outletName:string; active:boolean; permissions:string[]; lockedUntil:Date|null; lastLoginAt:Date|null; createdAt:Date };
const roleLabel = (role:EmployeeRole) => role === "manager" ? "Manager" : "Kasir";
const dateLabel = (date:Date|null) => date ? new Date(date).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "Belum pernah masuk";

export default function EmployeesScreen() {
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
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState<"Semua"|"Aktif"|"Nonaktif">("Semua");
  const [editorOpen,setEditorOpen] = useState(false);
  const [editing,setEditing] = useState<EmployeeItem|null>(null);
  const [name,setName] = useState("");
  const [role,setRole] = useState<EmployeeRole>("kasir");
  const [outletId,setOutletId] = useState<number>(session.data?.activeOutletId ?? 0);
  const [pin,setPin] = useState("");
  const [barcodeValue,setBarcodeValue] = useState<string|null>(null);
  const [barcodeName,setBarcodeName] = useState("");
  const create = trpc.employees.create.useMutation({ onSuccess: async (result) => { await utils.employees.list.invalidate(); setEditorOpen(false); Alert.alert("Karyawan berhasil dibuat", `Simpan barcode ini untuk login:\n\n${result.barcode}\n\nPIN: ${pin}`); setPin(""); }, onError: e => Alert.alert("Gagal menambahkan karyawan",e.message) });
  const update = trpc.employees.update.useMutation({ onSuccess: async () => { await utils.employees.list.invalidate(); setEditorOpen(false); Alert.alert("Tersimpan","Data karyawan berhasil diperbarui."); }, onError:e=>Alert.alert("Gagal menyimpan",e.message) });
  const regenerate = trpc.employees.regenerateBarcode.useMutation({ onSuccess: result => { setBarcodeValue(result.barcode); }, onError:e=>Alert.alert("Barcode gagal dibuat",e.message) });
  const list = useMemo(() => (employeesQuery.data ?? []).filter((e) => `${e.name} ${e.outletName} ${roleLabel(e.role)}`.toLowerCase().includes(search.toLowerCase()) && (filter === "Semua" || (filter === "Aktif" ? e.active : !e.active))), [employeesQuery.data,search,filter]);
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
  const openCreate = () => { setEditing(null); setName(""); setRole("kasir"); setOutletId(session.data?.activeOutletId ?? outlets[0]?.id ?? 0); setPin(""); setEditorOpen(true); };
  const openEdit = (employee:EmployeeItem) => { setEditing(employee); setName(employee.name); setRole(employee.role); setOutletId(employee.outletId); setPin(""); setEditorOpen(true); };
  const submit = () => {
    if(name.trim().length < 2) return Alert.alert("Nama belum valid","Masukkan minimal 2 karakter.");
    if(!outletId) return Alert.alert("Pilih outlet","Karyawan harus terhubung ke outlet.");
    if(editing) update.mutate({ id:editing.id, name:name.trim(), role, outletId, ...(pin ? {pin} : {}) });
    else if(!/^\d{6}$/.test(pin)) Alert.alert("PIN tidak valid","PIN harus terdiri dari 6 digit angka.");
    else create.mutate({ name:name.trim(), role, outletId, pin });
  };
  const askBarcode = (employee:EmployeeItem) => Alert.alert("Buat barcode baru?", `Barcode lama ${employee.name} tidak akan berlaku lagi.`, [{text:"Batal",style:"cancel"},{text:"Buat barcode",onPress:()=>{setBarcodeName(employee.name);setBarcodeValue(null);regenerate.mutate({id:employee.id});}}]);
  const toggleActive = (employee:EmployeeItem) => Alert.alert(employee.active ? "Nonaktifkan karyawan?" : "Aktifkan karyawan?", `${employee.name} ${employee.active ? "tidak dapat" : "dapat kembali"} masuk setelah status diubah.`, [{text:"Batal",style:"cancel"},{text:"Lanjutkan",onPress:()=>update.mutate({id:employee.id,active:!employee.active})}]);

  return <SafeAreaView style={s.safe} edges={["top","left","right"]}>
    {/* [MODIFIED] Judul halaman dipindahkan ke header seperti halaman Outlet. */}
    <View style={s.header}><Pressable onPress={()=>router.back()} style={s.headerIcon}><Ionicons name="arrow-back" size={23} color={s.ink.color as string}/></Pressable><Text style={s.headerTitle}>Karyawan</Text><View style={{flex:1}}/><Pressable accessibilityRole="button" accessibilityLabel="Cari karyawan" onPress={openSearch} style={s.headerIcon}><Ionicons name="search-outline" size={23} color="#53635B"/></Pressable><Pressable onPress={()=>setFilter(v=>v === "Semua" ? "Aktif" : v === "Aktif" ? "Nonaktif" : "Semua")} style={s.headerIcon}><Ionicons name="filter-outline" size={23} color="#53635B"/></Pressable><Pressable onPress={openCreate} style={s.addButton}><Ionicons name="add" size={27} color="#FFFFFF"/></Pressable></View>
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
      {employeesQuery.isLoading ? <Text style={s.message}>Memuat karyawan...</Text> : employeesQuery.isError ? <Pressable onPress={()=>employeesQuery.refetch()}><Text style={s.error}>{employeesQuery.error.message.includes("hanya untuk owner") ? "Akses dibatasi. Masuk menggunakan akun owner untuk mengelola karyawan." : "Gagal memuat data. Ketuk untuk mencoba lagi."}</Text></Pressable> : list.length === 0 ? <Text style={s.message}>Belum ada karyawan yang sesuai.</Text> : <View style={s.card}>{list.map((employee,index)=><View key={employee.id} style={[s.employeeRow,index !== list.length-1 && s.rowBorder]}>
        <View style={s.personIcon}><Ionicons name="person-outline" size={26} color="#087B58"/></View>
        <View style={s.employeeInfo}><View style={s.nameLine}><Text style={s.employeeName}>{employee.name}</Text><Text style={s.roleBadge}>{roleLabel(employee.role)}</Text><Text style={[s.statusBadge,employee.active ? s.active : s.inactive]}>{employee.active ? "Aktif" : "Nonaktif"}</Text></View><Text style={s.outletName}>{employee.outletName.toUpperCase()}</Text><Text style={s.lastLogin}>Masuk {dateLabel(employee.lastLoginAt)}</Text><View style={s.actions}><Pressable accessibilityLabel="Edit karyawan" onPress={()=>openEdit(employee)} style={s.editButton}><Ionicons name="pencil-outline" size={21} color="#53635B"/></Pressable><Pressable onPress={()=>askBarcode(employee)} style={s.barcodeButton}><Ionicons name="refresh-outline" size={22} color="#17241D"/><Text style={s.barcodeText}>Barcode baru</Text></Pressable><Pressable accessibilityLabel={employee.active ? "Nonaktifkan" : "Aktifkan"} onPress={()=>toggleActive(employee)} style={s.moreButton}><Ionicons name={employee.active ? "pause-circle-outline" : "play-circle-outline"} size={21} color="#53635B"/></Pressable></View></View>
      </View>)}</View>}
    </ScrollView>
    {/* [ADDED] Pencarian membesar dari tengah header seperti animasi pencarian Kasir. */}
    <Modal visible={searchVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSearch}>
      <View style={s.searchModalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" style={StyleSheet.absoluteFill} onPress={closeSearch}/>
        <Animated.View style={[s.searchModalField,{top:insets.top+8,width:searchAnimation.interpolate({inputRange:[0,1],outputRange:[0,searchWidth]}),opacity:searchAnimation,transform:[{scaleX:searchAnimation}]}]}>
          <Ionicons name="search-outline" size={21} color="#68756D"/>
          <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Cari nama karyawan..." placeholderTextColor="#89958E" returnKeyType="search" style={s.searchInput}/>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={closeSearch} style={s.searchCloseButton}><Ionicons name="close" size={21} color="#68756D"/></Pressable>
        </Animated.View>
      </View>
    </Modal>
    <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={()=>setEditorOpen(false)}><View style={s.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setEditorOpen(false)}/><View style={s.editor}><View style={s.modalHeader}><Text style={s.modalTitle}>{editing ? "Edit karyawan" : "Tambah karyawan"}</Text><Pressable onPress={()=>setEditorOpen(false)}><Ionicons name="close" size={23} color="#53635B"/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled"><Text style={s.label}>Nama karyawan</Text><TextInput value={name} onChangeText={setName} placeholder="Nama lengkap" style={s.input}/><Text style={s.label}>Jabatan</Text><View style={s.choiceRow}>{(["kasir","manager"] as EmployeeRole[]).map(v=><Pressable key={v} onPress={()=>setRole(v)} style={[s.choice,role===v && s.choiceActive]}><Text style={[s.choiceText,role===v && s.choiceTextActive]}>{roleLabel(v)}</Text></Pressable>)}</View><Text style={s.label}>Outlet</Text>{outlets.map(o=><Pressable key={o.id} onPress={()=>setOutletId(o.id)} style={s.outletChoice}><Text style={s.choiceText}>{o.name}</Text><Ionicons name={outletId===o.id ? "radio-button-on" : "radio-button-off"} size={19} color="#087B58"/></Pressable>)}<Text style={s.label}>{editing ? "PIN baru (opsional)" : "PIN akses (6 digit)"}</Text><TextInput value={pin} onChangeText={v=>setPin(v.replace(/\D/g,"").slice(0,6))} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder={editing ? "Kosongkan jika tidak diubah" : "••••••"} style={s.input}/><Pressable disabled={create.isPending||update.isPending} onPress={submit} style={s.saveButton}><Text style={s.saveText}>{create.isPending||update.isPending ? "Menyimpan..." : "Simpan karyawan"}</Text></Pressable></ScrollView></View></View></Modal>
    <Modal visible={!!barcodeValue} transparent animationType="fade" onRequestClose={()=>setBarcodeValue(null)}><View style={s.modalBackdrop}><View style={s.barcodeModal}><Text style={s.modalTitle}>Barcode {barcodeName}</Text><Text style={s.barcodeValue}>{barcodeValue}</Text><Text style={s.lastLogin}>Simpan kode ini. Barcode lama sudah tidak berlaku.</Text><Pressable onPress={()=>setBarcodeValue(null)} style={s.saveButton}><Text style={s.saveText}>Selesai</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F1F7F3"},ink:{color:"#17241D"},header:{minHeight:68,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:8,backgroundColor:"#FFFFFF",borderBottomWidth:1,borderBottomColor:"#DCE5DF"},headerIcon:{width:38,height:42,alignItems:"center",justifyContent:"center"},headerTitle:{fontFamily:"Archivo-Bold",fontSize:19,color:"#15231C",letterSpacing:-.3},searchModalRoot:{flex:1,backgroundColor:"transparent"},searchModalField:{position:"absolute",left:20,height:52,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,borderRadius:14,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#D6E0D9",elevation:8,shadowColor:"#17241D",shadowOpacity:.12,shadowRadius:12,shadowOffset:{width:0,height:5}},searchInput:{flex:1,minWidth:0,color:"#17241D",fontSize:14,padding:0},searchCloseButton:{width:30,height:36,alignItems:"center",justifyContent:"center"},addButton:{width:44,height:44,borderRadius:12,backgroundColor:"#087B58",alignItems:"center",justifyContent:"center"},content:{padding:16,paddingTop:16,paddingBottom:32,gap:13},summaryCard:{minHeight:104,flexDirection:"row",alignItems:"center",paddingVertical:16,paddingHorizontal:10,borderWidth:1,borderColor:"#D6E0D9",borderRadius:16,backgroundColor:"#FFFFFF"},summaryItem:{flex:1,alignItems:"center",justifyContent:"center",gap:8},summaryLabelRow:{flexDirection:"row",alignItems:"center",gap:6},summaryLabel:{fontSize:11,color:"#68756D",textAlign:"center"},summaryValue:{fontSize:21,fontWeight:"800",color:"#17241D"},summaryDivider:{width:1,height:48,backgroundColor:"#DCE5DF"},activeDot:{width:7,height:7,borderRadius:4,backgroundColor:"#16835E"},inactiveDot:{width:7,height:7,borderRadius:4,backgroundColor:"#C18A3D"},countRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},count:{fontSize:15,color:"#26342C"},filterLabel:{fontSize:12,color:"#68756D"},card:{borderWidth:1,borderColor:"#D6E0D9",borderRadius:16,backgroundColor:"#FFFFFF",overflow:"hidden"},employeeRow:{flexDirection:"row",alignItems:"flex-start",gap:12,paddingHorizontal:13,paddingVertical:15},rowBorder:{borderBottomWidth:1,borderBottomColor:"#DCE5DF"},personIcon:{width:32,paddingTop:8,alignItems:"center"},employeeInfo:{flex:1,minWidth:0,gap:7},nameLine:{flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:7},employeeName:{fontSize:16,color:"#17241D",fontWeight:"500"},roleBadge:{fontSize:11,fontWeight:"700",color:"#176447",backgroundColor:"#EAF4ED",paddingHorizontal:9,paddingVertical:5,borderRadius:7},statusBadge:{fontSize:11,fontWeight:"700",paddingHorizontal:9,paddingVertical:5,borderRadius:7},active:{color:"#086B4A",backgroundColor:"#E2F5EA"},inactive:{color:"#68756D",backgroundColor:"#EEF1EF"},outletName:{fontSize:12,color:"#68756D",letterSpacing:.2},lastLogin:{fontSize:12,color:"#849088"},actions:{flexDirection:"row",alignItems:"center",gap:8,marginTop:3},editButton:{width:42,height:42,borderWidth:1,borderColor:"#D6E0D9",borderRadius:11,alignItems:"center",justifyContent:"center"},barcodeButton:{height:42,paddingHorizontal:12,borderWidth:1,borderColor:"#D6E0D9",borderRadius:11,flexDirection:"row",alignItems:"center",gap:8},barcodeText:{fontSize:13,fontWeight:"700",color:"#17241D"},moreButton:{width:38,height:40,alignItems:"center",justifyContent:"center"},message:{padding:18,textAlign:"center",color:"#68756D",fontSize:13},error:{padding:16,color:"#B42318",fontSize:13},modalBackdrop:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(0,0,0,.35)"},editor:{maxHeight:"88%",padding:18,paddingBottom:28,borderTopLeftRadius:20,borderTopRightRadius:20,backgroundColor:"#FFFFFF"},modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12},modalTitle:{fontSize:19,fontWeight:"800",color:"#17241D"},label:{fontSize:13,fontWeight:"700",color:"#53635B",marginTop:12,marginBottom:6},input:{minHeight:44,borderWidth:1,borderColor:"#D6E0D9",borderRadius:10,paddingHorizontal:12,color:"#17241D",fontSize:14},choiceRow:{flexDirection:"row",gap:8},choice:{flex:1,minHeight:40,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#D6E0D9",borderRadius:10},choiceActive:{backgroundColor:"#E4F5EC",borderColor:"#087B58"},choiceText:{fontSize:13,color:"#53635B"},choiceTextActive:{color:"#075D43",fontWeight:"700"},outletChoice:{minHeight:42,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#E7EDE9"},saveButton:{minHeight:44,alignItems:"center",justifyContent:"center",marginTop:16,borderRadius:11,backgroundColor:"#087B58"},saveText:{fontSize:14,fontWeight:"800",color:"#FFFFFF"},barcodeModal:{margin:22,padding:20,borderRadius:18,backgroundColor:"#FFFFFF",gap:12},barcodeValue:{padding:14,textAlign:"center",fontSize:16,fontWeight:"800",color:"#17241D",backgroundColor:"#F1F7F3",letterSpacing:1}});

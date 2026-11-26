// [ADDED] Settings hub; detailed account, outlet, staff, expenses, receipt and device pages are separate routes.
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton, AppScreen, PageHeading, Panel, Tag } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
const links=[{title:"Kelola outlet",subtitle:"Tambah outlet dan pindahkan outlet aktif",route:"/outlets",roles:["owner"]},{title:"Karyawan",subtitle:"Akun, role, akses, dan barcode karyawan",route:"/employees",roles:["owner"]},{title:"Pengeluaran",subtitle:"Biaya operasional dan riwayat pengeluaran",route:"/expenses",roles:["owner","manager"]},{title:"Pengaturan struk",subtitle:"Atur informasi dan footer pada struk",route:"/receipt",roles:["owner"]},{title:"Printer perangkat",subtitle:"Preferensi printer dan ukuran kertas lokal",route:"/printer",roles:["owner"]}];
export default function SettingsScreen(){
 const utils=trpc.useUtils();const query=trpc.auth.me.useQuery();const logout=trpc.auth.logout.useMutation({onSuccess:async()=>{await utils.auth.me.invalidate();router.replace("/login");},onError:e=>Alert.alert("Gagal keluar",e.message)});
 const role=query.data?.principal.role??"kasir";
 return <AppScreen><PageHeading eyebrow="PREFERENSI TOKO" title="Pengaturan" subtitle={query.data?.store.name??"Kelola akun dan perangkat HeyPost."}/>
 <Panel><Text style={s.name}>{query.data?.principal.name??"Akun"}</Text><Text style={s.muted}>{query.data?.principal.email??"Akun karyawan"}</Text><View style={s.row}><Tag>{role.toUpperCase()}</Tag><Text style={s.muted}>{query.data?.outlets.find(o=>o.id===query.data?.activeOutletId)?.name??"Outlet aktif"}</Text></View></Panel>
 {links.filter(item=>item.roles.includes(role)).map(item=><Pressable key={item.route} onPress={()=>router.push(item.route as never)}><Panel><View style={s.row}><View style={{flex:1,gap:4}}><Text style={s.name}>{item.title}</Text><Text style={s.muted}>{item.subtitle}</Text></View><Text style={s.arrow}>›</Text></View></Panel></Pressable>)}
 <Panel><Text style={s.name}>Sesi akun</Text><Text style={s.muted}>Keluar akan menghapus sesi tersimpan pada perangkat ini.</Text><ActionButton title="Keluar dari akun" danger loading={logout.isPending} onPress={()=>Alert.alert("Keluar dari HeyPost?", "Anda perlu masuk kembali untuk menggunakan aplikasi.",[{text:"Batal",style:"cancel"},{text:"Keluar",style:"destructive",onPress:()=>logout.mutate()}])}/></Panel>
 </AppScreen>;
}
const s=StyleSheet.create({name:{fontSize:15,fontWeight:"800",color:theme.colors.ink},muted:{fontSize:12,color:theme.colors.muted},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},arrow:{fontSize:24,color:theme.colors.signal}});
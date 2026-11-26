// [ADDED] Owner outlet list, active-outlet switching and outlet creation.
import { useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { ActionButton, AppScreen, EmptyState, Field, PageHeading, Panel, Tag } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
export default function OutletsScreen(){
 const utils=trpc.useUtils();const query=trpc.auth.me.useQuery();const [open,setOpen]=useState(false);const [name,setName]=useState("");const [address,setAddress]=useState("");const [whatsapp,setWhatsapp]=useState("");
 const switchOutlet=trpc.store.switchOutlet.useMutation({onSuccess:async()=>{await utils.auth.me.invalidate();await Promise.all([utils.pos.bootstrap.invalidate(),utils.pos.listProducts.invalidate(),utils.pos.transactions.invalidate()]);Alert.alert("Outlet aktif diperbarui","Data outlet akan dimuat ulang.");},onError:e=>Alert.alert("Gagal",e.message)});
 const create=trpc.store.createOutlet.useMutation({onSuccess:async()=>{await utils.auth.me.invalidate();setOpen(false);setName("");setAddress("");setWhatsapp("");},onError:e=>Alert.alert("Gagal",e.message)});
 if(!query.data || query.data.principal.role!=="owner")return <AppScreen><EmptyState title="Akses khusus owner"/></AppScreen>;
 const data=query.data;
 return <AppScreen><PageHeading title="Outlet" subtitle="Kelola lokasi usaha dan outlet aktif." right={<ActionButton title="Tambah" compact onPress={()=>setOpen(true)}/>}/>
 {data.outlets.map(o=><Panel key={o.id}><View style={s.row}><View style={{flex:1,gap:5}}><Text style={s.name}>{o.name}</Text><Text style={s.muted}>{o.address||"Alamat belum diatur"}</Text><Tag tone={data.activeOutletId===o.id?"green":o.active?"neutral":"red"}>{data.activeOutletId===o.id?"Outlet aktif":o.active?"Aktif":"Nonaktif"}</Tag></View>{data.activeOutletId!==o.id&&o.active?<ActionButton title="Pilih" compact secondary onPress={()=>switchOutlet.mutate({outletId:o.id})}/>:null}</View></Panel>)}
 {!data.outlets.length?<EmptyState title="Belum ada outlet"/>:null}
 <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setOpen(false)}><AppScreen><PageHeading title="Tambah outlet"/><Field label="Nama outlet" value={name} onChangeText={setName} placeholder="Nama cabang"/><Field label="Alamat (opsional)" value={address} onChangeText={setAddress} placeholder="Alamat outlet" multiline/><Field label="Nomor WhatsApp (opsional)" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="08..."/><ActionButton title="Simpan outlet" loading={create.isPending} disabled={!name.trim()} onPress={()=>create.mutate({name:name.trim(),address:address.trim()||undefined,whatsappNumber:whatsapp.trim()||null})}/><ActionButton title="Batal" secondary onPress={()=>setOpen(false)}/></AppScreen></Modal>
 </AppScreen>;
}
const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},name:{fontSize:14,fontWeight:"800",color:theme.colors.ink},muted:{fontSize:12,color:theme.colors.muted}});
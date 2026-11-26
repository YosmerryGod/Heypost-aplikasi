// [ADDED] Operating expense list, date filtering and cancellation.
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag, formatRupiah } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
export default function ExpensesScreen(){
 const utils=trpc.useUtils();const session=trpc.auth.me.useQuery();const canCancel=session.data?.principal.role==="owner";const [from,setFrom]=useState(today());const [to,setTo]=useState(today());const query=trpc.expenses.list.useQuery({fromDate:from,toDate:to},{enabled:from<=to});const cancel=trpc.expenses.cancel.useMutation({onSuccess:()=>void utils.expenses.list.invalidate(),onError:e=>Alert.alert("Gagal",e.message)});
 if(query.isLoading)return <AppScreen><LoadingState/></AppScreen>;if(query.error)return <AppScreen><ErrorState message={query.error.message} retry={()=>void query.refetch()}/></AppScreen>;
 const rows=query.data??[];const total=rows.filter(r=>r.status==="Aktif").reduce((s,r)=>s+r.amount,0);
 return <AppScreen><PageHeading title="Pengeluaran" subtitle="Pantau biaya operasional outlet."/><View style={s.filters}><View style={{flex:1}}><Field label="Dari tanggal" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD"/></View><View style={{flex:1}}><Field label="Sampai tanggal" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD"/></View></View><Panel><Text style={s.muted}>Total pengeluaran aktif</Text><Text style={s.total}>{formatRupiah(total)}</Text></Panel>
 {rows.length?rows.map(r=><Panel key={r.id}><View style={s.row}><View style={{flex:1,gap:4}}><Text style={s.name}>{r.category}</Text><Text style={s.muted}>{r.description||r.paymentMethod} · {r.expenseDate}</Text><Tag tone={r.status==="Aktif"?"green":"red"}>{r.status}</Tag></View><View style={{alignItems:"flex-end",gap:8}}><Text style={s.name}>{formatRupiah(r.amount)}</Text>{canCancel&&r.status==="Aktif"?<ActionButton title="Batalkan" compact danger onPress={()=>Alert.alert("Batalkan pengeluaran?", "Catatan akan tetap tersimpan sebagai dibatalkan.",[{text:"Kembali",style:"cancel"},{text:"Batalkan",style:"destructive",onPress:()=>cancel.mutate({id:r.id})}])}/>:null}</View></View></Panel>):<EmptyState title="Belum ada pengeluaran" description="Tidak ada catatan pada rentang tanggal ini."/>}
 </AppScreen>;
}
const s=StyleSheet.create({filters:{flexDirection:"row",gap:10},row:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:10},name:{fontSize:14,fontWeight:"700",color:theme.colors.ink},muted:{fontSize:11,color:theme.colors.muted},total:{fontSize:20,fontWeight:"800",color:theme.colors.ink}});
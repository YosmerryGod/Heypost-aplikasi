// [ADDED] Sales dashboard backed by pos.summary with range and outlet scope filters.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppScreen, EmptyState, ErrorState, LoadingState, PageHeading, Panel, Tag, formatRupiah } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
export default function ReportsScreen(){
 const session=trpc.auth.me.useQuery(); const [range,setRange]=useState<"today"|"week"|"month"|"all">("week"); const [allOutlets,setAllOutlets]=useState(false);
 const query=trpc.pos.summary.useQuery({range,allOutlets});
 if(query.isLoading)return <AppScreen><LoadingState/></AppScreen>; if(query.error)return <AppScreen><ErrorState message={query.error.message} retry={()=>void query.refetch()}/></AppScreen>;
 const data=query.data; if(!data)return <AppScreen><EmptyState title="Belum ada laporan"/></AppScreen>;
 const max=Math.max(1,...data.daily.map(d=>d.revenue));
 return <AppScreen><PageHeading eyebrow="PERFORMA BISNIS" title="Laporan penjualan" subtitle="Ringkasan penjualan pada periode terpilih."/>
 <View style={s.filters}>{(["today","week","month","all"] as const).map((v)=><Tag key={v} tone={range===v?"green":"neutral"}><Text onPress={()=>setRange(v)}>{({today:"Hari ini",week:"7 hari",month:"Bulan",all:"Semua"})[v]}</Text></Tag>)}</View>
 {session.data?.principal.role==="owner"?<View style={s.filters}><Tag tone={!allOutlets?"green":"neutral"}><Text onPress={()=>setAllOutlets(false)}>Outlet ini</Text></Tag><Tag tone={allOutlets?"green":"neutral"}><Text onPress={()=>setAllOutlets(true)}>Semua outlet</Text></Tag></View>:null}
 <View style={s.grid}><Panel style={{flex:1}}><Text style={s.label}>Pendapatan</Text><Text style={s.metric}>{formatRupiah(data.revenue)}</Text></Panel><Panel style={{flex:1}}><Text style={s.label}>Transaksi</Text><Text style={s.metric}>{data.orders}</Text></Panel></View>
 <View style={s.grid}><Panel style={{flex:1}}><Text style={s.label}>Produk terjual</Text><Text style={s.metric}>{data.itemsSold}</Text></Panel><Panel style={{flex:1}}><Text style={s.label}>Rata-rata transaksi</Text><Text style={s.metric}>{formatRupiah(data.average)}</Text></Panel></View>
 <Panel><Text style={s.heading}>Tren penjualan</Text>{data.daily.length?data.daily.map((d)=><View key={d.date} style={s.chartRow}><View style={s.chartLabel}><Text style={s.label}>{d.label}</Text><Text style={s.small}>{formatRupiah(d.revenue)}</Text></View><View style={s.track}><View style={[s.bar,{width:`${Math.max(2,d.revenue/max*100)}%`}]} /></View></View>):<EmptyState title="Belum ada penjualan"/>}</Panel>
 <Panel><Text style={s.heading}>Metode pembayaran</Text>{data.payments.map(p=><View key={p.method} style={s.row}><Text style={s.name}>{p.method}</Text><Text style={s.name}>{formatRupiah(p.total)}</Text></View>)}</Panel>
 <Panel><Text style={s.heading}>Produk terlaris</Text>{data.topProducts.length?data.topProducts.map((p,i)=><View key={p.name} style={s.row}><View style={{flex:1}}><Text style={s.name}>{i+1}. {p.name}</Text><Text style={s.small}>{p.quantity} unit</Text></View><Text style={s.name}>{formatRupiah(p.revenue)}</Text></View>):<EmptyState title="Belum ada produk terjual"/>}</Panel>
 </AppScreen>;
}
const s=StyleSheet.create({filters:{flexDirection:"row",flexWrap:"wrap",gap:8},grid:{flexDirection:"row",gap:10},label:{fontSize:12,color:theme.colors.muted},metric:{fontSize:17,fontWeight:"800",color:theme.colors.ink},heading:{fontSize:15,fontWeight:"800",color:theme.colors.ink},chartRow:{gap:6},chartLabel:{flexDirection:"row",justifyContent:"space-between"},small:{fontSize:11,color:theme.colors.muted},track:{height:8,borderRadius:8,backgroundColor:"#e8eeea",overflow:"hidden"},bar:{height:8,backgroundColor:theme.colors.signal,borderRadius:8},row:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},name:{fontSize:13,fontWeight:"700",color:theme.colors.ink}});
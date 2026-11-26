// [MODIFIED] Role-aware native bottom navigation; backend remains authoritative for access checks.
import { Tabs } from "expo-router";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
export default function WorkspaceLayout() {
  const session=trpc.auth.me.useQuery();
  const principal=session.data?.principal;
  const owner=principal?.role==="owner";
  const can=(permission:"pos.access"|"history.daily.view"|"menu.create"|"menu.edit"|"stock.edit"|"reports.sales.view")=>owner||principal?.permissions.includes(permission)===true;
  return <Tabs screenOptions={{ headerShown:false,tabBarActiveTintColor:theme.colors.signal,tabBarInactiveTintColor:theme.colors.muted,tabBarStyle:{height:66,paddingTop:7,paddingBottom:8,borderTopColor:theme.colors.line,backgroundColor:theme.colors.surface},tabBarLabelStyle:{fontSize:10,fontWeight:"700"},sceneStyle:{backgroundColor:theme.colors.ground} }}>
    <Tabs.Screen name="index" options={{title:"Kasir",tabBarLabel:"Kasir",href:can("pos.access")?undefined:null}}/>
    <Tabs.Screen name="transactions" options={{title:"Transaksi",tabBarLabel:"Transaksi",href:can("history.daily.view")?undefined:null}}/>
    <Tabs.Screen name="products" options={{title:"Produk",tabBarLabel:"Produk",href:can("menu.create")||can("menu.edit")||can("stock.edit")?undefined:null}}/>
    <Tabs.Screen name="reports" options={{title:"Laporan",tabBarLabel:"Laporan",href:can("reports.sales.view")?undefined:null}}/>
    <Tabs.Screen name="settings" options={{title:"Pengaturan",tabBarLabel:"Pengaturan"}}/>
  </Tabs>;
}
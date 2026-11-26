// [MODIFIED] Route authenticated sessions directly to the native workspace.
import { Redirect } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
export default function IndexScreen(){
 const session=trpc.auth.me.useQuery(undefined,{retry:false,staleTime:30000});
 if(session.isLoading)return <Screen scroll={false}><View style={s.center}><Text style={s.muted}>Menghubungkan ke HeyPost...</Text></View></Screen>;
 if(session.data)return <Redirect href="/(app)"/>;
 return <Redirect href="/login"/>;
}
const s=StyleSheet.create({center:{flex:1,alignItems:"center",justifyContent:"center"},muted:{color:theme.colors.muted,fontSize:14}});
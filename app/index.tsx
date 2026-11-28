// [MODIFIED] Route authenticated sessions directly to the native workspace.
import { Redirect } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { LoadingState } from "@/components/native-ui"; // [MODIFIED] Skeleton saat memeriksa sesi.
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
export default function IndexScreen(){
 const session=trpc.auth.me.useQuery(undefined,{retry:false,staleTime:30000});
 if(session.isLoading)return <Screen scroll={false}><View style={{ padding: 20 }}><LoadingState variant="list" /></View></Screen>;
 if(session.data)return <Redirect href="/(app)/(tabs)/cashier"/>;
 return <Redirect href="/login"/>;
}

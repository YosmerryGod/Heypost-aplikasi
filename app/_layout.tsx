// [MODIFIED] Load HeyPost brand fonts before rendering the native app.
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from "@expo-google-fonts/archivo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { TRPCProvider } from "@/providers/trpc";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Figtree-Regular": Figtree_400Regular,
    "Figtree-Medium": Figtree_500Medium,
    "Figtree-SemiBold": Figtree_600SemiBold,
    "Figtree-Bold": Figtree_700Bold,
    "Archivo-Medium": Archivo_500Medium,
    "Archivo-SemiBold": Archivo_600SemiBold,
    "Archivo-Bold": Archivo_700Bold,
    "Archivo-ExtraBold": Archivo_800ExtraBold,
  });
  if (!fontsLoaded) return null;
  return <SafeAreaProvider><TRPCProvider><StatusBar style="dark"/><Stack screenOptions={{header:()=><WorkspaceHeader/>,headerShown:true,contentStyle:{backgroundColor:theme.colors.ground},animation:"fade"}}><Stack.Screen name="(app)" options={{headerShown:false}}/><Stack.Screen name="login" options={{headerShown:false}}/><Stack.Screen name="register" options={{headerShown:false}}/><Stack.Screen name="auth/google" options={{headerShown:false}}/></Stack></TRPCProvider></SafeAreaProvider>;
}
// [MODIFIED] Load HeyPost brand fonts before rendering the native app.
import { Stack } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Appearance, DeviceEventEmitter, Easing, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from "@expo-google-fonts/archivo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getTheme } from "@/constants/theme";
import { TRPCProvider } from "@/providers/trpc";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ToastHost } from "@/components/native-ui"; // [ADDED] Satu sistem toast profesional untuk seluruh aplikasi.

// [REMOVED] Loader kotak global dihapus agar perpindahan halaman tidak menutupi konten.

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const themeTransition = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("heypost:theme-transition", () => {
      themeTransition.stopAnimation();
      themeTransition.setValue(1);
      Animated.timing(themeTransition, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
    return () => subscription.remove();
  }, [themeTransition]);
  // [MODIFIED] Pulihkan preferensi tema tanpa me-reload aplikasi.
  useEffect(() => {
    let active = true;
    const restoreAppearance = async () => {
      try {
        const savedScheme = await SecureStore.getItemAsync("heypost-color-scheme");
        if (!active || (savedScheme !== "light" && savedScheme !== "dark")) return;
        Appearance.setColorScheme(savedScheme);
      } catch (error) {
        console.warn("[THEME] Gagal memulihkan preferensi tema:", error);
      }
    };
    void restoreAppearance();
    return () => { active = false; };
  }, []);

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
  // [REMOVED] Overlay dan timer loading setiap perubahan route dihapus.
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <TRPCProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ header: () => <WorkspaceHeader />, headerShown: true, contentStyle: { backgroundColor: colors.ground }, animation: "fade" }}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          {/* [MODIFIED] Registrasi memakai layar penuh tanpa WorkspaceHeader. */}
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="auth/google" options={{ headerShown: false }} />
        </Stack>
        {/* [MODIFIED] Toast profesional dipertahankan; overlay loading global dihapus. */}
        <ToastHost />
        <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 9998, backgroundColor: colors.ground, opacity: themeTransition }} />
      </TRPCProvider>
    </SafeAreaProvider>
  );
}

// [REMOVED] Style khusus overlay loading global tidak lagi diperlukan.

// [MODIFIED] Load HeyPost brand fonts before rendering the native app.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from "@expo-google-fonts/archivo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { TRPCProvider } from "@/providers/trpc";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

// [ADDED] Loader kotak kecil untuk memberi feedback saat route aplikasi berubah.
function SquarePageLoader() {
  const squares = useRef([new Animated.Value(0.35), new Animated.Value(0.35), new Animated.Value(0.35), new Animated.Value(0.35)]).current;

  useEffect(() => {
    const animations = squares.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 90),
          Animated.timing(value, { toValue: 1, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.35, duration: 260, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.delay((3 - index) * 90),
        ]),
      ),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [squares]);

  return (
    <View style={styles.loaderBackdrop} pointerEvents="auto">
      <View style={styles.loaderCard} accessibilityRole="progressbar" accessibilityLabel="Memuat halaman">
        <View style={styles.squareGrid}>
          {squares.map((value, index) => (
            <Animated.View key={index} style={[styles.loaderSquare, { opacity: value, transform: [{ scale: value }] }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

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
  // [ADDED] Pantau semua perubahan route, termasuk perpindahan antar-tab dan halaman Stack.
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setPageLoading(true);
    const timeout = setTimeout(() => setPageLoading(false), 520);
    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <TRPCProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ header: () => <WorkspaceHeader />, headerShown: true, contentStyle: { backgroundColor: theme.colors.ground }, animation: "fade" }}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/google" options={{ headerShown: false }} />
        </Stack>
        {/* [ADDED] Overlay global tampil singkat setiap pathname berubah. */}
        {pageLoading ? <SquarePageLoader /> : null}
      </TRPCProvider>
    </SafeAreaProvider>
  );
}

// [ADDED] Tampilan loader mengikuti warna aksen HeyPost dan tidak mengubah layout halaman.
const styles = StyleSheet.create({
  loaderBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    elevation: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.16)",
  },
  loaderCard: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  squareGrid: {
    width: 30,
    height: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  loaderSquare: {
    width: 13,
    height: 13,
    borderRadius: 3,
    backgroundColor: theme.colors.signal,
  },
});

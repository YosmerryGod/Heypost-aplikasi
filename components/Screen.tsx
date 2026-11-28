import { useMemo } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTheme, type ThemeColors } from "@/constants/theme";

type ScreenProps = PropsWithChildren<{
  header?: ReactNode;
  scroll?: boolean;
  // [ADDED] Izinkan layar tertentu memakai lebar penuh tanpa padding luar.
  fullBleed?: boolean;
  // [ADDED] Memaksa tema layar tanpa mengubah preferensi global aplikasi.
  forceDark?: boolean;
}>;

export function Screen({ children, header, scroll = true, fullBleed = false, forceDark = false }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(forceDark || colorScheme === "dark").colors, [forceDark, colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, fullBleed && styles.fullBleedContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, fullBleed && styles.fullBleedContent]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  // [ADDED] Full-bleed untuk halaman login yang mengatur padding internalnya sendiri.
  fullBleedContent: {
    padding: 0,
  },
});
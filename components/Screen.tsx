import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

type ScreenProps = PropsWithChildren<{
  header?: ReactNode;
  scroll?: boolean;
  // [ADDED] Izinkan layar tertentu memakai lebar penuh tanpa padding luar.
  fullBleed?: boolean;
}>;

export function Screen({ children, header, scroll = true, fullBleed = false }: ScreenProps) {
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.ground,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  // [ADDED] Full-bleed untuk halaman login yang mengatur padding internalnya sendiri.
  fullBleedContent: {
    padding: 0,
  },
});
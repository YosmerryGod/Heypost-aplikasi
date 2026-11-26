import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";

export default function WelcomeScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>H</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>APLIKASI KASIR</Text>
          <Text style={styles.title}>Kerja toko lebih mudah.</Text>
          <Text style={styles.description}>
            Kelola penjualan, produk, stok, dan outlet dalam satu aplikasi.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/login")}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Masuk ke HeyPost</Text>
          </Pressable>
          <Text style={styles.footer}>HeyPost · Aplikasi kasir</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 20,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.signal,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: theme.colors.surface,
    fontSize: 27,
    fontWeight: "800",
  },
  copy: {
    gap: 12,
    marginTop: 40,
    marginBottom: "auto",
  },
  eyebrow: {
    color: theme.colors.signal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    maxWidth: 320,
    color: theme.colors.ink,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -1.3,
  },
  description: {
    maxWidth: 310,
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    gap: 18,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.signal,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.muted,
    fontSize: 12,
  },
});
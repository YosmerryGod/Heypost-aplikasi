import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

export default function WelcomeScreen() {
  const utils = trpc.useUtils();
  const session = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await utils.auth.me.refetch();
    },
  });

  if (session.isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          <Text style={styles.loading}>Menghubungkan ke HeyPost...</Text>
        </View>
      </Screen>
    );
  }

  if (session.data) {
    const { principal, store, outlets, activeOutletId } = session.data;
    const activeOutlet = outlets.find((outlet) => outlet.id === activeOutletId);

    return (
      <Screen scroll={false}>
        <View style={styles.container}>
          <View style={styles.top}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View>
            <Text style={styles.eyebrow}>HEYPOST MOBILE</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.greeting}>Halo, {principal.name}</Text>
            <Text style={styles.title}>Akun berhasil terhubung.</Text>
            <Text style={styles.description}>
              {store.name}{activeOutlet ? ` · ${activeOutlet.name}` : ""}
            </Text>
            <View style={styles.info}>
              <Text style={styles.infoLabel}>AKSES</Text>
              <Text style={styles.infoValue}>{principal.role.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => logout.mutate()}
              disabled={logout.isPending}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>
                {logout.isPending ? "Keluar..." : "Keluar dari akun"}
              </Text>
            </Pressable>
            {session.isError ? <Text style={styles.error}>Sesi tidak dapat diperiksa. Coba muat ulang aplikasi.</Text> : null}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>H</Text></View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>APLIKASI KASIR</Text>
          <Text style={styles.title}>Kerja toko lebih mudah.</Text>
          <Text style={styles.description}>
            Kelola penjualan, produk, stok, dan outlet dalam satu aplikasi.
          </Text>
          {session.isError ? (
            <Text style={styles.error}>Server belum dapat dihubungi. Periksa koneksi internet Anda.</Text>
          ) : null}
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
  container: { flex: 1, justifyContent: "space-between", paddingTop: 48, paddingBottom: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: theme.colors.muted, fontSize: 14 },
  top: { gap: 18 },
  brandMark: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.signal,
    alignItems: "center", justifyContent: "center",
  },
  brandMarkText: { color: theme.colors.surface, fontSize: 27, fontWeight: "800" },
  copy: { gap: 12, marginTop: 40, marginBottom: "auto" },
  eyebrow: { color: theme.colors.signal, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  greeting: { color: theme.colors.muted, fontSize: 15, fontWeight: "600" },
  title: { maxWidth: 320, color: theme.colors.ink, fontSize: 34, lineHeight: 41, fontWeight: "800", letterSpacing: -1.1 },
  description: { maxWidth: 310, color: theme.colors.muted, fontSize: 16, lineHeight: 24 },
  info: { marginTop: 14, padding: 16, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, gap: 6 },
  infoLabel: { color: theme.colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  infoValue: { color: theme.colors.signal, fontSize: 14, fontWeight: "800" },
  actions: { gap: 18 },
  primaryButton: {
    minHeight: 52, borderRadius: theme.radius.md, backgroundColor: theme.colors.signal,
    alignItems: "center", justifyContent: "center",
  },
  primaryButtonText: { color: theme.colors.surface, fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    minHeight: 52, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.line, alignItems: "center", justifyContent: "center",
  },
  secondaryButtonText: { color: theme.colors.ink, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.82 },
  footer: { textAlign: "center", color: theme.colors.muted, fontSize: 12 },
  error: { color: theme.colors.danger, fontSize: 13, lineHeight: 19 },
});

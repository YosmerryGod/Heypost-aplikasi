import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";
import { apiConfig } from "@/lib/api";
import { persistSessionToken } from "@/lib/auth-session";
import { trpc } from "@/providers/trpc";

export default function GoogleAuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [message, setMessage] = useState("Menyelesaikan login Google...");
  const [failed, setFailed] = useState(false);
  const handled = useRef(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (handled.current) return;
    const code = typeof params.code === "string" ? params.code : "";
    const oauthError = typeof params.error === "string" ? params.error : "";

    if (oauthError) {
      handled.current = true;
      setFailed(true);
      setMessage("Login Google tidak berhasil. Silakan coba lagi.");
      return;
    }
    if (!code) return;

    handled.current = true;
    let cancelled = false;

    async function exchangeCode() {
      try {
        const response = await fetch(`${apiConfig.baseUrl}/api/auth/google/mobile/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const payload = await response.json() as { token?: string; error?: string };
        if (!response.ok || !payload.token) {
          throw new Error(payload.error || "Kode login Google tidak valid atau sudah kedaluwarsa.");
        }
        await persistSessionToken(payload.token);
        if (cancelled) return;
        await utils.auth.me.invalidate();
        router.replace("/");
      } catch (cause) {
        if (cancelled) return;
        setFailed(true);
        setMessage(cause instanceof Error ? cause.message : "Tidak dapat menyelesaikan login Google.");
      }
    }

    void exchangeCode();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, utils]);

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        {!failed ? <ActivityIndicator size="large" color={theme.colors.primary} /> : null}
        <Text accessibilityRole="header" style={styles.title}>
          {failed ? "Login belum berhasil" : "Menghubungkan akun"}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {failed ? (
          <Text accessibilityRole="link" onPress={() => router.replace("/login")} style={styles.link}>
            Kembali ke halaman login
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  title: { color: theme.colors.text, fontSize: 21, fontWeight: "800", textAlign: "center" },
  message: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  link: { marginTop: 10, color: theme.colors.primary, fontSize: 15, fontWeight: "700" },
});

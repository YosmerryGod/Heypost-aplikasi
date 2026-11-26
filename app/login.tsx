import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

export default function LoginScreen() {
  const [employeeMode, setEmployeeMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [barcode, setBarcode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const utils = trpc.useUtils();
  const ownerLogin = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setError("");
      await utils.auth.me.invalidate();
      router.replace("/");
    },
    onError: (cause) => setError(cause.message || "Tidak dapat masuk. Periksa data login."),
  });
  const employeeLogin = trpc.auth.employeeLogin.useMutation({
    onSuccess: async () => {
      setError("");
      await utils.auth.me.invalidate();
      router.replace("/");
    },
    onError: (cause) => setError(cause.message || "Tidak dapat masuk. Periksa barcode dan PIN."),
  });

  const loading = ownerLogin.isPending || employeeLogin.isPending;

  function handleContinue() {
    setError("");
    if (employeeMode) {
      employeeLogin.mutate({ barcode: barcode.trim(), pin });
      return;
    }
    ownerLogin.mutate({ email: email.trim(), password });
  }

  const canSubmit = employeeMode
    ? barcode.trim().length >= 20 && /^\d{6}$/.test(pin)
    : email.trim().length > 3 && password.length > 0;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.title}>Masuk</Text>
          <Text style={styles.subtitle}>
            {employeeMode ? "Masuk menggunakan barcode dan PIN karyawan." : "Masuk ke akun HeyPost Anda."}
          </Text>
        </View>

        <View style={styles.switcher}>
          <Pressable
            onPress={() => { setEmployeeMode(false); setError(""); }}
            style={[styles.switchOption, !employeeMode && styles.switchActive]}
          >
            <Text style={[styles.switchText, !employeeMode && styles.switchTextActive]}>Owner</Text>
          </Pressable>
          <Pressable
            onPress={() => { setEmployeeMode(true); setError(""); }}
            style={[styles.switchOption, employeeMode && styles.switchActive]}
          >
            <Text style={[styles.switchText, employeeMode && styles.switchTextActive]}>Karyawan</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {employeeMode ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Barcode karyawan</Text>
                <TextInput
                  accessibilityLabel="Barcode karyawan"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setBarcode}
                  placeholder="Pindai atau masukkan barcode"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                  value={barcode}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>PIN 6 digit</Text>
                <TextInput
                  accessibilityLabel="PIN karyawan"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={setPin}
                  placeholder="Masukkan PIN"
                  placeholderTextColor={theme.colors.muted}
                  secureTextEntry
                  style={styles.input}
                  value={pin}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="nama@email.com"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                  value={email}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={setPassword}
                  placeholder="Masukkan password"
                  placeholderTextColor={theme.colors.muted}
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>
            </>
          )}

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit || loading}
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              (!canSubmit || loading) && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>{loading ? "Memproses..." : "Masuk"}</Text>
          </Pressable>
          <Text style={styles.notice}>
            Terhubung ke server HeyPost. Sesi login disimpan secara aman di perangkat ini.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  backButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  backText: { color: theme.colors.signal, fontSize: 14, fontWeight: "700" },
  heading: { marginTop: 36, marginBottom: 24, gap: 8 },
  title: { color: theme.colors.ink, fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: theme.colors.muted, fontSize: 15, lineHeight: 22 },
  switcher: {
    flexDirection: "row",
    padding: 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.line,
    marginBottom: 24,
  },
  switchOption: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  switchActive: { backgroundColor: theme.colors.surface },
  switchText: { color: theme.colors.muted, fontSize: 14, fontWeight: "600" },
  switchTextActive: { color: theme.colors.ink },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { color: theme.colors.ink, fontSize: 13, fontWeight: "700" },
  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.ink,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.signal,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: theme.colors.surface, fontSize: 15, fontWeight: "700" },
  disabledButton: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  error: { color: theme.colors.danger, fontSize: 13, lineHeight: 19 },
  notice: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
});

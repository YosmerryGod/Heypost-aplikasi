// [MODIFIED] Form registrasi dibuat satu layar penuh tanpa header dan tanpa scroll.
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthButton, AuthInput, showToast } from "@/components/native-ui";
import { getTheme, type ThemeColors } from "@/constants/theme";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/providers/trpc";

export default function RegisterScreen() {
  // [MODIFIED] Register selalu Dark dan tidak mengubah preferensi tema aplikasi.
  const colors = useMemo(() => getTheme(true).colors, []);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [outletName, setOutletName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // [ADDED] State visibilitas password masing-masing input.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      router.replace("/");
    },
    onError: error => showToast("Registrasi gagal", error.message, "error"),
  });

  const submit = () => {
    if (password.length < 8) return showToast("Password terlalu pendek", "Gunakan minimal 8 karakter.", "error");
    if (password !== confirm) return showToast("Password tidak sama", "Periksa konfirmasi password.", "error");
    register.mutate({
      name: name.trim(),
      storeName: storeName.trim(),
      outletName: outletName.trim() || undefined,
      email: email.trim(),
      password,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      {/* [MODIFIED] KeyboardAvoidingView + ScrollView menjaga field aktif tetap terlihat saat keyboard terbuka. */}
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MULAI BERSAMA HEYPOST</Text>
        <Text style={styles.title}>Buat akun</Text>
        <Text style={styles.subtitle}>Daftarkan owner dan toko untuk mulai menggunakan HeyPost.</Text>
      </View>

      <View style={styles.fields}>
        <AuthInput label="Nama lengkap" value={name} onChangeText={setName} placeholder="Nama Anda" />
        <AuthInput label="Nama toko" value={storeName} onChangeText={setStoreName} placeholder="Nama bisnis" />
        <AuthInput label="Nama outlet (opsional)" value={outletName} onChangeText={setOutletName} placeholder="Outlet utama" />
        <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" />
        {/* [MODIFIED] Kedua input password memakai komponen autentikasi global. */}
        <AuthInput label="Password (minimal 8 karakter)" value={password} onChangeText={setPassword} placeholder="Buat password" secureTextEntry={!showPassword} rightIcon={showPassword ? "eye-off-outline" : "eye-outline"} onRightPress={() => setShowPassword(value => !value)} />
        <AuthInput label="Ulangi password" value={confirm} onChangeText={setConfirm} placeholder="Ulangi password" secureTextEntry={!showConfirm} rightIcon={showConfirm ? "eye-off-outline" : "eye-outline"} onRightPress={() => setShowConfirm(value => !value)} />
      </View>

      <View style={styles.actions}>
        <AuthButton
          title="Buat akun & buka toko"
          onPress={submit}
          disabled={!name.trim() || !storeName.trim() || !email.trim() || !password || !confirm}
          loading={register.isPending}
          style={styles.submitButton}
        />
        <Pressable accessibilityRole="button" onPress={() => router.replace("/login")} style={styles.loginButton}>
          <Text style={styles.loginText}>Sudah punya akun? <Text style={styles.loginLink}>Masuk</Text></Text>
        </Pressable>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.ground },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  screen: {
    flexGrow: 1,
    minHeight: "100%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 0,
    justifyContent: "space-between",
  },
  heading: { gap: 4, marginBottom: 10 },
  eyebrow: { color: colors.signal, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontFamily: "Archivo-Bold", fontSize: 27, lineHeight: 33, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  fields: { gap: 9, flexShrink: 1 },
  actions: { gap: 8, paddingTop: 10 },
  submitButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.signal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  submitText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Figtree-Bold", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
  loginButton: { minHeight: 34, alignItems: "center", justifyContent: "center" },
  loginText: { color: colors.muted, fontSize: 13 },
  loginLink: { color: colors.signal, fontFamily: "Figtree-Bold", fontWeight: "800" },
});

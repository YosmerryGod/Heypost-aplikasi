import { useState } from "react";
import * as Linking from "expo-linking"; // [ADDED]
import { router } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

export default function LoginScreen() {
  const [employeeMode, setEmployeeMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false); // [ADDED]
  const { width, height } = useWindowDimensions();
  const compact = height < 760;
  const veryCompact = height < 680;

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

  function changeMode(nextMode: boolean) {
    setEmployeeMode(nextMode);
    setError("");
    ownerLogin.reset();
    employeeLogin.reset();
  }

  function handleContinue() {
    setError("");
    if (employeeMode) {
      employeeLogin.mutate({ barcode: barcode.trim(), pin });
      return;
    }
    ownerLogin.mutate({ email: email.trim(), password });
  }

  // [ADDED] Mulai OAuth Google melalui backend dan buka halaman otorisasi Google.
  async function handleGoogleLogin() {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "https://apihey.doodweb.tech"}/api/auth/google/mobile/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !payload.authorizationUrl) {
        throw new Error(payload.error || "Tidak dapat memulai login Google.");
      }
      await Linking.openURL(payload.authorizationUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat membuka login Google.");
      setGoogleLoading(false);
    }
  }

  const canSubmit = employeeMode
    ? barcode.trim().length >= 20 && /^\d{6}$/.test(pin)
    : email.trim().length > 3 && password.length > 0;

  return (
    <Screen scroll={false} fullBleed>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* [MODIFIED] Layout memenuhi tinggi layar dan tidak menggunakan scroll. */}
        <View
          style={[
            styles.content,
            { paddingHorizontal: width < 380 ? 22 : 28 },
            compact && styles.compactContent,
            veryCompact && styles.veryCompactContent,
          ]}
        >
          {/* [ADDED] Aksen latar mint lembut agar layar tidak polos tanpa mengganggu form. */}
          <View pointerEvents="none" style={styles.backgroundDecor}>
            <View style={styles.backgroundGlowTop} />
            <View style={styles.backgroundGlowBottom} />
            <View style={styles.backgroundRing} />
          </View>
          {!employeeMode ? (
            <>
              {/* [MODIFIED] Header disamakan dengan mockup: tanpa logo, ilustrasi, dan badge. */}
              <View style={[styles.heading, compact && styles.compactHeading]}>
                <Text style={[styles.title, compact && styles.compactTitle]}>Selamat datang</Text>
                <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>
                  Masuk untuk mengelola bisnis Anda dengan lebih mudah.
                </Text>
              </View>

              {/* [MODIFIED] Form dibuat sederhana seperti referensi visual. */}
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputShell, compact && styles.compactInputShell]}>
                    <Ionicons name="mail-outline" size={21} color="#68727D" style={styles.fieldIcon} />
                    <TextInput
                      accessibilityLabel="Email"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="nama@email.com"
                      placeholderTextColor="#858D97"
                      returnKeyType="next"
                      style={styles.inputText}
                      value={email}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputShell, compact && styles.compactInputShell]}>
                    <Ionicons name="lock-closed-outline" size={21} color="#68727D" style={styles.fieldIcon} />
                    <TextInput
                      accessibilityLabel="Password"
                      autoCapitalize="none"
                      autoComplete="password"
                      onChangeText={setPassword}
                      placeholder="Masukkan password"
                      placeholderTextColor="#858D97"
                      secureTextEntry={!showPassword}
                      style={styles.inputText}
                      value={password}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      hitSlop={10}
                      onPress={() => setShowPassword((current) => !current)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color="#68727D" />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => Alert.alert("Lupa password?", "Fitur reset password belum tersedia.")}
                    style={styles.forgotPassword}
                  >
                    <Text style={styles.forgotPasswordText}>Lupa password?</Text>
                  </Pressable>
                </View>
              </View>

              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit || loading}
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.primaryButton,
                  compact && styles.compactPrimaryButton,
                  (!canSubmit || loading) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>{loading ? "Memproses..." : "Masuk"}</Text>
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>

              {/* [ADDED] Pemisah dan tombol Google sesuai mockup. */}
              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>atau</Text>
                <View style={styles.separatorLine} />
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={googleLoading}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, googleLoading && styles.disabledButton]}
              >
                {/* [MODIFIED] Logo Google G empat warna menggunakan vector resmi bergaya brand. */}
                <Svg width={25} height={25} viewBox="0 0 24 24" style={styles.googleMark}>
                  <Path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.61v2.92h3.87c2.27-2.09 3.57-5.17 3.57-8.77Z"
                  />
                  <Path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.96-1.08 7.95-2.93l-3.87-2.95c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.04A12 12 0 0 0 12 24Z"
                  />
                  <Path
                    fill="#FBBC05"
                    d="M5.27 14.31A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.31V6.65H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.35l4-3.04Z"
                  />
                  <Path
                    fill="#EA4335"
                    d="M12 4.73c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.48 11.48 0 0 0 12 0 12 12 0 0 0 1.27 6.65l4 3.04c.95-2.85 3.6-4.96 6.73-4.96Z"
                  />
                </Svg>
                <Text style={styles.googleButtonText}>{googleLoading ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => changeMode(true)}
                style={({ pressed }) => [styles.employeeButton, pressed && styles.pressed]}
              >
                <Ionicons name="barcode-outline" size={22} color="#087746" />
                <Text style={styles.employeeButtonText}>Masuk sebagai karyawan</Text>
              </Pressable>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Belum punya akun?</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push("/register")}>
                  <Text style={styles.registerLink}>Daftar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* [MODIFIED] Mode karyawan tetap tersedia dengan gaya visual yang sama. */}
              <View style={styles.heading}>
                <Text style={styles.title}>Masuk sebagai karyawan</Text>
                <Text style={styles.subtitle}>Gunakan barcode dan PIN akses yang diberikan owner.</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Barcode karyawan</Text>
                  <View style={[styles.inputShell, compact && styles.compactInputShell]}>
                    <Ionicons name="barcode-outline" size={21} color="#68727D" style={styles.fieldIcon} />
                    <TextInput
                      accessibilityLabel="Barcode karyawan"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={setBarcode}
                      placeholder="Masukkan kode barcode dari owner"
                      placeholderTextColor="#858D97"
                      style={styles.inputText}
                      value={barcode}
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>PIN 6 digit</Text>
                  <View style={[styles.inputShell, compact && styles.compactInputShell]}>
                    <Ionicons name="lock-closed-outline" size={21} color="#68727D" style={styles.fieldIcon} />
                    <TextInput
                      accessibilityLabel="PIN karyawan"
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Masukkan PIN"
                      placeholderTextColor="#858D97"
                      secureTextEntry
                      style={styles.inputText}
                      value={pin}
                    />
                  </View>
                </View>
              </View>

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
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => changeMode(false)} style={styles.backButton}>
                <Text style={styles.backButtonText}>Kembali ke login owner</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: "#FFFFFF" },
  // [MODIFIED] Konten dikunci dalam tinggi layar tanpa ScrollView.
  content: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  // [ADDED] Bentuk dekoratif abstrak bernuansa hijau, ditempatkan di belakang konten.
  backgroundDecor: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  backgroundGlowTop: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 135,
    top: -155,
    right: -115,
    backgroundColor: "#EAF7F0",
  },
  backgroundGlowBottom: {
    position: "absolute",
    width: 235,
    height: 235,
    borderRadius: 118,
    bottom: -155,
    left: -115,
    backgroundColor: "#F0F9F4",
  },
  backgroundRing: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    top: 42,
    right: -78,
    borderWidth: 18,
    borderColor: "#F4FAF6",
  },
  compactContent: { paddingTop: 6, paddingBottom: 6 },
  veryCompactContent: { paddingTop: 2, paddingBottom: 2 },
  heading: { marginBottom: 24 },
  compactHeading: { marginBottom: 17 },
  title: {
    color: "#092D25",
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  compactTitle: { fontSize: 30, lineHeight: 36 },
  subtitle: {
    maxWidth: 340,
    marginTop: 8,
    color: "#5B6067",
    fontSize: 16,
    lineHeight: 23,
  },
  compactSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  form: { gap: 15 },
  field: { gap: 7 },
  label: { color: "#102C25", fontSize: 15, fontWeight: "700" },
  inputShell: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: "#D1D6DC",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  compactInputShell: { minHeight: 50, borderRadius: 14 },
  fieldIcon: { width: 34 },
  inputText: {
    flex: 1,
    minHeight: 50,
    padding: 0,
    color: "#172D26",
    fontSize: 16,
  },
  passwordToggle: {
    minWidth: 38,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotPassword: { alignSelf: "flex-end", marginTop: 5, paddingVertical: 2 },
  forgotPasswordText: { color: "#087746", fontSize: 14, fontWeight: "600" },
  primaryButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 19,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#078451",
  },
  compactPrimaryButton: { minHeight: 50, marginTop: 13 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  primaryArrow: { color: "#FFFFFF", fontSize: 25, lineHeight: 29, marginTop: -2 },
  disabledButton: { opacity: 0.55 },
  pressed: { opacity: 0.78 },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 17,
    marginBottom: 13,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: "#DDE1E5" },
  separatorText: { color: "#747B84", fontSize: 14 },
  googleButton: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    borderWidth: 1.5,
    borderColor: "#D1D6DC",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  googleMark: { width: 27 },
  googleButtonText: { color: "#10251F", fontSize: 15, fontWeight: "700" },
  employeeButton: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    marginTop: 13,
    borderRadius: 16,
    backgroundColor: "#E4F8EF",
  },
  employeeButtonText: { color: "#087746", fontSize: 15, fontWeight: "800" },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 18,
  },
  registerText: { color: "#60666E", fontSize: 14 },
  registerLink: { color: "#087746", fontSize: 15, fontWeight: "800" },
  backButton: { alignItems: "center", paddingVertical: 16 },
  backButtonText: { color: "#087746", fontSize: 14, fontWeight: "700" },
  error: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FEF3F2",
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
});
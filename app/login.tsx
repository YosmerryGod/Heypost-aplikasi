import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  const [showPassword, setShowPassword] = useState(false);
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

  const canSubmit = employeeMode
    ? barcode.trim().length >= 20 && /^\\d{6}$/.test(pin)
    : email.trim().length > 3 && password.length > 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* [MODIFIED] Brand header and welcome composition aligned with the HeyPost web login identity. */}
          <View style={styles.topRow}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <View style={[styles.pawToe, styles.pawToeOne]} />
                <View style={[styles.pawToe, styles.pawToeTwo]} />
                <View style={[styles.pawToe, styles.pawToeThree]} />
                <View style={[styles.pawToe, styles.pawToeFour]} />
                <View style={styles.pawPad} />
              </View>
              <Text style={styles.brandName}>HeyPost</Text>
            </View>
            <View style={styles.trustPill}>
              <View style={styles.trustDot} />
              <Text style={styles.trustText}>Aman & Terpercaya</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>SOLUSI BISNIS DALAM SATU APLIKASI</Text>
            <Text style={styles.heroTitle}>
              Kelola bisnis{"\n"}
              <Text style={styles.heroAccent}>lebih mudah.</Text>
            </Text>
            <Text style={styles.heroDescription}>
              Satu aplikasi untuk kasir, stok, dan laporan bisnismu.
            </Text>
            <View style={styles.heroArtwork}>
              <View style={styles.artworkGlow} />
              <View style={styles.artworkTerminal}>
                <View style={styles.terminalTop}>
                  <View style={styles.terminalCamera} />
                  <View style={styles.terminalScreen}>
                    <View style={styles.terminalLineLong} />
                    <View style={styles.terminalLineShort} />
                    <View style={styles.terminalButton} />
                  </View>
                </View>
                <View style={styles.terminalBase} />
              </View>
              <View style={styles.artworkPaw}>
                <View style={[styles.artPawToe, styles.artPawToeOne]} />
                <View style={[styles.artPawToe, styles.artPawToeTwo]} />
                <View style={[styles.artPawToe, styles.artPawToeThree]} />
                <View style={[styles.artPawToe, styles.artPawToeFour]} />
                <View style={styles.artPawPad} />
              </View>
              <View style={styles.artworkSparkleOne} />
              <View style={styles.artworkSparkleTwo} />
            </View>
          </View>

          {/* [MODIFIED] Native login card follows the web hierarchy while retaining native inputs and authentication. */}
          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardTitle}>
                {employeeMode ? "Akses karyawan" : "Selamat datang kembali!"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {employeeMode
                  ? "Masuk menggunakan barcode dan PIN akses dari owner."
                  : "Masuk ke workspace HeyPost untuk melanjutkan aktivitas bisnismu."}
              </Text>
            </View>

            <View style={styles.switcher}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: !employeeMode }}
                onPress={() => changeMode(false)}
                style={[styles.switchOption, !employeeMode && styles.switchActive]}
              >
                <Text style={[styles.switchText, !employeeMode && styles.switchTextActive]}>
                  Owner
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: employeeMode }}
                onPress={() => changeMode(true)}
                style={[styles.switchOption, employeeMode && styles.switchActive]}
              >
                <Text style={[styles.switchText, employeeMode && styles.switchTextActive]}>
                  Karyawan
                </Text>
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
                      placeholder="Masukkan kode barcode dari owner"
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
                      onChangeText={(value) => setPin(value.replace(/\\D/g, "").slice(0, 6))}
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
                      returnKeyType="next"
                      style={styles.input}
                      value={email}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordInput}>
                      <TextInput
                        accessibilityLabel="Password"
                        autoCapitalize="none"
                        autoComplete="password"
                        onChangeText={setPassword}
                        placeholder="Masukkan password"
                        placeholderTextColor={theme.colors.muted}
                        secureTextEntry={!showPassword}
                        style={styles.passwordTextInput}
                        value={password}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                        onPress={() => setShowPassword((current) => !current)}
                        hitSlop={8}
                        style={styles.passwordToggle}
                      >
                        <Text style={styles.passwordToggleText}>
                          {showPassword ? "Sembunyikan" : "Lihat"}
                        </Text>
                      </Pressable>
                    </View>
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
                <Text style={styles.primaryButtonText}>
                  {loading ? "Memproses..." : employeeMode ? "Masuk sebagai karyawan" : "Masuk ke HeyPost"}
                </Text>
                <Text style={styles.primaryArrow}>›</Text>
              </Pressable>

              <Text style={styles.notice}>
                Terhubung ke server HeyPost. Sesi login disimpan secara aman di perangkat ini.
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            Kelola bisnis Anda dengan lebih efisien bersama HeyPost.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: theme.spacing.lg,
  },
  topRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: {
    width: 38,
    height: 38,
    position: "relative",
  },
  pawToe: {
    position: "absolute",
    width: 8,
    height: 11,
    borderRadius: 8,
    backgroundColor: theme.colors.signal,
  },
  pawToeOne: { left: 3, top: 8, transform: [{ rotate: "-25deg" }] },
  pawToeTwo: { left: 13, top: 1 },
  pawToeThree: { right: 4, top: 4, transform: [{ rotate: "18deg" }] },
  pawToeFour: { right: 0, top: 15, transform: [{ rotate: "28deg" }] },
  pawPad: {
    position: "absolute",
    left: 7,
    top: 17,
    width: 25,
    height: 18,
    borderRadius: 14,
    backgroundColor: theme.colors.signal,
    transform: [{ rotate: "-8deg" }],
  },
  brandName: {
    color: theme.colors.ink,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -1.1,
  },
  trustPill: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    borderRadius: theme.radius.pill,
    backgroundColor: "#edf6f0",
  },
  trustDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.signal,
  },
  trustText: { color: theme.colors.signal, fontSize: 11, fontWeight: "700" },
  hero: { paddingTop: 25 },
  eyebrow: {
    color: theme.colors.signal,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heroTitle: {
    marginTop: 9,
    color: "#153d2f",
    fontSize: 39,
    lineHeight: 43,
    fontWeight: "800",
    letterSpacing: -1.8,
  },
  heroAccent: { color: "#219b72" },
  heroDescription: {
    maxWidth: 270,
    marginTop: 9,
    color: "#4e6258",
    fontSize: 14,
    lineHeight: 20,
  },
  heroArtwork: {
    height: 156,
    marginTop: 4,
    marginBottom: 7,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#edf6f0",
  },
  artworkGlow: {
    position: "absolute",
    width: 190,
    height: 130,
    borderRadius: 90,
    backgroundColor: "#dceee3",
    right: 13,
    top: 15,
  },
  artworkTerminal: {
    width: 172,
    height: 112,
    position: "absolute",
    right: 35,
    bottom: 10,
    alignItems: "center",
  },
  terminalTop: {
    width: 135,
    height: 88,
    padding: 7,
    borderRadius: 12,
    backgroundColor: "#173e31",
    transform: [{ rotate: "7deg" }],
  },
  terminalCamera: {
    width: 4,
    height: 4,
    alignSelf: "center",
    borderRadius: 3,
    backgroundColor: "#7ba08d",
    marginBottom: 3,
  },
  terminalScreen: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 7,
    borderRadius: 5,
    backgroundColor: "#f2f8f4",
  },
  terminalLineLong: {
    width: 66,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#a9cbb7",
  },
  terminalLineShort: {
    width: 43,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#c9ddd0",
  },
  terminalButton: {
    width: 27,
    height: 10,
    borderRadius: 4,
    backgroundColor: "#25a778",
  },
  terminalBase: {
    width: 158,
    height: 14,
    marginTop: 2,
    borderRadius: 7,
    backgroundColor: "#39735e",
    transform: [{ rotate: "7deg" }],
  },
  artworkPaw: {
    width: 106,
    height: 102,
    position: "absolute",
    left: 38,
    top: 20,
    transform: [{ rotate: "22deg" }],
  },
  artPawToe: {
    position: "absolute",
    width: 18,
    height: 25,
    borderRadius: 12,
    backgroundColor: "#fffdf9",
    borderWidth: 2,
    borderColor: "#183a2e",
  },
  artPawToeOne: { left: 4, top: 14, transform: [{ rotate: "-25deg" }] },
  artPawToeTwo: { left: 27, top: 0 },
  artPawToeThree: { left: 53, top: 5, transform: [{ rotate: "18deg" }] },
  artPawToeFour: { left: 74, top: 24, transform: [{ rotate: "28deg" }] },
  artPawPad: {
    position: "absolute",
    left: 15,
    top: 37,
    width: 70,
    height: 54,
    borderRadius: 34,
    backgroundColor: "#f5ada5",
    borderWidth: 2,
    borderColor: "#183a2e",
    transform: [{ rotate: "-8deg" }],
  },
  artworkSparkleOne: {
    position: "absolute",
    top: 22,
    right: 23,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#25a778",
  },
  artworkSparkleTwo: {
    position: "absolute",
    bottom: 22,
    left: 23,
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: "#9bc9ae",
  },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#e4eee8",
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    shadowColor: "#1f4e39",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeading: { gap: 7 },
  cardTitle: {
    color: "#15291f",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  cardSubtitle: { color: "#63756c", fontSize: 13, lineHeight: 19 },
  switcher: {
    flexDirection: "row",
    padding: 4,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 11,
    backgroundColor: "#edf2ef",
  },
  switchOption: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  switchActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: "#153d2f",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  switchText: { color: theme.colors.muted, fontSize: 13, fontWeight: "600" },
  switchTextActive: { color: theme.colors.signal, fontWeight: "800" },
  form: { gap: 15 },
  field: { gap: 7 },
  label: { color: "#1c2d24", fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 51,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#dce8e1",
    borderRadius: 11,
    backgroundColor: "#fff",
    color: theme.colors.ink,
    fontSize: 14,
  },
  passwordInput: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 9,
    borderWidth: 1,
    borderColor: "#dce8e1",
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  passwordTextInput: {
    flex: 1,
    minHeight: 49,
    padding: 0,
    color: theme.colors.ink,
    fontSize: 14,
  },
  passwordToggle: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  passwordToggleText: { color: theme.colors.signal, fontSize: 11, fontWeight: "700" },
  primaryButton: {
    minHeight: 53,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 3,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: theme.colors.signal,
  },
  primaryButtonText: { color: theme.colors.surface, fontSize: 14, fontWeight: "800" },
  primaryArrow: { color: "#fff", fontSize: 22, lineHeight: 24, marginTop: -2 },
  disabledButton: { opacity: 0.48 },
  pressed: { opacity: 0.82 },
  error: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#fef3f2",
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  notice: {
    color: theme.colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  footer: {
    marginTop: 17,
    color: "#6b7c73",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});

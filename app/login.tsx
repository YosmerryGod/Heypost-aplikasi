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
  useWindowDimensions,
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
  const { width } = useWindowDimensions();

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
    ? barcode.trim().length >= 20 && /^\d{6}$/.test(pin)
    : email.trim().length > 3 && password.length > 0;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: width < 380 ? 20 : 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* [MODIFIED] Header dibuat mengikuti komposisi referensi login HeyPost. */}
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
              <View style={styles.shield}>
                <Text style={styles.shieldCheck}>✓</Text>
              </View>
              <Text style={styles.trustText}>Aman & Terpercaya</Text>
            </View>
          </View>

          {/* [MODIFIED] Hero dibuat lebih lapang dan ilustrasi kasir menjadi fokus visual. */}
          <View style={styles.hero}>
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
                  <View style={styles.terminalScreen}>
                    <Text style={styles.cartIcon}>🛒</Text>
                    <View style={styles.terminalLineLong} />
                    <View style={styles.terminalLineShort} />
                  </View>
                </View>
                <View style={styles.terminalSide} />
                <View style={styles.terminalBase} />
              </View>
              <View style={styles.artworkPaw}>
                <View style={[styles.artPawToe, styles.artPawToeOne]} />
                <View style={[styles.artPawToe, styles.artPawToeTwo]} />
                <View style={[styles.artPawToe, styles.artPawToeThree]} />
                <View style={[styles.artPawToe, styles.artPawToeFour]} />
                <View style={styles.artPawPad} />
                <View style={styles.pawArm} />
              </View>
              <View style={styles.artworkSparkleOne} />
              <View style={styles.artworkSparkleTwo} />
            </View>
          </View>

          {/* [MODIFIED] Kartu login mengikuti susunan field dan tombol pada referensi. */}
          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardTitle}>
                {employeeMode ? "Masuk sebagai karyawan" : "Selamat datang kembali!"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {employeeMode
                  ? "Gunakan barcode dan PIN akses yang diberikan owner."
                  : "Masuk ke workspace HeyPost untuk melanjutkan aktivitas bisnismu."}
              </Text>
            </View>

            <View style={styles.form}>
              {employeeMode ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Barcode karyawan</Text>
                    <View style={styles.inputShell}>
                      <Text style={styles.fieldIcon}>▦</Text>
                      <TextInput
                        accessibilityLabel="Barcode karyawan"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setBarcode}
                        placeholder="Masukkan kode barcode dari owner"
                        placeholderTextColor="#9aa59f"
                        style={styles.inputText}
                        value={barcode}
                      />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>PIN 6 digit</Text>
                    <View style={styles.inputShell}>
                      <Text style={styles.fieldIcon}>▣</Text>
                      <TextInput
                        accessibilityLabel="PIN karyawan"
                        keyboardType="number-pad"
                        maxLength={6}
                        onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Masukkan PIN"
                        placeholderTextColor="#9aa59f"
                        secureTextEntry
                        style={styles.inputText}
                        value={pin}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputShell}>
                      <Text style={styles.fieldIcon}>✉</Text>
                      <TextInput
                        accessibilityLabel="Email"
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        onChangeText={setEmail}
                        placeholder="nama@email.com"
                        placeholderTextColor="#9aa59f"
                        returnKeyType="next"
                        style={styles.inputText}
                        value={email}
                      />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputShell}>
                      <Text style={styles.fieldIcon}>▣</Text>
                      <TextInput
                        accessibilityLabel="Password"
                        autoCapitalize="none"
                        autoComplete="password"
                        onChangeText={setPassword}
                        placeholder="Masukkan password"
                        placeholderTextColor="#9aa59f"
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
                        <Text style={styles.eyeIcon}>{showPassword ? "◉" : "◎"}</Text>
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
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>

              {/* [ADDED] Alternatif login karyawan ditempatkan di bawah tombol utama seperti referensi. */}
              {!employeeMode ? (
                <>
                  <View style={styles.separator}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>ATAU</Text>
                    <View style={styles.separatorLine} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => changeMode(true)}
                    style={({ pressed }) => [styles.employeeButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.employeeIcon}>♙</Text>
                    <Text style={styles.employeeButtonText}>Masuk sebagai karyawan</Text>
                  </Pressable>
                  <View style={styles.registerRow}>
                    <Text style={styles.registerText}>Belum punya akun?</Text>
                    <Pressable accessibilityRole="button" onPress={() => router.push("/register")}>
                      <Text style={styles.registerLink}>Daftar sekarang</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => changeMode(false)} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Kembali ke login owner</Text>
                </Pressable>
              )}
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
    paddingTop: 18,
    paddingBottom: 24,
    backgroundColor: "#f2f8f4",
  },
  topRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 43, height: 43, position: "relative" },
  pawToe: {
    position: "absolute",
    width: 9,
    height: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#16785b",
    backgroundColor: "#f2f8f4",
  },
  pawToeOne: { left: 2, top: 9, transform: [{ rotate: "-25deg" }] },
  pawToeTwo: { left: 13, top: 1 },
  pawToeThree: { right: 8, top: 4, transform: [{ rotate: "18deg" }] },
  pawToeFour: { right: 1, top: 16, transform: [{ rotate: "28deg" }] },
  pawPad: {
    position: "absolute",
    left: 7,
    top: 19,
    width: 29,
    height: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#16785b",
    backgroundColor: "#f2f8f4",
    transform: [{ rotate: "-8deg" }],
  },
  brandName: {
    fontFamily: "Archivo-ExtraBold",
    color: "#153d2f",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  trustPill: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 30,
    backgroundColor: "#ffffff",
  },
  shield: {
    width: 18,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#16785b",
    borderRadius: 7,
  },
  shieldCheck: { color: "#16785b", fontSize: 12, fontWeight: "900", lineHeight: 15 },
  trustText: { color: "#16785b", fontSize: 11, fontWeight: "700" },
  hero: { paddingTop: 48 },
  heroTitle: {
    fontFamily: "Archivo-ExtraBold",
    color: "#153d2f",
    fontSize: 42,
    lineHeight: 47,
    fontWeight: "800",
    letterSpacing: -2,
  },
  heroAccent: { color: "#219b72" },
  heroDescription: {
    maxWidth: 300,
    marginTop: 15,
    color: "#52675d",
    fontSize: 16,
    lineHeight: 24,
  },
  heroArtwork: {
    height: 220,
    marginTop: 4,
    marginBottom: 0,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#eaf5ee",
  },
  artworkGlow: {
    position: "absolute",
    width: 250,
    height: 220,
    borderRadius: 130,
    backgroundColor: "#dceee3",
    right: -35,
    top: -65,
  },
  artworkTerminal: {
    width: 230,
    height: 170,
    position: "absolute",
    right: 10,
    bottom: 6,
    alignItems: "center",
  },
  terminalTop: {
    width: 190,
    height: 135,
    padding: 9,
    borderRadius: 22,
    backgroundColor: "#173e31",
    transform: [{ rotate: "8deg" }],
  },
  terminalScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    backgroundColor: "#f5faf6",
  },
  cartIcon: { color: "#219b72", fontSize: 39 },
  terminalLineLong: { width: 85, height: 7, borderRadius: 5, backgroundColor: "#c5ddd0" },
  terminalLineShort: { width: 58, height: 7, borderRadius: 5, backgroundColor: "#dcebe2" },
  terminalSide: {
    position: "absolute",
    width: 30,
    height: 90,
    right: -1,
    top: 30,
    borderRadius: 9,
    backgroundColor: "#205443",
    transform: [{ rotate: "8deg" }],
  },
  terminalBase: {
    width: 220,
    height: 23,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#39735e",
    transform: [{ rotate: "4deg" }],
  },
  artworkPaw: {
    width: 132,
    height: 160,
    position: "absolute",
    left: 24,
    top: 22,
    transform: [{ rotate: "23deg" }],
  },
  artPawToe: {
    position: "absolute",
    width: 24,
    height: 34,
    borderRadius: 15,
    backgroundColor: "#fffdf9",
    borderWidth: 3,
    borderColor: "#183a2e",
  },
  artPawToeOne: { left: 4, top: 19, transform: [{ rotate: "-25deg" }] },
  artPawToeTwo: { left: 33, top: 0 },
  artPawToeThree: { left: 65, top: 7, transform: [{ rotate: "18deg" }] },
  artPawToeFour: { left: 96, top: 31, transform: [{ rotate: "28deg" }] },
  artPawPad: {
    position: "absolute",
    left: 19,
    top: 49,
    width: 91,
    height: 72,
    borderRadius: 45,
    backgroundColor: "#f5ada5",
    borderWidth: 3,
    borderColor: "#183a2e",
    transform: [{ rotate: "-8deg" }],
  },
  pawArm: {
    position: "absolute",
    width: 100,
    height: 68,
    left: -26,
    top: 111,
    borderTopLeftRadius: 55,
    borderTopRightRadius: 45,
    backgroundColor: "#16785b",
    transform: [{ rotate: "18deg" }],
  },
  artworkSparkleOne: {
    position: "absolute",
    top: 19,
    right: 72,
    width: 9,
    height: 27,
    borderRadius: 8,
    backgroundColor: "#219b72",
    transform: [{ rotate: "25deg" }],
  },
  artworkSparkleTwo: {
    position: "absolute",
    top: 39,
    right: 43,
    width: 8,
    height: 20,
    borderRadius: 8,
    backgroundColor: "#219b72",
    transform: [{ rotate: "45deg" }],
  },
  card: {
    marginTop: -2,
    padding: 23,
    borderWidth: 1,
    borderColor: "#e5eee8",
    borderRadius: 28,
    backgroundColor: "#ffffff",
    shadowColor: "#1f4e39",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHeading: { gap: 8, marginBottom: 25 },
  cardTitle: {
    fontFamily: "Archivo-Bold",
    color: "#15291f",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  cardSubtitle: { color: "#697a72", fontSize: 15, lineHeight: 23 },
  form: { gap: 19 },
  field: { gap: 9 },
  label: { color: "#1c2d24", fontSize: 15, fontWeight: "700" },
  inputShell: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#dce5df",
    borderRadius: 20,
    backgroundColor: "#ffffff",
  },
  fieldIcon: {
    width: 35,
    color: "#87958e",
    fontSize: 25,
    fontWeight: "500",
  },
  inputText: {
    flex: 1,
    minHeight: 60,
    padding: 0,
    color: "#1b2d24",
    fontSize: 16,
  },
  passwordToggle: {
    minWidth: 36,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: { color: "#7d8a83", fontSize: 26 },
  primaryButton: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 5,
    paddingHorizontal: 18,
    borderRadius: 19,
    backgroundColor: "#16785b",
  },
  primaryButtonText: {
    fontFamily: "Figtree-Bold",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  primaryArrow: { color: "#ffffff", fontSize: 30, lineHeight: 34, marginTop: -3 },
  disabledButton: { opacity: 0.52 },
  pressed: { opacity: 0.82 },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 1,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: "#dce5df" },
  separatorText: { color: "#87928c", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  employeeButton: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#edf6f0",
  },
  employeeIcon: { color: "#16785b", fontSize: 24 },
  employeeButtonText: { color: "#16785b", fontSize: 15, fontWeight: "800" },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 4,
  },
  registerText: { color: "#78867f", fontSize: 14 },
  registerLink: { color: "#16785b", fontSize: 14, fontWeight: "800" },
  backButton: { alignItems: "center", paddingVertical: 8 },
  backButtonText: { color: "#16785b", fontSize: 14, fontWeight: "700" },
  error: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fef3f2",
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 25,
    color: "#74837b",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});

[executed on device: wagram.server.com (5d7614c9-2af1-4bc6-9b70-454e585a2a2c)]
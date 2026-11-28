import { AuthButton, AuthInput, showToast } from "@/components/native-ui"; // [MODIFIED] Komponen autentikasi bersama.
import { useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "@/components/Screen";
import { getTheme, type ThemeColors } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const authTheme = getTheme(true);

export default function LoginScreen() {
  // [MODIFIED] Login dan scanner selalu Dark tanpa mengubah Appearance global.
  const cameraColors = useMemo(() => authTheme.colors, []);
  const cameraStyles = useMemo(() => createCameraStyles(cameraColors), [cameraColors]);
  const [identity, setIdentity] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();
  const compact = height < 760;
  const isEmployee = /^HP-/i.test(identity.trim()) && identity.trim().length >= 20;
  const utils = trpc.useUtils();

  const ownerLogin = trpc.auth.login.useMutation({
    onSuccess: async () => { setError(""); await utils.auth.me.invalidate(); router.replace("/(app)/(tabs)/cashier"); },
    onError: cause => setError(cause.message || "Tidak dapat masuk. Periksa email dan password."),
  });
  const employeeLogin = trpc.auth.employeeLogin.useMutation({
    onSuccess: async () => { setError(""); await utils.auth.me.invalidate(); router.replace("/(app)/(tabs)/cashier"); },
    onError: cause => setError(cause.message || "Tidak dapat masuk. Periksa barcode dan PIN."),
  });
  const loading = ownerLogin.isPending || employeeLogin.isPending;
  const canSubmit = isEmployee ? /^\d{6}$/.test(secret) : identity.trim().includes("@") && secret.length > 0;

  function handleContinue() {
    setError("");
    if (isEmployee) employeeLogin.mutate({ barcode: identity.trim(), pin: secret });
    else ownerLogin.mutate({ email: identity.trim(), password: secret });
  }

  async function openScanner() {
    setError(""); setScanned(false);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) { showToast("Izin kamera diperlukan", "Izinkan HeyPost menggunakan kamera untuk memindai barcode karyawan.", "error"); return; }
    }
    setCameraOpen(true);
  }

  // [ADDED] Pilih gambar barcode dari galeri lalu baca kodenya.
  async function pickBarcodeFromGallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const barcodes = await scanFromURLAsync(result.assets[0].uri, ["qr","code128","code39","code93","codabar","ean13","ean8","upc_a","upc_e","itf14","pdf417","aztec","datamatrix"]);
      const barcode = barcodes.find(item => item.data?.trim());
      if (!barcode) {
        showToast("Barcode tidak ditemukan", "Pilih gambar yang menampilkan barcode karyawan dengan jelas.", "error");
        return;
      }
      setIdentity(barcode.data.trim());
      setSecret("");
      setError("");
      setScanned(true);
      setCameraOpen(false);
    } catch (cause) {
      showToast("Gagal membaca gambar", cause instanceof Error ? cause.message : "Coba pilih gambar lain.", "error");
    }
  }

  async function handleGoogleLogin() {
    if (googleLoading) return;
    setError(""); setGoogleLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "https://apihey.doodweb.tech"}/api/auth/google/mobile/start`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const payload = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !payload.authorizationUrl) throw new Error(payload.error || "Tidak dapat memulai login Google.");
      await Linking.openURL(payload.authorizationUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tidak dapat membuka login Google."); setGoogleLoading(false); }
  }

  return (
    <Screen scroll={false} fullBleed forceDark>
      <StatusBar style="light" />
      {/* [MODIFIED] Keyboard menggeser viewport dan ScrollView membawa input aktif ke area terlihat. */}
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.loginScroll}
          contentContainerStyle={[styles.content,{paddingHorizontal:width<380?22:28},compact&&styles.compactContent]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
          <View pointerEvents="none" style={styles.backgroundDecor}><View style={styles.backgroundGlowTop}/><View style={styles.backgroundGlowBottom}/><View style={styles.backgroundRing}/></View>
          {/* [MODIFIED] Menggunakan logo resmi terbaru dari paket HeyPost. */}
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/heypost-logo.png")} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View style={[styles.heading,compact&&styles.compactHeading]}>
            <Text style={[styles.title,compact&&styles.compactTitle]}>Selamat datang</Text>
            <Text style={[styles.subtitle,compact&&styles.compactSubtitle]}>Masuk untuk mengelola bisnis Anda dengan lebih mudah.</Text>
          </View>
          <View style={styles.form}>
            <AuthInput
              label="Email atau barcode"
              value={identity}
              onChangeText={value=>{setIdentity(value);setError("");}}
              placeholder="Email atau kode barcode"
              leftIcon={isEmployee ? "barcode-outline" : "mail-outline"}
              rightIcon="camera-outline"
              onRightPress={openScanner}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              containerStyle={compact ? [styles.inputShell, styles.compactInputShell] : styles.inputShell}
              inputStyle={styles.inputText}
            />
            <View style={styles.field}>
              <AuthInput
                label={isEmployee ? "PIN 6 digit" : "Password atau PIN"}
                value={secret}
                onChangeText={value=>{setSecret(isEmployee?value.replace(/\D/g,"").slice(0,6):value);setError("");}}
                placeholder={isEmployee ? "Masukkan PIN 6 digit" : "Masukkan password atau PIN"}
                leftIcon="lock-closed-outline"
                rightIcon={showSecret ? "eye-off-outline" : "eye-outline"}
                onRightPress={() => setShowSecret(value=>!value)}
                secureTextEntry={!showSecret} // [MODIFIED] Visibilitas PIN karyawan juga mengikuti tombol mata.
                keyboardType={isEmployee ? "number-pad" : "default"}
                maxLength={isEmployee ? 6 : undefined}
                autoCapitalize="none"
                containerStyle={compact ? [styles.inputShell, styles.compactInputShell] : styles.inputShell}
                inputStyle={styles.inputText}
              />
              {!isEmployee?<Pressable accessibilityRole="button" onPress={()=>showToast("Lupa password?", "Fitur reset password belum tersedia.", "error")} style={styles.forgotPassword}><Text style={styles.forgotPasswordText}>Lupa password?</Text></Pressable>:null}
            </View>
          </View>
          {error?<Text accessibilityRole="alert" style={styles.error}>{error}</Text>:null}
          {/* [MODIFIED] Tombol masuk memakai komponen autentikasi global. */}
          <AuthButton title="Masuk" onPress={handleContinue} disabled={!canSubmit} loading={loading} style={compact ? { ...styles.primaryButton, ...styles.compactPrimaryButton } : styles.primaryButton} trailing={<Text style={styles.primaryArrow}>→</Text>} />
          <View style={styles.separator}><View style={styles.separatorLine}/><Text style={styles.separatorText}>atau</Text><View style={styles.separatorLine}/></View>
          <Pressable accessibilityRole="button" disabled={googleLoading} onPress={handleGoogleLogin} style={({pressed})=>[styles.googleButton,pressed&&styles.pressed,googleLoading&&styles.disabledButton]}>
            <Svg width={25} height={25} viewBox="0 0 24 24" style={styles.googleMark}>
              <Path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.61v2.92h3.87c2.27-2.09 3.57-5.17 3.57-8.77Z"/>
              <Path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.93l-3.87-2.95c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.04A12 12 0 0 0 12 24Z"/>
              <Path fill="#FBBC05" d="M5.27 14.31A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.31V6.65H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.35l4-3.04Z"/>
              <Path fill="#EA4335" d="M12 4.73c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.48 11.48 0 0 0 12 0 12 12 0 0 0 1.27 6.65l4 3.04c.95-2.85 3.6-4.96 6.73-4.96Z"/>
            </Svg>
            <Text style={styles.googleButtonText}>{googleLoading?"Menghubungkan ke Google...":"Lanjutkan dengan Google"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={()=>router.push("/register")} style={styles.registerLinkButton}>
            <Text style={styles.registerText}>Belum punya akun? </Text><Text style={styles.registerLink}>Daftar sekarang</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={()=>setCameraOpen(false)}>
        <View style={cameraStyles.cameraModal}>
          {/* [MODIFIED] Safe area menjaga header tidak tertutup status bar Android. */}
          <SafeAreaView edges={["top"]} style={cameraStyles.cameraHeaderSafe}>
            <View style={cameraStyles.cameraHeader}>
              <Text style={cameraStyles.cameraTitle}>Scan barcode karyawan</Text>
              <View style={cameraStyles.cameraHeaderActions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Pilih barcode dari galeri" onPress={pickBarcodeFromGallery} style={({pressed})=>[cameraStyles.galleryButton,pressed&&styles.pressed]}>
                  <Ionicons name="images-outline" size={19} color="#FFFFFF" />
                  <Text style={cameraStyles.galleryButtonText}>Galeri</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Tutup kamera" onPress={()=>setCameraOpen(false)} style={cameraStyles.cameraClose}><Ionicons name="close" size={27} color={cameraColors.ink}/></Pressable>
              </View>
            </View>
          </SafeAreaView>
          <CameraView style={{flex:1}} facing="back" barcodeScannerSettings={{barcodeTypes:["qr","code128","code39","code93","codabar","ean13","ean8","upc_a","upc_e","itf14","pdf417","aztec","datamatrix"]}} onBarcodeScanned={scanned?undefined:({data})=>{setScanned(true);setIdentity(data.trim());setSecret("");setError("");setCameraOpen(false);}}>
            <View style={cameraStyles.cameraBody}><View style={cameraStyles.scanFrame}/><Text style={cameraStyles.cameraHint}>Arahkan kamera ke barcode karyawan. Kode akan terisi otomatis.</Text></View>
          </CameraView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: authTheme.colors.surface },
  loginScroll: { flex: 1 },
  // [MODIFIED] Konten memenuhi layar saat keyboard tertutup dan dapat bergulir saat keyboard terbuka.
  content: {
    flexGrow: 1,
    minHeight: "100%",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: authTheme.colors.surface,
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
    backgroundColor: authTheme.colors.signalSoft,
  },
  backgroundGlowBottom: {
    position: "absolute",
    width: 235,
    height: 235,
    borderRadius: 118,
    bottom: -155,
    left: -115,
    backgroundColor: authTheme.colors.signalSoft,
  },
  backgroundRing: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    top: 42,
    right: -78,
    borderWidth: 18,
    borderColor: authTheme.colors.signalSoft,
  },
  compactContent: { paddingTop: 6, paddingBottom: 6 },
  veryCompactContent: { paddingTop: 2, paddingBottom: 2 },
  logoWrap: { alignItems: "center", marginBottom: 15 },
  // [ADDED] Ukuran logo dijaga proporsional seperti area logo sebelumnya.
  logoImage: { width: 112, height: 112 },
  registerLinkButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 15, paddingVertical: 8 },
  heading: { marginBottom: 24 },
  compactHeading: { marginBottom: 17 },
  title: {
    color: authTheme.colors.ink,
    // [MODIFIED] Ukuran judul login lebih seimbang pada layar kecil.
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  compactTitle: { fontSize: 26, lineHeight: 32 },
  subtitle: {
    maxWidth: 340,
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 23,
  },
  compactSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  form: { gap: 15 },
  field: { gap: 7 },
  label: { color: authTheme.colors.ink, fontSize: 15, fontWeight: "700" },
  inputShell: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: "#D1D6DC",
    borderRadius: 16,
    backgroundColor: authTheme.colors.surface,
  },
  compactInputShell: { minHeight: 50, borderRadius: 14 },
  fieldIcon: { width: 34 },
  inputText: {
    flex: 1,
    minHeight: 50,
    padding: 0,
    color: "#FFFFFF",
    fontSize: 16,
  },
  passwordToggle: {
    minWidth: 38,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotPassword: { alignSelf: "flex-end", marginTop: 5, paddingVertical: 2 },
  forgotPasswordText: { color: "#F5B900", fontSize: 14, fontWeight: "600" },
  primaryButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 19,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#F5B900",
  },
  compactPrimaryButton: { minHeight: 50, marginTop: 13 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
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
  separatorText: { color: "#FFFFFF", fontSize: 14 },
  googleButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    borderWidth: 1.5,
    borderColor: "#D1D6DC",
    borderRadius: 16,
    backgroundColor: authTheme.colors.surface,
  },
  googleMark: { width: 27 },
  googleButtonText: { color: authTheme.colors.ink, fontSize: 15, fontWeight: "700" },
  employeeButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    marginTop: 13,
    borderRadius: 16,
    backgroundColor: authTheme.colors.signalSoft,
  },
  employeeButtonText: { color: "#F5B900", fontSize: 15, fontWeight: "800" },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 18,
  },
  registerText: { color: "#FFFFFF", fontSize: 14 },
  registerLink: { color: "#F5B900", fontSize: 15, fontWeight: "800" },
  backButton: { alignItems: "center", paddingVertical: 16 },
  backButtonText: { color: "#F5B900", fontSize: 14, fontWeight: "700" },
  cameraModal: { flex: 1, backgroundColor: "#000000" },
  cameraHeader: { height: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: authTheme.colors.ink },
  cameraTitle: { color: authTheme.colors.surface, fontSize: 16, fontWeight: "700", flex: 1 },
  cameraHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  galleryButton: { minHeight: 40, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, backgroundColor: "#24483E" },
  galleryButtonText: { color: authTheme.colors.surface, fontSize: 13, fontWeight: "700" },
  cameraClose: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  cameraBody: { flex: 1, justifyContent: "center", alignItems: "center" },
  cameraHint: { color: authTheme.colors.surface, fontSize: 14, textAlign: "center", marginTop: 22, paddingHorizontal: 28 },
  error: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FEF3F2",
    color: authTheme.colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
});


// [ADDED] Tema scanner mengikuti token global HeyPost untuk mode terang dan gelap.
const createCameraStyles = (colors: ThemeColors) => StyleSheet.create({
  cameraModal: { flex: 1, backgroundColor: colors.ground },
  cameraHeaderSafe: { backgroundColor: colors.surface },
  cameraHeader: {
    minHeight: 68,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  cameraTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", flex: 1, paddingRight: 10 },
  cameraHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  galleryButton: {
    minHeight: 42,
    minWidth: 94,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    backgroundColor: colors.signal,
  },
  galleryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  cameraClose: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  cameraBody: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  scanFrame: { width: 260, height: 150, borderWidth: 2, borderColor: "#FFFFFF", borderRadius: 14, backgroundColor: "transparent" },
  cameraHint: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.48)",
  },
});

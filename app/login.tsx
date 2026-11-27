import { useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Rect, Circle, Text as SvgText } from "react-native-svg";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

export default function LoginScreen() {
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
      if (!result.granted) { Alert.alert("Izin kamera diperlukan", "Izinkan HeyPost menggunakan kamera untuk memindai barcode karyawan."); return; }
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
        Alert.alert("Barcode tidak ditemukan", "Pilih gambar yang menampilkan barcode karyawan dengan jelas.");
        return;
      }
      setIdentity(barcode.data.trim());
      setSecret("");
      setError("");
      setScanned(true);
      setCameraOpen(false);
    } catch (cause) {
      Alert.alert("Gagal membaca gambar", cause instanceof Error ? cause.message : "Coba pilih gambar lain.");
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
    <Screen scroll={false} fullBleed>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.content,{paddingHorizontal:width<380?22:28},compact&&styles.compactContent]}>
          <View pointerEvents="none" style={styles.backgroundDecor}><View style={styles.backgroundGlowTop}/><View style={styles.backgroundGlowBottom}/><View style={styles.backgroundRing}/></View>
          <View style={styles.logoWrap}>
            <Svg width={112} height={112} viewBox="0 0 512 512">
              <Rect x="0" y="0" width="512" height="512" rx="112" fill="#000000" />
              <SvgText x="256" y="244" textAnchor="middle" fontSize="146" fontWeight="900" letterSpacing="-8" fill="#C8FF00">HEY</SvgText>
              <SvgText x="150" y="390" textAnchor="middle" fontSize="142" fontWeight="900" fontStyle="italic" fill="#C8FF00">P</SvgText>
              <Circle cx="256" cy="337" r="61" fill="#C8FF00" />
              <SvgText x="256" y="359" textAnchor="middle" fontSize="67" fontWeight="900" fontStyle="italic" fill="#000000">Rp</SvgText>
              <SvgText x="375" y="390" textAnchor="middle" fontSize="142" fontWeight="900" fontStyle="italic" fill="#C8FF00">ST</SvgText>
            </Svg>
          </View>
          <View style={[styles.heading,compact&&styles.compactHeading]}>
            <Text style={[styles.title,compact&&styles.compactTitle]}>Selamat datang</Text>
            <Text style={[styles.subtitle,compact&&styles.compactSubtitle]}>Masuk untuk mengelola bisnis Anda dengan lebih mudah.</Text>
          </View>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email atau barcode</Text>
              <View style={[styles.inputShell,compact&&styles.compactInputShell]}>
                <Ionicons name={isEmployee?"barcode-outline":"mail-outline"} size={21} color="#68727D" style={styles.fieldIcon}/>
                <TextInput accessibilityLabel="Email atau barcode" autoCapitalize="none" autoCorrect={false} autoComplete="off" keyboardType="email-address" onChangeText={value=>{setIdentity(value);setError("");}} placeholder="Email atau kode barcode" placeholderTextColor="#858D97" returnKeyType="next" style={styles.inputText} value={identity}/>
                <Pressable accessibilityRole="button" accessibilityLabel="Scan barcode dengan kamera" onPress={openScanner} style={styles.passwordToggle}><Ionicons name="camera-outline" size={24} color="#087746"/></Pressable>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{isEmployee?"PIN 6 digit":"Password atau PIN"}</Text>
              <View style={[styles.inputShell,compact&&styles.compactInputShell]}>
                <Ionicons name="lock-closed-outline" size={21} color="#68727D" style={styles.fieldIcon}/>
                <TextInput accessibilityLabel={isEmployee?"PIN karyawan":"Password atau PIN"} autoCapitalize="none" keyboardType={isEmployee?"number-pad":"default"} maxLength={isEmployee?6:undefined} onChangeText={value=>{setSecret(isEmployee?value.replace(/\D/g,"").slice(0,6):value);setError("");}} placeholder={isEmployee?"Masukkan PIN 6 digit":"Masukkan password atau PIN"} placeholderTextColor="#858D97" secureTextEntry={!showSecret} style={styles.inputText} value={secret}/>
                <Pressable accessibilityRole="button" accessibilityLabel={showSecret?"Sembunyikan password":"Tampilkan password"} hitSlop={10} onPress={()=>setShowSecret(value=>!value)} style={styles.passwordToggle}><Ionicons name={showSecret?"eye-off-outline":"eye-outline"} size={21} color="#68727D"/></Pressable>
              </View>
              {!isEmployee?<Pressable accessibilityRole="button" onPress={()=>Alert.alert("Lupa password?","Fitur reset password belum tersedia.")} style={styles.forgotPassword}><Text style={styles.forgotPasswordText}>Lupa password?</Text></Pressable>:null}
            </View>
          </View>
          {error?<Text accessibilityRole="alert" style={styles.error}>{error}</Text>:null}
          <Pressable accessibilityRole="button" disabled={!canSubmit||loading} onPress={handleContinue} style={({pressed})=>[styles.primaryButton,compact&&styles.compactPrimaryButton,(!canSubmit||loading)&&styles.disabledButton,pressed&&styles.pressed]}>
            <Text style={styles.primaryButtonText}>{loading?"Memproses...":"Masuk"}</Text><Text style={styles.primaryArrow}>→</Text>
          </Pressable>
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
        </View>
      </KeyboardAvoidingView>
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={()=>setCameraOpen(false)}>
        <View style={styles.cameraModal}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>Scan barcode karyawan</Text>
            <View style={styles.cameraHeaderActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Pilih barcode dari galeri" onPress={pickBarcodeFromGallery} style={styles.galleryButton}>
                <Ionicons name="images-outline" size={19} color="#FFFFFF" />
                <Text style={styles.galleryButtonText}>Galeri</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup kamera" onPress={()=>setCameraOpen(false)} style={styles.cameraClose}><Ionicons name="close" size={27} color="#FFFFFF"/></Pressable>
            </View>
          </View>
          <CameraView style={{flex:1}} facing="back" barcodeScannerSettings={{barcodeTypes:["qr","code128","code39","code93","codabar","ean13","ean8","upc_a","upc_e","itf14","pdf417","aztec","datamatrix"]}} onBarcodeScanned={scanned?undefined:({data})=>{setScanned(true);setIdentity(data.trim());setSecret("");setError("");setCameraOpen(false);}}>
            <View style={styles.cameraBody}><View style={{width:260,height:150,borderWidth:2,borderColor:"#FFFFFF",borderRadius:14,backgroundColor:"transparent"}}/><Text style={styles.cameraHint}>Arahkan kamera ke barcode karyawan. Kode akan terisi otomatis.</Text></View>
          </CameraView>
        </View>
      </Modal>
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
  logoWrap: { alignItems: "center", marginBottom: 15 },
  registerLinkButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 15, paddingVertical: 8 },
  heading: { marginBottom: 24 },
  compactHeading: { marginBottom: 17 },
  title: {
    color: "#092D25",
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
    color: "#5B6067",
    fontSize: 16,
    lineHeight: 23,
  },
  compactSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  form: { gap: 15 },
  field: { gap: 7 },
  label: { color: "#102C25", fontSize: 15, fontWeight: "700" },
  inputShell: {
    minHeight: 50,
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
    minHeight: 50,
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
  separatorText: { color: "#747B84", fontSize: 14 },
  googleButton: {
    minHeight: 48,
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
    minHeight: 48,
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
  cameraModal: { flex: 1, backgroundColor: "#000000" },
  cameraHeader: { height: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#10251F" },
  cameraTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", flex: 1 },
  cameraHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  galleryButton: { minHeight: 40, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, backgroundColor: "#24483E" },
  galleryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  cameraClose: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  cameraBody: { flex: 1, justifyContent: "center", alignItems: "center" },
  cameraHint: { color: "#FFFFFF", fontSize: 14, textAlign: "center", marginTop: 22, paddingHorizontal: 28 },
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

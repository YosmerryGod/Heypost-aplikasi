// [MODIFIED] Pengaturan printer mendukung pemasangan Bluetooth Android dan cetak ESC/POS langsung.
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as IntentLauncher from "expo-intent-launcher";
import { EscPosPrinter, type PrinterDevice } from "rn-escpos-printer";

type PaperWidth = "58" | "80";
type PrinterPreferences = { paperWidth: PaperWidth; autoPrint: boolean; printerAddress: string | null; printerName: string | null };
const STORAGE_KEY = "heypost.printer.preferences";
const DEFAULT_PREFERENCES: PrinterPreferences = { paperWidth: "58", autoPrint: false, printerAddress: null, printerName: null };

export default function PrinterScreen() {
  const [preferences, setPreferences] = useState<PrinterPreferences>(DEFAULT_PREFERENCES);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const persistPreferences = async (next: PrinterPreferences) => {
    setPreferences(next);
    try { await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)); }
    catch { Alert.alert("Gagal menyimpan", "Pengaturan printer belum berhasil disimpan."); }
  };

  const refreshDevices = useCallback(async () => {
    setLoadingDevices(true);
    setErrorMessage("");
    try {
      await EscPosPrinter.initialize();
      const found = await EscPosPrinter.getPrinters();
      setDevices(found);
      const connected = await EscPosPrinter.isConnected();
      if (connected && preferences.printerAddress) setConnectedAddress(preferences.printerAddress);
      else if (!connected) setConnectedAddress(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Bluetooth tidak dapat diakses.");
    } finally { setLoadingDevices(false); }
  }, [preferences.printerAddress]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (!mounted) return;
      if (stored) {
        try { setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }); }
        catch { setErrorMessage("Pengaturan tersimpan tidak dapat dibaca."); }
      }
      setLoaded(true);
    }).catch(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []));

  useFocusEffect(useCallback(() => {
    void refreshDevices();
    return undefined;
  }, [refreshDevices]));

  const openBluetoothSettings = async () => {
    try { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS); }
    catch { Alert.alert("Bluetooth", "Tidak dapat membuka pengaturan Bluetooth perangkat."); }
  };

  const connectPrinter = async (device: PrinterDevice) => {
    setConnectingAddress(device.address);
    setErrorMessage("");
    try {
      await EscPosPrinter.initialize();
      if (await EscPosPrinter.isConnected()) await EscPosPrinter.disconnect();
      await EscPosPrinter.connect(device, { timeoutMs: 12000 });
      setConnectedAddress(device.address);
      await persistPreferences({ ...preferences, printerAddress: device.address, printerName: device.name });
      Alert.alert("Printer terhubung", device.name + " siap digunakan.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Koneksi Bluetooth gagal.";
      setErrorMessage(message);
      Alert.alert("Gagal menghubungkan", message);
    } finally { setConnectingAddress(null); }
  };

  const disconnectPrinter = async () => {
    try {
      await EscPosPrinter.disconnect();
      setConnectedAddress(null);
      Alert.alert("Printer terputus", "Koneksi Bluetooth telah diputus.");
    } catch (error) { Alert.alert("Gagal memutuskan", error instanceof Error ? error.message : "Silakan coba lagi."); }
  };

  const testPrint = async () => {
    if (!preferences.printerAddress) {
      Alert.alert("Pilih printer", "Hubungkan printer Bluetooth terlebih dahulu.");
      return;
    }
    setConnectingAddress(preferences.printerAddress);
    try {
      await EscPosPrinter.initialize();
      if (!(await EscPosPrinter.isConnected())) {
        const device = devices.find((item) => item.address === preferences.printerAddress);
        if (!device) throw new Error("Printer tidak ditemukan. Pasangkan kembali melalui pengaturan Bluetooth.");
        await EscPosPrinter.connect(device, { timeoutMs: 12000 });
      }
      await EscPosPrinter.printText("HeyPost\nTEST CETAK\nPrinter Bluetooth terhubung\n", { codePage: "cp850", feedLines: 3, cut: true });
      setConnectedAddress(preferences.printerAddress);
      Alert.alert("Berhasil", "Struk uji telah dikirim ke printer.");
    } catch (error) { Alert.alert("Test cetak gagal", error instanceof Error ? error.message : "Periksa printer dan koneksi Bluetooth."); }
    finally { setConnectingAddress(null); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={23} color="#53635B" />
        </Pressable>
        <Text style={styles.headerTitle}>Printer</Text>
        <View style={{ flex: 1 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Perangkat Bluetooth</Text>
              <Text style={styles.muted}>Pasangkan printer melalui Bluetooth Android</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Muat ulang perangkat" onPress={() => void refreshDevices()} style={styles.iconButton}>
              <Ionicons name="refresh" size={18} color="#087B58" />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={openBluetoothSettings} style={styles.pairButton}>
            <Ionicons name="bluetooth" size={19} color="#087B58" />
            <Text style={styles.pairButtonText}>Pasangkan perangkat</Text>
            <Ionicons name="open-outline" size={16} color="#087B58" />
          </Pressable>
          {loadingDevices ? <Text style={styles.muted}>Memuat perangkat...</Text> : null}
          {!loadingDevices && devices.length === 0 ? <Text style={styles.emptyText}>Belum ada printer yang dipasangkan. Aktifkan printer, pasangkan dari pengaturan Bluetooth, lalu muat ulang.</Text> : null}
          {devices.map((device) => {
            const isSelected = preferences.printerAddress === device.address;
            const isConnected = connectedAddress === device.address;
            return (
              <View key={device.address} style={styles.deviceRow}>
                <View style={styles.deviceIcon}><Ionicons name="print-outline" size={19} color="#087B58" /></View>
                <View style={styles.deviceCopy}>
                  <Text style={styles.deviceName} numberOfLines={1}>{device.name || "Printer Bluetooth"}</Text>
                  <Text style={styles.muted}>{device.address}</Text>
                </View>
                <Pressable accessibilityRole="button" disabled={connectingAddress !== null} onPress={() => isConnected ? void disconnectPrinter() : void connectPrinter(device)} style={[styles.connectButton, isConnected && styles.connectedButton, connectingAddress === device.address && styles.disabledButton]}>
                  <Text style={[styles.connectButtonText, isConnected && styles.connectedButtonText]}>{connectingAddress === device.address ? "..." : isConnected ? "Putus" : isSelected ? "Hubungkan" : "Pilih"}</Text>
                </Pressable>
              </View>
            );
          })}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {preferences.printerName ? <Text style={styles.selectedPrinter}>Dipilih: {preferences.printerName}</Text> : null}
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}><Ionicons name="print-outline" size={20} color="#087B58" /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Cetak otomatis</Text>
              <Text style={styles.muted}>Setelah pembayaran selesai</Text>
            </View>
            <Switch value={preferences.autoPrint} onValueChange={(autoPrint) => void persistPreferences({ ...preferences, autoPrint })} disabled={!loaded || !preferences.printerAddress} trackColor={{ false: "#D7E0DA", true: "#8BC5AE" }} thumbColor={preferences.autoPrint ? "#087B58" : "#FFFFFF"} />
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingTitle}>Ukuran kertas</Text>
          <View style={styles.paperOptions}>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: preferences.paperWidth === "58" }} onPress={() => void persistPreferences({ ...preferences, paperWidth: "58" })} style={[styles.paperOption, preferences.paperWidth === "58" && styles.paperOptionSelected]}>
              <Text style={[styles.paperOptionText, preferences.paperWidth === "58" && styles.paperOptionTextSelected]}>58 mm</Text>
            </Pressable>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: preferences.paperWidth === "80" }} onPress={() => void persistPreferences({ ...preferences, paperWidth: "80" })} style={[styles.paperOption, preferences.paperWidth === "80" && styles.paperOptionSelected]}>
              <Text style={[styles.paperOptionText, preferences.paperWidth === "80" && styles.paperOptionTextSelected]}>80 mm</Text>
            </Pressable>
          </View>
        </View>

        <Pressable accessibilityRole="button" disabled={!loaded || connectingAddress !== null || !preferences.printerAddress} onPress={() => void testPrint()} style={({ pressed }) => [styles.testButton, (!preferences.printerAddress || connectingAddress !== null) && styles.disabledButton, pressed && styles.pressed]}>
          <Ionicons name="print-outline" size={18} color="#087B58" />
          <Text style={styles.testButtonText}>{connectingAddress ? "Memproses..." : "Test cetak"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F1F7F3" },
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E9E3" },
  backButton: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#15231C", fontFamily: "Archivo-Bold", fontSize: 20, fontWeight: "800", letterSpacing: -0.35 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28, gap: 12 },
  settingsCard: { padding: 15, borderRadius: 14, borderWidth: 1, borderColor: "#D6E0D9", backgroundColor: "#FFFFFF", gap: 13 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  settingIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#EAF5EF", alignItems: "center", justifyContent: "center" },
  settingCopy: { flex: 1, gap: 2 },
  settingTitle: { color: "#1B2921", fontFamily: "Figtree-Bold", fontSize: 14, fontWeight: "800" },
  muted: { color: "#748078", fontFamily: "Figtree-Regular", fontSize: 12, lineHeight: 17 },
  iconButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#EFF8F2" },
  pairButton: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 10, borderWidth: 1, borderColor: "#BFD9CB", backgroundColor: "#F6FBF7" },
  pairButtonText: { color: "#087B58", fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "800" },
  emptyText: { color: "#748078", fontFamily: "Figtree-Regular", fontSize: 12, lineHeight: 18 },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#EDF1EE" },
  deviceIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#EAF5EF" },
  deviceCopy: { flex: 1, gap: 2 },
  deviceName: { color: "#1B2921", fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "800" },
  connectButton: { minWidth: 78, minHeight: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderRadius: 9, backgroundColor: "#087B58" },
  connectButtonText: { color: "#FFFFFF", fontFamily: "Figtree-Bold", fontSize: 12, fontWeight: "800" },
  connectedButton: { backgroundColor: "#EFF8F2", borderWidth: 1, borderColor: "#BFD9CB" },
  connectedButtonText: { color: "#087B58" },
  selectedPrinter: { color: "#087B58", fontFamily: "Figtree-SemiBold", fontSize: 12 },
  errorText: { color: "#B42318", fontFamily: "Figtree-Regular", fontSize: 12, lineHeight: 17 },
  paperOptions: { flexDirection: "row", gap: 9 },
  paperOption: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "#DCE5DF", backgroundColor: "#FFFFFF" },
  paperOptionSelected: { borderColor: "#8BC5AE", backgroundColor: "#EFF8F2" },
  paperOptionText: { color: "#59665F", fontFamily: "Figtree-SemiBold", fontSize: 13, fontWeight: "600" },
  paperOptionTextSelected: { color: "#087B58", fontWeight: "800" },
  testButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 11, borderWidth: 1, borderColor: "#BFD9CB", backgroundColor: "#FFFFFF" },
  testButtonText: { color: "#087B58", fontFamily: "Figtree-Bold", fontSize: 14, fontWeight: "800" },
  disabledButton: { opacity: 0.55 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});

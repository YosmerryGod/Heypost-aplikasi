import { LoadingState, showToast } from "@/components/native-ui"; // [ADDED] Feedback visual HeyPost.
// [MODIFIED] Tampilan pembayaran diringkas dengan hierarki visual yang lebih bersih.
import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getTheme, type ThemeColors } from "@/constants/theme";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/providers/trpc";

type BankAccount = { id: string; bankName: string; accountName: string; accountNumber: string };
const banks = [
  "BCA", "BRI", "BNI", "Bank Mandiri", "BTN", "BSI", "CIMB Niaga", "Danamon", "Bank Permata",
  "Maybank Indonesia", "OCBC", "Bank Panin", "Bank Mega", "UOB Indonesia", "HSBC Indonesia", "DBS Indonesia",
  "Bank Muamalat", "BJB", "Bank DKI", "Bank Jateng", "Bank Jatim", "Bank Kalsel", "Bank Nagari", "Bank Sumut",
  "Bank Sulselbar", "Bank Papua", "Bank Jago", "Bank BTPN / Jenius", "SeaBank", "Bank Neo Commerce", "Allo Bank",
  "blu by BCA Digital", "Bank Raya", "Bank lainnya",
];
const createId = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });

export default function PaymentSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const s = useMemo(() => createStyles(colors), [colors]);
  const utils = trpc.useUtils();
  const query = trpc.store.getPaymentSettings.useQuery();
  const uploadQr = trpc.store.uploadPaymentQr.useMutation({
    onSuccess: async () => { await utils.store.getPaymentSettings.invalidate(); showToast("Berhasil", "QRIS diperbarui.", "success"); },
    onError: (error) => showToast("Gagal", error.message, "error"),
  });
  const update = trpc.store.updatePaymentSettings.useMutation({
    onSuccess: async () => { await utils.store.getPaymentSettings.invalidate(); showToast("Berhasil", "Pengaturan disimpan.", "success"); },
    onError: (error) => showToast("Gagal", error.message, "error"),
  });
  const [merchantName, setMerchantName] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bankName, setBankName] = useState("BCA");
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [qrisEnabled, setQrisEnabled] = useState(false);
  const [transferEnabled, setTransferEnabled] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setMerchantName(query.data.qrisMerchantName ?? "");
    setMerchantId(query.data.qrisMerchantId ?? "");
    setAccounts(query.data.bankAccounts ?? []);
    setQrisEnabled(query.data.qrisEnabled);
    setTransferEnabled(query.data.transferEnabled);
  }, [query.data]);

  const chooseQr = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      showToast("Format tidak didukung", "Pilih JPG, PNG, atau WebP.", "error");
      return;
    }
    uploadQr.mutate({ dataUrl: "data:" + mime + ";base64," + asset.base64 });
  };

  const addAccount = () => {
    if (!accountName.trim() || !accountNumber.trim()) {
      showToast("Data belum lengkap", "Isi nama pemilik dan nomor rekening.", "error");
      return;
    }
    setAccounts((current) => [...current, { id: createId(), bankName, accountName: accountName.trim(), accountNumber: accountNumber.trim() }]);
    setAccountName("");
    setAccountNumber("");
    setBankName("BCA");
    setBankSearch("");
    setBankDropdownOpen(false);
    setModalOpen(false);
    setTransferEnabled(true);
  };

  const save = () => update.mutate({
    qrisEnabled,
    transferEnabled,
    qrisMerchantName: merchantName.trim() || null,
    qrisMerchantId: merchantId.trim() || null,
    bankAccounts: accounts,
  });

  if (query.isLoading) return <SafeAreaView style={s.safe}><View style={{ padding: 20 }}><LoadingState variant="form" /></View></SafeAreaView>;
  if (query.isError) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.muted}>Gagal memuat pengaturan.</Text><Pressable onPress={() => void query.refetch()}><Text style={s.retry}>Coba lagi</Text></Pressable></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#374151" /></Pressable>
        <Text style={s.headerTitle}>Pembayaran</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={save} disabled={update.isPending} style={[s.saveTop, update.isPending && s.disabled]}><Text style={s.saveTopText}>{update.isPending ? "..." : "Simpan"}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.sectionHead}>
            <View style={s.iconBox}><Ionicons name="qr-code-outline" size={20} color="#F5B900" /></View>
            <Text style={s.sectionTitle}>QRIS</Text>
            <View style={{ flex: 1 }} />
            <Switch value={qrisEnabled} onValueChange={setQrisEnabled} trackColor={{ false: "#D7DFDA", true: "#9BD2B7" }} thumbColor={qrisEnabled ? "#F5B900" : "#FFFFFF"} />
          </View>
          {qrisEnabled ? <>
            <Pressable onPress={chooseQr} disabled={uploadQr.isPending} style={s.qrPicker}>
              {query.data?.qrisImageUrl ? <Image source={{ uri: query.data.qrisImageUrl }} style={s.qrImage} /> : <View style={s.qrEmpty}><Ionicons name="qr-code-outline" size={34} color="#8A9A90" /><Text style={s.qrEmptyText}>Pilih gambar QRIS</Text></View>}
              <View style={s.qrAction}><Ionicons name="camera-outline" size={16} color="#F5B900" /><Text style={s.qrActionText}>{uploadQr.isPending ? "Mengunggah..." : query.data?.qrisImageUrl ? "Ganti QRIS" : "Unggah QRIS"}</Text></View>
            </Pressable>
            <TextInput value={merchantName} onChangeText={setMerchantName} placeholder="Nama merchant" placeholderTextColor="#929D96" style={s.input} />
            <TextInput value={merchantId} onChangeText={setMerchantId} placeholder="NMID (opsional)" placeholderTextColor="#929D96" style={s.input} autoCapitalize="characters" />
          </> : null}
        </View>

        <View style={s.card}>
          <View style={s.sectionHead}>
            <View style={[s.iconBox, s.bankIcon]}><Ionicons name="business-outline" size={20} color="#5366A5" /></View>
            <Text style={s.sectionTitle}>Transfer bank</Text>
            <View style={{ flex: 1 }} />
            <Switch value={transferEnabled} onValueChange={setTransferEnabled} trackColor={{ false: "#D7DFDA", true: "#9BD2B7" }} thumbColor={transferEnabled ? "#F5B900" : "#FFFFFF"} />
          </View>
          {transferEnabled ? <>
            {accounts.map((account) => <View key={account.id} style={s.accountRow}>
              <View style={s.accountCopy}>
                <Text style={s.bankTitle}>{account.bankName}</Text>
                <Text style={s.accountNumber}>{account.accountNumber}</Text>
                <Text style={s.accountName}>{account.accountName}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={"Hapus rekening " + account.bankName} onPress={() => Alert.alert("Hapus rekening?", account.bankName + " · " + account.accountNumber, [{ text: "Batal", style: "cancel" }, { text: "Hapus", style: "destructive", onPress: () => setAccounts((current) => current.filter((item) => item.id !== account.id)) }])} style={s.deleteButton}><Ionicons name="trash-outline" size={18} color="#A45A5A" /></Pressable>
            </View>)}
            <Pressable onPress={() => setModalOpen(true)} style={s.addButton}><Ionicons name="add" size={18} color="#F5B900" /><Text style={s.addButtonText}>Tambah rekening</Text></Pressable>
          </> : null}
        </View>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={s.modalBackdrop}><View style={s.modalCard}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Rekening baru</Text><Pressable onPress={() => setModalOpen(false)}><Ionicons name="close" size={23} color="#6B7280" /></Pressable></View>
          <Text style={s.label}>Bank</Text>
          <View style={s.bankSelectRow}>
            <Pressable onPress={() => setBankDropdownOpen((open) => !open)} style={s.bankDropdown}>
              <Text style={s.bankDropdownText}>Pilih bank</Text>
              <Ionicons name={bankDropdownOpen ? "chevron-up" : "chevron-down"} size={17} color="#6B7280" />
            </Pressable>
            <View style={s.selectedBank}><Ionicons name="business-outline" size={16} color="#F5B900" /><Text numberOfLines={1} style={s.selectedBankText}>{bankName}</Text></View>
          </View>
          {bankDropdownOpen ? <View style={s.bankDropdownPanel}>
            <TextInput value={bankSearch} onChangeText={setBankSearch} placeholder="Cari nama bank" placeholderTextColor="#929D96" style={s.bankSearchInput} />
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={s.bankList}>
              {banks.filter((bank) => bank.toLowerCase().includes(bankSearch.trim().toLowerCase())).map((bank) => <Pressable key={bank} onPress={() => { setBankName(bank); setBankDropdownOpen(false); setBankSearch(""); }} style={s.bankOption}>
                <Text style={[s.bankOptionText, bankName === bank && s.bankOptionTextActive]}>{bank}</Text>
                {bankName === bank ? <Ionicons name="checkmark" size={17} color="#F5B900" /> : null}
              </Pressable>)}
              {banks.every((bank) => !bank.toLowerCase().includes(bankSearch.trim().toLowerCase())) ? <Text style={s.noBankResult}>Bank tidak ditemukan</Text> : null}
            </ScrollView>
          </View> : null}
          <Text style={s.label}>Nama pemilik</Text><TextInput value={accountName} onChangeText={setAccountName} placeholder="Nama sesuai rekening" placeholderTextColor="#929D96" style={s.input} />
          <Text style={s.label}>Nomor rekening</Text><TextInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Nomor rekening" placeholderTextColor="#929D96" keyboardType="number-pad" style={s.input} />
          <Pressable onPress={addAccount} style={s.saveButton}><Text style={s.saveButtonText}>Tambahkan</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { width: 34, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.ink, fontFamily: "Archivo-Bold", fontSize: 18, fontWeight: "800" },
  saveTop: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.successSoft },
  saveTopText: { color: colors.signal, fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  content: { padding: 14, paddingTop: 14, paddingBottom: 28, gap: 12 },
  card: { padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: 11 },
  sectionHead: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.signalSoft, alignItems: "center", justifyContent: "center" },
  bankIcon: { backgroundColor: "#EEF1FA" },
  sectionTitle: { color: "#1C2A22", fontSize: 15, fontWeight: "800" },
  qrPicker: { minHeight: 142, borderWidth: 1, borderColor: colors.line, borderRadius: 11, backgroundColor: colors.surfaceSubtle, alignItems: "center", justifyContent: "center", padding: 10, gap: 8 },
  qrImage: { width: 112, height: 112, resizeMode: "contain" },
  qrEmpty: { height: 92, alignItems: "center", justifyContent: "center", gap: 5 },
  qrEmptyText: { color: "#7C8981", fontSize: 12 },
  qrAction: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.signalSoft },
  qrActionText: { color: colors.signal, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 42, borderWidth: 1, borderColor: colors.line, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.surface, color: colors.ink, fontSize: 13 },
  accountRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#EDF1EE" },
  accountCopy: { flex: 1, gap: 2 },
  bankTitle: { color: "#29372F", fontSize: 13, fontWeight: "800" },
  accountNumber: { color: colors.ink, fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
  accountName: { color: "#7A877F", fontSize: 11 },
  deleteButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  addButton: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: "#C9DED1", borderRadius: 9, borderStyle: "dashed" },
  addButtonText: { color: colors.signal, fontSize: 13, fontWeight: "700" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { padding: 18, paddingBottom: 30, gap: 11, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.surface },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  modalTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  bankSelectRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  bankDropdown: { flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface },
  bankDropdownText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  selectedBank: { flex: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: "#BFDCCB", backgroundColor: colors.signalSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  selectedBankText: { color: colors.signal, fontSize: 12, fontWeight: "800", flexShrink: 1 },
  bankDropdownPanel: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 8, gap: 5, backgroundColor: colors.surface },
  bankSearchInput: { minHeight: 38, borderWidth: 1, borderColor: "#E5EAE6", borderRadius: 8, paddingHorizontal: 10, color: colors.ink, fontSize: 13 },
  bankList: { maxHeight: 170 },
  bankOption: { minHeight: 39, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F0F3F1" },
  bankOptionText: { color: colors.muted, fontSize: 13 },
  bankOptionTextActive: { color: colors.signal, fontWeight: "800" },
  noBankResult: { padding: 12, color: "#7A877F", fontSize: 12, textAlign: "center" },
  saveButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.signal, marginTop: 3 },
  saveButtonText: { color: colors.surface, fontSize: 14, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: colors.muted, fontSize: 13 },
  retry: { color: colors.signal, fontSize: 14, fontWeight: "800" },
});

// [MODIFIED] Expenses page follows HeyPost frontend's operational expense summary and list.
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag, formatRupiah } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

const categories = ["Bahan baku", "Operasional", "Transportasi", "Gaji", "Listrik & air", "Perawatan", "Lainnya"];
type PaymentMethod = "Tunai" | "QRIS" | "Kartu";
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

export default function ExpensesScreen() {
  const utils = trpc.useUtils();
  const session = trpc.auth.me.useQuery();
  const canCancel = session.data?.principal.role === "owner";
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("Tunai");
  const [date, setDate] = useState(today());
  const [selected, setSelected] = useState<number | null>(null);
  const query = trpc.expenses.list.useQuery({ fromDate: from, toDate: to }, { enabled: from <= to });
  const cancel = trpc.expenses.cancel.useMutation({
    onSuccess: async () => { await utils.expenses.list.invalidate(); setSelected(null); },
    onError: (error) => Alert.alert("Gagal membatalkan", error.message),
  });
  const create = trpc.expenses.create.useMutation({
    onSuccess: async () => { await utils.expenses.list.invalidate(); setCreateOpen(false); setCategory(categories[0]); setDescription(""); setAmount(""); setPayment("Tunai"); setDate(today()); },
    onError: (error) => Alert.alert("Gagal menyimpan", error.message),
  });

  if (query.isLoading) return <AppScreen><LoadingState /></AppScreen>;
  if (query.error) return <AppScreen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></AppScreen>;

  const rows = query.data ?? [];
  const activeRows = rows.filter((row) => row.status === "Aktif");
  const cancelledRows = rows.filter((row) => row.status === "Dibatalkan");
  const total = activeRows.reduce((sum, row) => sum + row.amount, 0);
  const selectedExpense = rows.find((row) => row.id === selected);

  return (
    <AppScreen>
      <PageHeading eyebrow="KEUANGAN OPERASIONAL" title="Pengeluaran" subtitle="Catat dan pantau biaya operasional outlet." right={<Pressable accessibilityRole="button" onPress={() => setCreateOpen(true)} style={s.addButton}><Ionicons name="add" size={19} color="#fff" /><Text style={s.addButtonText}>Catat</Text></Pressable>} />
      <Panel style={s.summary}>
        <View style={s.summaryIcon}><Ionicons name="wallet-outline" size={22} color={theme.colors.signal} /></View>
        <View style={{ flex: 1, gap: 3 }}><Text style={s.summaryLabel}>Total pengeluaran aktif</Text><Text style={s.summaryValue}>{formatRupiah(total)}</Text><Text style={s.summaryFoot}>{activeRows.length} aktif · {cancelledRows.length} dibatalkan</Text></View>
      </Panel>
      <View style={s.listHeading}><View><Text style={s.heading}>Daftar pengeluaran</Text><Text style={s.muted}>Data mengikuti outlet yang sedang aktif.</Text></View></View>
      <View style={s.dateRange}>
        <View style={{ flex: 1 }}><Field label="Dari" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /></View>
        <View style={{ flex: 1 }}><Field label="Sampai" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /></View>
      </View>
      {from > to ? <EmptyState title="Rentang tanggal tidak valid" description="Tanggal awal tidak boleh melewati tanggal akhir." /> : rows.length === 0 ? <EmptyState title="Belum ada pengeluaran" description="Catat biaya operasional agar arus kas outlet lebih mudah dipantau." action={<ActionButton title="Catat pengeluaran" onPress={() => setCreateOpen(true)} />} /> : (
        <View style={s.list}>
          {rows.map((row) => <Pressable key={row.id} onPress={() => setSelected(row.id)} style={[s.expenseRow, row.status === "Dibatalkan" && s.cancelledRow]}>
            <View style={s.expenseIcon}><Ionicons name="receipt-outline" size={19} color={theme.colors.signal} /></View>
            <View style={s.expenseInfo}><View style={s.expenseTitleRow}><Text style={s.expenseTitle}>{row.category}</Text><Tag tone={row.status === "Aktif" ? "green" : "neutral"}>{row.status}</Tag></View><Text numberOfLines={1} style={s.muted}>{row.description || row.paymentMethod}</Text><Text style={s.dateText}>{row.expenseDate} · {row.paymentMethod}</Text></View>
            <Text style={s.expenseAmount}>{formatRupiah(row.amount)}</Text>
          </Pressable>)}
        </View>
      )}

      <Modal visible={!!selectedExpense} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}><View style={s.sheet}>
          <View style={s.sheetHeader}><Text style={s.heading}>Detail pengeluaran</Text><Pressable onPress={() => setSelected(null)}><Ionicons name="close" size={24} color={theme.colors.muted} /></Pressable></View>
          <View style={s.detailLine}><Text style={s.muted}>Tanggal</Text><Text style={s.detailValue}>{selectedExpense?.expenseDate}</Text></View>
          <View style={s.detailLine}><Text style={s.muted}>Kategori</Text><Text style={s.detailValue}>{selectedExpense?.category}</Text></View>
          <View style={s.detailLine}><Text style={s.muted}>Keterangan</Text><Text style={s.detailValue}>{selectedExpense?.description || "—"}</Text></View>
          <View style={s.detailLine}><Text style={s.muted}>Pembayaran</Text><Text style={s.detailValue}>{selectedExpense?.paymentMethod}</Text></View>
          <View style={s.detailTotal}><Text style={s.heading}>Nominal</Text><Text style={s.summaryValue}>{formatRupiah(selectedExpense?.amount ?? 0)}</Text></View>
          {canCancel && selectedExpense?.status === "Aktif" ? <ActionButton title="Batalkan pengeluaran" danger loading={cancel.isPending} onPress={() => Alert.alert("Batalkan pengeluaran?", "Riwayat tetap tersimpan, tetapi nominal tidak lagi dihitung.", [{ text: "Kembali", style: "cancel" }, { text: "Batalkan", style: "destructive", onPress: () => cancel.mutate({ id: selectedExpense.id }) }])} /> : null}
          <ActionButton title="Tutup" secondary onPress={() => setSelected(null)} />
        </View></View>
      </Modal>

      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateOpen(false)}>
        <AppScreen><PageHeading title="Catat pengeluaran" subtitle="Pengeluaran dicatat pada outlet yang sedang aktif." />
          <Text style={s.formLabel}>Kategori</Text><View style={s.chips}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[s.chip, category === value && s.chipActive]}><Text style={[s.chipText, category === value && s.chipTextActive]}>{value}</Text></Pressable>)}</View>
          <Field label="Nominal (Rp)" value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="150000" />
          <Field label="Tanggal pengeluaran" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field label="Keterangan (opsional)" value={description} onChangeText={setDescription} placeholder="Contoh: Pembelian gas" />
          <Text style={s.formLabel}>Metode pembayaran</Text><View style={s.chips}>{(["Tunai", "QRIS", "Kartu"] as PaymentMethod[]).map((value) => <Pressable key={value} onPress={() => setPayment(value)} style={[s.chip, payment === value && s.chipActive]}><Text style={[s.chipText, payment === value && s.chipTextActive]}>{value}</Text></Pressable>)}</View>
          <ActionButton title={create.isPending ? "Menyimpan..." : "Simpan pengeluaran"} loading={create.isPending} disabled={!Number(amount) || !date} onPress={() => create.mutate({ category, description: description.trim() || undefined, amount: Number(amount), paymentMethod: payment, expenseDate: date })} />
          <ActionButton title="Batal" secondary onPress={() => setCreateOpen(false)} />
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  addButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, borderRadius: 9, backgroundColor: theme.colors.signal },
  addButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  summary: { flexDirection: "row", alignItems: "center", gap: 13, padding: 18 },
  summaryIcon: { width: 45, height: 45, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signalSoft },
  summaryLabel: { color: theme.colors.muted, fontSize: 11 },
  summaryValue: { color: theme.colors.ink, fontFamily: "Archivo-ExtraBold", fontSize: 24 },
  summaryFoot: { color: theme.colors.muted, fontSize: 10 },
  listHeading: { marginTop: 5 },
  heading: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 17 },
  muted: { color: theme.colors.muted, fontSize: 11 },
  dateRange: { flexDirection: "row", gap: 10 },
  list: { overflow: "hidden", borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, backgroundColor: theme.colors.surface },
  expenseRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  cancelledRow: { backgroundColor: "#f5f5f6" },
  expenseIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.signalSoft },
  expenseInfo: { flex: 1, minWidth: 0, gap: 3 },
  expenseTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  expenseTitle: { color: theme.colors.ink, fontSize: 12, fontWeight: "800", flexShrink: 1 },
  dateText: { color: theme.colors.muted, fontSize: 10 },
  expenseAmount: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0007" },
  sheet: { padding: 20, gap: 13, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: theme.colors.surface },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detailLine: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  detailValue: { color: theme.colors.ink, fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  detailTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10 },
  formLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, backgroundColor: "#edf2ee" },
  chipActive: { backgroundColor: theme.colors.signal },
  chipText: { color: theme.colors.muted, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
});
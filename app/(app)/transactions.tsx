// [MODIFIED] Daily ledger follows HeyPost frontend's sales, expense and balance summary layout.
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag, formatDate, formatRupiah } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

type Transaction = { id: number; invoiceNumber: string; customerName: string | null; createdAt: Date; orderType: string; paymentMethod: string; status: "Selesai" | "Dibatalkan"; subtotal: number; discount: number; total: number; cashReceived: number | null; items: { productId: number; productName: string; quantity: number; unitPrice: number; subtotal: number }[] };
type Expense = { id: number; category: string; description: string | null; amount: number; paymentMethod: string; expenseDate: string; status: "Aktif" | "Dibatalkan"; createdAt: Date };
type PaymentMethod = "Tunai" | "QRIS" | "Kartu";
const categories = ["Bahan baku", "Operasional", "Transportasi", "Gaji", "Listrik & air", "Perawatan", "Lainnya"];
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

export default function TransactionsScreen() {
  const utils = trpc.useUtils();
  const session = trpc.auth.me.useQuery();
  const query = trpc.pos.transactions.useQuery();
  const canViewExpenses = session.data?.principal.role === "owner" || session.data?.principal.permissions.includes("expenses.daily.view") === true;
  const canCreateExpenses = session.data?.principal.role === "owner" || session.data?.principal.permissions.includes("expenses.daily.create") === true;
  const expensesQuery = trpc.expenses.list.useQuery({ fromDate: today(), toDate: today() }, { enabled: !!canViewExpenses });
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("Tunai");

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("heypost:search-query", (value: string) => setSearch(value));
    return () => subscription.remove();
  }, []);

  const cancelTransaction = trpc.pos.cancelTransaction.useMutation({
    onSuccess: async () => { await Promise.all([utils.pos.transactions.invalidate(), utils.pos.summary.invalidate(), utils.pos.bootstrap.invalidate()]); setSelected(null); Alert.alert("Berhasil", "Transaksi dibatalkan dan stok dikembalikan."); },
    onError: (error) => Alert.alert("Gagal", error.message),
  });
  const cancelExpense = trpc.expenses.cancel.useMutation({
    onSuccess: async () => { await utils.expenses.invalidate(); setSelectedExpense(null); },
    onError: (error) => Alert.alert("Gagal", error.message),
  });
  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: async () => { await utils.expenses.invalidate(); setExpenseOpen(false); setAmount(""); setDescription(""); setCategory(categories[0]); setPayment("Tunai"); Alert.alert("Tersimpan", "Pengeluaran berhasil dicatat."); },
    onError: (error) => Alert.alert("Gagal", error.message),
  });

  const rows = (query.data ?? []) as Transaction[];
  const daily = rows.filter((row) => new Date(row.createdAt).toDateString() === new Date().toDateString());
  const expenses = (expensesQuery.data ?? []) as Expense[];
  const salesTotal = daily.filter((row) => row.status === "Selesai").reduce((sum, row) => sum + row.total, 0);
  const expenseTotal = expenses.filter((row) => row.status === "Aktif").reduce((sum, row) => sum + row.amount, 0);
  const balance = salesTotal - expenseTotal;
  const searchTerm = search.trim().toLocaleLowerCase("id-ID");
  const ledger = useMemo(() => [
    ...daily.filter((row) => !searchTerm || row.invoiceNumber.toLocaleLowerCase("id-ID").includes(searchTerm)).map((row) => ({ kind: "sale" as const, row, time: new Date(row.createdAt).getTime() })),
    ...(canViewExpenses && !searchTerm ? expenses.map((row) => ({ kind: "expense" as const, row, time: new Date(row.createdAt).getTime() })) : []),
  ].sort((a, b) => b.time - a.time), [daily, expenses, canViewExpenses, searchTerm]);

  if (query.isLoading) return <AppScreen><LoadingState /></AppScreen>;
  if (query.error) return <AppScreen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></AppScreen>;

  return (
    <AppScreen>
      <PageHeading title="Riwayat Harian" />
      <View style={s.stats}>
        <Panel style={s.statCard}><Text style={s.statLabel}>Penjualan hari ini</Text><Text style={s.statValue}>{formatRupiah(salesTotal)}</Text></Panel>
        {canViewExpenses ? <Panel style={[s.statCard, s.expenseCard]}><Text style={s.statLabel}>Pengeluaran hari ini</Text><Text style={[s.statValue, s.expenseValue]}>{formatRupiah(expenseTotal)}</Text></Panel> : null}
        {canViewExpenses ? <Panel style={[s.statCard, s.balanceCard]}><Text style={s.statLabel}>Sisa hari ini</Text><Text style={[s.statValue, balance < 0 && s.expenseValue]}>{formatRupiah(balance)}</Text></Panel> : null}
      </View>

      <View style={s.listHeading}>
        <Text style={s.listTitle}>Transaksi hari ini</Text>
        {canCreateExpenses ? <Pressable accessibilityRole="button" onPress={() => setExpenseOpen(true)} style={s.expenseButton}><Ionicons name="add" size={20} color="#fff" /><Text style={s.expenseButtonText}>Pengeluaran</Text></Pressable> : null}
      </View>
      <Text style={s.activityCount}>{ledger.length} aktivitas</Text>

      {expensesQuery.isLoading && canViewExpenses ? <LoadingState /> : expensesQuery.error && canViewExpenses ? <ErrorState message={expensesQuery.error.message} retry={() => void expensesQuery.refetch()} /> : ledger.length === 0 ? <EmptyState title={searchTerm ? "Invoice tidak ditemukan" : "Belum ada aktivitas hari ini"} description={searchTerm ? "Coba nomor invoice yang lain." : "Penjualan dan pengeluaran hari ini akan muncul di sini."} /> : (
        <View style={s.ledger}>
          {ledger.map((entry) => entry.kind === "sale" ? (
            <Pressable key={`sale-${entry.row.id}`} onPress={() => setSelected(entry.row)} style={[s.ledgerRow, s.saleRow, entry.row.status === "Dibatalkan" && s.cancelledRow]}>
              <View style={s.kindWrap}><Tag tone={entry.row.status === "Dibatalkan" ? "neutral" : "green"}>{entry.row.status === "Dibatalkan" ? "Dibatalkan" : "Penjualan"}</Tag></View>
              <View style={s.ledgerMain}><Text numberOfLines={1} style={s.ledgerTitle}>{entry.row.invoiceNumber}</Text><Text numberOfLines={1} style={s.ledgerSub}>{entry.row.customerName || entry.row.orderType} · {formatDate(entry.row.createdAt)}</Text></View>
              <View style={s.ledgerAmount}><Text style={s.saleAmount}>{entry.row.status === "Dibatalkan" ? "Dibatalkan" : `+${formatRupiah(entry.row.total)}`}</Text><Text style={s.ledgerSub}>{entry.row.items.reduce((sum, item) => sum + item.quantity, 0)} item</Text></View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
            </Pressable>
          ) : (
            <Pressable key={`expense-${entry.row.id}`} onPress={() => setSelectedExpense(entry.row)} style={[s.ledgerRow, s.expenseRow, entry.row.status === "Dibatalkan" && s.cancelledRow]}>
              <View style={s.kindWrap}><Tag tone={entry.row.status === "Dibatalkan" ? "neutral" : "amber"}>{entry.row.status === "Dibatalkan" ? "Dibatalkan" : "Pengeluaran"}</Tag></View>
              <View style={s.ledgerMain}><Text numberOfLines={1} style={s.ledgerTitle}>{entry.row.category}</Text><Text numberOfLines={1} style={s.ledgerSub}>{entry.row.description || entry.row.paymentMethod} · {formatDate(entry.row.createdAt)}</Text></View>
              <View style={s.ledgerAmount}><Text style={s.expenseValue}>{entry.row.status === "Dibatalkan" ? "Dibatalkan" : `−${formatRupiah(entry.row.amount)}`}</Text><Text style={s.ledgerSub}>{entry.row.paymentMethod}</Text></View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}><View style={s.sheet}>
          <View style={s.sheetHead}><View><Text style={s.sheetTitle}>Detail transaksi</Text><Text style={s.ledgerSub}>{selected?.invoiceNumber} · {selected ? formatDate(selected.createdAt) : ""}</Text></View><Pressable onPress={() => setSelected(null)}><Ionicons name="close" size={25} color={theme.colors.muted} /></Pressable></View>
          <View style={s.detailMeta}><Text style={s.detailText}>{selected?.customerName || "Pelanggan toko"}</Text><Text style={s.detailText}>{selected?.orderType} · {selected?.paymentMethod}</Text></View>
          {selected?.items.map((item, index) => <View key={index} style={s.detailLine}><View style={{ flex: 1 }}><Text style={s.detailText}>{item.quantity}× {item.productName}</Text><Text style={s.ledgerSub}>{formatRupiah(item.unitPrice)} / item</Text></View><Text style={s.detailText}>{formatRupiah(item.subtotal)}</Text></View>)}
          <View style={s.detailTotal}><Text style={s.detailText}>Total dibayar</Text><Text style={s.detailTotalValue}>{formatRupiah(selected?.total ?? 0)}</Text></View>
          {selected?.status === "Selesai" && session.data?.principal.role === "owner" ? <ActionButton title="Batalkan transaksi" danger loading={cancelTransaction.isPending} onPress={() => Alert.alert("Batalkan transaksi?", "Stok akan dikembalikan ke outlet.", [{ text: "Kembali", style: "cancel" }, { text: "Batalkan", style: "destructive", onPress: () => cancelTransaction.mutate({ id: selected.id }) }])} /> : null}
          <ActionButton title="Tutup" secondary onPress={() => setSelected(null)} />
        </View></View>
      </Modal>

      <Modal visible={!!selectedExpense} transparent animationType="slide" onRequestClose={() => setSelectedExpense(null)}>
        <View style={s.overlay}><View style={s.sheet}>
          <View style={s.sheetHead}><Text style={s.sheetTitle}>Detail pengeluaran</Text><Pressable onPress={() => setSelectedExpense(null)}><Ionicons name="close" size={25} color={theme.colors.muted} /></Pressable></View>
          <View style={s.detailLine}><Text style={s.detailText}>Kategori</Text><Text style={s.detailText}>{selectedExpense?.category}</Text></View>
          <View style={s.detailLine}><Text style={s.detailText}>Keterangan</Text><Text style={s.detailText}>{selectedExpense?.description || "—"}</Text></View>
          <View style={s.detailLine}><Text style={s.detailText}>Pembayaran</Text><Text style={s.detailText}>{selectedExpense?.paymentMethod}</Text></View>
          <View style={s.detailTotal}><Text style={s.detailText}>Nominal</Text><Text style={s.detailTotalValue}>{formatRupiah(selectedExpense?.amount ?? 0)}</Text></View>
          {selectedExpense?.status === "Aktif" && session.data?.principal.role === "owner" ? <ActionButton title="Batalkan pengeluaran" danger loading={cancelExpense.isPending} onPress={() => Alert.alert("Batalkan pengeluaran?", "Nominal tidak lagi dihitung sebagai pengeluaran.", [{ text: "Kembali", style: "cancel" }, { text: "Batalkan", style: "destructive", onPress: () => cancelExpense.mutate({ id: selectedExpense.id }) }])} /> : null}
          <ActionButton title="Tutup" secondary onPress={() => setSelectedExpense(null)} />
        </View></View>
      </Modal>

      <Modal visible={expenseOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setExpenseOpen(false)}>
        <AppScreen><PageHeading title="Catat pengeluaran" subtitle="Pengeluaran dicatat pada outlet aktif." />
          <Text style={s.formLabel}>Kategori</Text><View style={s.chips}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[s.chip, category === value && s.chipActive]}><Text style={[s.chipText, category === value && s.chipTextActive]}>{value}</Text></Pressable>)}</View>
          <Field label="Nominal (Rp)" value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="150000" />
          <Field label="Keterangan (opsional)" value={description} onChangeText={setDescription} placeholder="Contoh: pembelian gas" />
          <Text style={s.formLabel}>Metode pembayaran</Text><View style={s.chips}>{(["Tunai", "QRIS", "Kartu"] as PaymentMethod[]).map((value) => <Pressable key={value} onPress={() => setPayment(value)} style={[s.chip, payment === value && s.chipActive]}><Text style={[s.chipText, payment === value && s.chipTextActive]}>{value}</Text></Pressable>)}</View>
          <ActionButton title={createExpense.isPending ? "Menyimpan..." : "Simpan pengeluaran"} loading={createExpense.isPending} disabled={!Number(amount)} onPress={() => createExpense.mutate({ category, description: description.trim() || undefined, amount: Number(amount), paymentMethod: payment, expenseDate: today() })} />
          <ActionButton title="Batal" secondary onPress={() => setExpenseOpen(false)} />
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  statCard: { flex: 1, minWidth: "45%" as const, padding: 14, gap: 6 },
  statLabel: { color: theme.colors.muted, fontSize: 11 },
  statValue: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 19 },
  expenseCard: { backgroundColor: "#fff8f8", borderColor: "#f0dddd" },
  expenseValue: { color: "#a84d58", fontSize: 12, fontWeight: "800" },
  balanceCard: { flexBasis: "100%" as const, backgroundColor: "#edf8f1", borderColor: "#d7eadc" },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 3 },
  listTitle: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 19 },
  expenseButton: { minHeight: 43, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: 9, backgroundColor: theme.colors.signal },
  expenseButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  activityCount: { color: theme.colors.muted, fontSize: 11, textAlign: "right", marginTop: -10 },
  ledger: { overflow: "hidden", borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, backgroundColor: theme.colors.surface },
  ledgerRow: { minHeight: 80, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  saleRow: { backgroundColor: "#f2faf5" },
  expenseRow: { backgroundColor: "#fff8f8" },
  cancelledRow: { backgroundColor: "#f5f5f6" },
  kindWrap: { width: 82 },
  ledgerMain: { flex: 1, minWidth: 0, gap: 4 },
  ledgerTitle: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" },
  ledgerSub: { color: theme.colors.muted, fontSize: 10 },
  ledgerAmount: { alignItems: "flex-end", gap: 4, maxWidth: 110 },
  saleAmount: { color: "#26734a", fontSize: 12, fontWeight: "800" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0007" },
  sheet: { maxHeight: "88%", padding: 20, gap: 14, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: theme.colors.surface },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 20 },
  detailMeta: { padding: 12, borderRadius: 9, backgroundColor: theme.colors.ground, gap: 5 },
  detailLine: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  detailText: { color: theme.colors.ink, fontSize: 12, fontWeight: "600", flexShrink: 1 },
  detailTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.line },
  detailTotalValue: { color: theme.colors.signal, fontFamily: "Archivo-ExtraBold", fontSize: 22 },
  formLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, backgroundColor: "#edf2ee" },
  chipActive: { backgroundColor: theme.colors.signal },
  chipText: { color: theme.colors.muted, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
});

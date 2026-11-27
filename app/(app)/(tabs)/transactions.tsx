// [MODIFIED] Daily ledger follows HeyPost frontend's sales, expense and balance summary layout.
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag, formatDate, formatRupiah, showToast } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

type Transaction = { id: number; invoiceNumber: string; customerName: string | null; createdAt: Date; orderType: string; paymentMethod: string; status: "Selesai" | "Dibatalkan"; subtotal: number; discount: number; total: number; cashReceived: number | null; items: { productId: number; productName: string; quantity: number; unitPrice: number; subtotal: number }[] };
type Expense = { id: number; category: string; description: string | null; amount: number; paymentMethod: string; expenseDate: string; status: "Aktif" | "Dibatalkan"; createdAt: Date };
type PaymentMethod = "Tunai" | "QRIS" | "Kartu" | "Transfer";
const categories = ["Bahan baku", "Operasional", "Transportasi", "Gaji", "Listrik & air", "Perawatan", "Lainnya"];
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

export default function TransactionsScreen() {
  const utils = trpc.useUtils();
  const session = trpc.auth.me.useQuery();
  const query = trpc.pos.transactions.useQuery();
  // [ADDED] Pengaturan struk dan profil outlet dipakai untuk mencetak ulang invoice.
  const receiptSettingsQuery = trpc.store.getReceiptSettings.useQuery();
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
  // [ADDED] Tab untuk berpindah antara aktivitas dan menu terlaris hari ini.
  const [historyTab, setHistoryTab] = useState<"transactions" | "products">("transactions");

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
  // [ADDED] Cetak ulang struk mengikuti preferensi yang disimpan pemilik toko.
  const printReceipt = async (sale: Transaction) => {
    const settings = receiptSettingsQuery.data;
    const store = session.data?.store;
    const outlet = session.data?.outlets.find((item) => item.id === session.data?.activeOutletId);
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
    const show = (key: "showLogo" | "showStoreName" | "showOutletName" | "showAddress" | "showWhatsapp" | "showCashier" | "showCustomer" | "showHeyPostWatermark") => settings?.[key] !== false;
    const rows = sale.items.map((item) => `<tr><td>${item.quantity} × ${escapeHtml(item.productName)}<br><small>${formatRupiah(item.unitPrice)} / item</small></td><td class="right">${formatRupiah(item.subtotal)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:4mm}*{box-sizing:border-box}body{font-family:monospace;color:#111;width:72mm;margin:0 auto;font-size:12px}.center{text-align:center}.muted{color:#555;font-size:10px}.line{border-top:1px dashed #777;margin:12px 0}.meta{display:flex;justify-content:space-between;gap:8px;margin:6px 0}.meta span:first-child{color:#555}.meta span:last-child{text-align:right}table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:6px 0;vertical-align:top}td.right{text-align:right;white-space:nowrap}.total{font-size:16px;font-weight:bold}.logo{max-width:48mm;max-height:22mm;object-fit:contain;margin:0 auto 8px;display:block}small{font-size:10px;color:#555}</style></head><body>
      ${show("showLogo") && store?.logoUrl ? `<img class="logo" src="${escapeHtml(store.logoUrl)}">` : ""}
      ${show("showStoreName") ? `<h3 class="center">${escapeHtml(store?.name ?? "")}</h3>` : ""}
      ${show("showOutletName") ? `<div class="center">${escapeHtml(outlet?.name ?? "")}</div>` : ""}
      <div class="line"></div><div class="meta"><span>No. Transaksi</span><b>${escapeHtml(sale.invoiceNumber)}</b></div><div class="meta"><span>Tanggal</span><b>${escapeHtml(formatDate(sale.createdAt))}</b></div>
      ${show("showCashier") ? `<div class="meta"><span>Kasir</span><b>${escapeHtml(session.data?.principal.name ?? "")}</b></div>` : ""}
      ${show("showCustomer") ? `<div class="meta"><span>Pelanggan</span><b>${escapeHtml(sale.customerName ?? "Pelanggan toko")}</b></div>` : ""}
      <div class="meta"><span>Tipe pesanan</span><b>${escapeHtml(sale.orderType)}</b></div><div class="meta"><span>Pembayaran</span><b>${escapeHtml(sale.paymentMethod)}</b></div>
      <div class="line"></div><b>DETAIL PESANAN</b><table>${rows}</table><div class="line"></div>
      <div class="meta"><span>Subtotal</span><b>${formatRupiah(sale.subtotal)}</b></div>${sale.discount > 0 ? `<div class="meta"><span>Diskon</span><b>−${formatRupiah(sale.discount)}</b></div>` : ""}
      <div class="line"></div><div class="meta total"><span>TOTAL</span><b>${formatRupiah(sale.total)}</b></div>
      ${sale.status === "Dibatalkan" ? `<div class="center"><h2>DIBATALKAN</h2></div>` : ""}
      <div class="line"></div>${show("showAddress") && outlet?.address ? `<div class="center muted">${escapeHtml(outlet.address)}</div>` : ""}${show("showWhatsapp") && outlet?.whatsappNumber ? `<div class="center muted">${escapeHtml(outlet.whatsappNumber)}</div>` : ""}${settings?.footerMessage ? `<p class="center">${escapeHtml(settings.footerMessage)}</p>` : ""}${show("showHeyPostWatermark") ? `<div class="center muted">Powered by HeyPost</div>` : ""}
      </body></html>`;
    try {
      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert("Gagal mencetak", error instanceof Error ? error.message : "Struk tidak dapat dicetak.");
    }
  };

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: async () => { await utils.expenses.invalidate(); setExpenseOpen(false); setAmount(""); setDescription(""); setCategory(categories[0]); setPayment("Tunai"); showToast("Pengeluaran tersimpan", "Pengeluaran berhasil dicatat."); },
    onError: (error) => Alert.alert("Gagal", error.message),
  });

  const rows = (query.data ?? []) as Transaction[];
  const daily = rows.filter((row) => new Date(row.createdAt).toDateString() === new Date().toDateString());
  const expenses = (expensesQuery.data ?? []) as Expense[];
  const completedSales = daily.filter((row) => row.status === "Selesai");
  const salesByMethod = completedSales.reduce((totals, row) => {
    const method = row.paymentMethod === "Transfer" ? "Transfer" : row.paymentMethod;
    totals[method] = (totals[method] ?? 0) + row.total;
    return totals;
  }, {} as Record<string, number>);
  const cashTotal = salesByMethod["Tunai"] ?? 0;
  const qrisTotal = salesByMethod["QRIS"] ?? 0;
  const transferTotal = salesByMethod["Transfer"] ?? 0;
  const otherPaymentTotal = salesByMethod["Kartu"] ?? 0;
  const salesTotal = cashTotal + qrisTotal + transferTotal + otherPaymentTotal;
  // [ADDED] Peringkat menu dihitung dari kuantitas item pada transaksi yang selesai hari ini.
  const bestSellingMenus = useMemo(() => {
    const totals = new Map<number, { productId: number; productName: string; quantity: number; revenue: number }>();
    completedSales.forEach((sale) => sale.items.forEach((item) => {
      const current = totals.get(item.productId) ?? { productId: item.productId, productName: item.productName, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.subtotal;
      totals.set(item.productId, current);
    }));
    return [...totals.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  }, [completedSales]);
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
    <AppScreen scroll={false} style={s.screenContent}>
      <PageHeading title="Riwayat Harian" />
      {/* [MODIFIED] Ringkasan pembayaran, pengeluaran, dan saldo digabung dalam satu kartu. */}
      <View style={s.statsGroup}>
        <View style={s.paymentStatsRow}>
          <View style={s.paymentStat}>
            <View style={s.methodLabel}><Ionicons name="cash-outline" size={14} color="#26734a" /><Text style={s.statLabel}>Tunai</Text></View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.statValue}>{formatRupiah(cashTotal)}</Text>
          </View>
          <View style={s.statDividerVertical} />
          <View style={s.paymentStat}>
            <View style={s.methodLabel}><Ionicons name="qr-code-outline" size={14} color="#315F91" /><Text style={s.statLabel}>QRIS</Text></View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.statValue}>{formatRupiah(qrisTotal)}</Text>
          </View>
          <View style={s.statDividerVertical} />
          <View style={s.paymentStat}>
            <View style={s.methodLabel}><Ionicons name="business-outline" size={14} color="#8A641F" /><Text style={s.statLabel}>Transfer</Text></View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.statValue}>{formatRupiah(transferTotal)}</Text>
          </View>
        </View>
        {otherPaymentTotal > 0 ? <View style={s.otherPaymentLine}><Text style={s.statLabel}>Kartu / lainnya</Text><Text style={s.statValue}>{formatRupiah(otherPaymentTotal)}</Text></View> : null}
        {canViewExpenses ? <View style={s.statsGroupFooter}>
          <View style={s.footerStat}><Text style={s.statLabel}>Pengeluaran hari ini</Text><Text style={[s.footerStatValue, s.expenseValue]}>{formatRupiah(expenseTotal)}</Text></View>
          <View style={s.statDividerVertical} />
          <View style={s.footerStat}><Text style={s.statLabel}>Sisa hari ini</Text><Text style={[s.footerStatValue, balance < 0 && s.expenseValue]}>{formatRupiah(balance)}</Text></View>
        </View> : null}
      </View>

      {/* [ADDED] Tabs analisis diletakkan tepat setelah kartu Sisa hari ini. */}
      <View style={s.historyTabs}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: historyTab === "transactions" }} onPress={() => setHistoryTab("transactions")} style={[s.historyTab, historyTab === "transactions" && s.historyTabActive]}>
          <Ionicons name="receipt-outline" size={16} color={historyTab === "transactions" ? theme.colors.signal : theme.colors.muted} />
          <Text style={[s.historyTabText, historyTab === "transactions" && s.historyTabTextActive]}>Transaksi</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: historyTab === "products" }} onPress={() => setHistoryTab("products")} style={[s.historyTab, historyTab === "products" && s.historyTabActive]}>
          <Ionicons name="trophy-outline" size={16} color={historyTab === "products" ? theme.colors.signal : theme.colors.muted} />
          <Text style={[s.historyTabText, historyTab === "products" && s.historyTabTextActive]}>Menu terlaris</Text>
        </Pressable>
      </View>

      <View style={s.listHeading}>
        <Text style={s.listTitle}>{historyTab === "transactions" ? "Transaksi hari ini" : "Menu paling laku"}</Text>
        {historyTab === "transactions" && canCreateExpenses ? <Pressable accessibilityRole="button" onPress={() => setExpenseOpen(true)} style={s.expenseButton}><Ionicons name="add" size={20} color="#fff" /><Text style={s.expenseButtonText}>Pengeluaran</Text></Pressable> : null}
      </View>
      <Text style={s.activityCount}>{historyTab === "transactions" ? `${ledger.length} aktivitas` : `${bestSellingMenus.length} menu terjual`}</Text>

      <View style={s.ledgerViewport}>
      {historyTab === "products" ? (
        <ScrollView style={s.ledgerScroll} contentContainerStyle={s.ledgerScrollContent} showsVerticalScrollIndicator nestedScrollEnabled>
          {bestSellingMenus.length === 0 ? <EmptyState title="Belum ada menu terjual" description="Menu akan muncul setelah transaksi selesai tercatat hari ini." /> : <View style={s.ledger}>
            {bestSellingMenus.map((item, index) => (
              <View key={item.productId} style={s.bestSellerRow}>
                <View style={[s.rankBadge, index === 0 && s.rankBadgeFirst]}><Text style={[s.rankText, index === 0 && s.rankTextFirst]}>{index + 1}</Text></View>
                <View style={s.ledgerMain}><Text numberOfLines={2} style={s.ledgerTitle}>{item.productName}</Text><Text style={s.ledgerSub}>{item.quantity} terjual hari ini</Text></View>
                <View style={s.ledgerAmount}><Text style={s.saleAmount}>{formatRupiah(item.revenue)}</Text><Text style={s.ledgerSub}>Total penjualan</Text></View>
              </View>
            ))}
          </View>}
        </ScrollView>
      ) : expensesQuery.isLoading && canViewExpenses ? <LoadingState /> : expensesQuery.error && canViewExpenses ? <ErrorState message={expensesQuery.error.message} retry={() => void expensesQuery.refetch()} /> : ledger.length === 0 ? <EmptyState title={searchTerm ? "Invoice tidak ditemukan" : "Belum ada aktivitas hari ini"} description={searchTerm ? "Coba nomor invoice yang lain." : "Penjualan dan pengeluaran hari ini akan muncul di sini."} /> : (
        <ScrollView style={s.ledgerScroll} contentContainerStyle={s.ledgerScrollContent} showsVerticalScrollIndicator={true} nestedScrollEnabled keyboardShouldPersistTaps="handled">
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
        </ScrollView>
      )}
      </View>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}><View style={s.sheet}>
          <View style={s.sheetHead}><View><Text style={s.sheetTitle}>Detail transaksi</Text><Text style={s.ledgerSub}>{selected?.invoiceNumber} · {selected ? formatDate(selected.createdAt) : ""}</Text></View><Pressable onPress={() => setSelected(null)}><Ionicons name="close" size={25} color={theme.colors.muted} /></Pressable></View>
          <View style={s.detailMeta}><Text style={s.detailText}>{selected?.customerName || "Pelanggan toko"}</Text><Text style={s.detailText}>{selected?.orderType} · {selected?.paymentMethod}</Text></View>
          {selected?.items.map((item, index) => <View key={index} style={s.detailLine}><View style={{ flex: 1 }}><Text style={s.detailText}>{item.quantity}× {item.productName}</Text><Text style={s.ledgerSub}>{formatRupiah(item.unitPrice)} / item</Text></View><Text style={s.detailText}>{formatRupiah(item.subtotal)}</Text></View>)}
          <View style={s.detailTotal}><Text style={s.detailText}>Total dibayar</Text><Text style={s.detailTotalValue}>{formatRupiah(selected?.total ?? 0)}</Text></View>
          {/* [ADDED] Cetak ulang struk tersedia untuk transaksi selesai maupun dibatalkan. */}
          <ActionButton title="Cetak struk" secondary onPress={() => selected && void printReceipt(selected)} />
          {/* [MODIFIED] Pembatalan tetap dibatasi ke owner sesuai otorisasi backend ownerQuery. */}
          {selected?.status === "Selesai" && session.data?.principal.role === "owner" ? <ActionButton title="Batalkan transaksi" danger loading={cancelTransaction.isPending} onPress={() => Alert.alert("Batalkan transaksi?", "Transaksi akan ditandai dibatalkan dan stok dikembalikan ke outlet. Tindakan ini tidak dapat diurungkan.", [{ text: "Kembali", style: "cancel" }, { text: "Batalkan", style: "destructive", onPress: () => cancelTransaction.mutate({ id: selected.id }) }])} /> : null}
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
  // [ADDED] Kurangi rongga di bawah header khusus halaman Riwayat Harian.
  screenContent: { paddingTop: 4, gap: 11 },
  // [MODIFIED] Satu kartu ringkasan agar informasi keuangan lebih rapat dan mudah dipindai.
  statsGroup: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: 15, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 11, gap: 11 },
  paymentStatsRow: { flexDirection: "row", alignItems: "stretch" },
  paymentStat: { flex: 1, minWidth: 0, gap: 7, paddingHorizontal: 5 },
  methodLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  statLabel: { color: theme.colors.muted, fontSize: 11 },
  statValue: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 16 },
  statDividerVertical: { width: 1, backgroundColor: theme.colors.line, marginHorizontal: 5 },
  statsGroupFooter: { flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.colors.line, paddingTop: 10, gap: 8 },
  footerStat: { flex: 1, gap: 4, paddingHorizontal: 5 },
  footerStatValue: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 15 },
  otherPaymentLine: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 5, paddingTop: 7, borderTopWidth: 1, borderTopColor: theme.colors.line },
  expenseValue: { color: "#a84d58", fontSize: 12, fontWeight: "800" },
  // [ADDED] Tab ringkas dengan indikator aktif hijau HeyPost.
  historyTabs: { flexDirection: "row", padding: 4, borderRadius: 12, backgroundColor: "#edf1ee", gap: 4, marginTop: 2 },
  historyTab: { flex: 1, minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 9, paddingHorizontal: 8 },
  historyTabActive: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#dce9e0" },
  historyTabText: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  historyTabTextActive: { color: theme.colors.signal },
  bestSellerRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.line, backgroundColor: "#FFFFFF" },
  rankBadge: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#f0f2f1" },
  rankBadgeFirst: { backgroundColor: "#e5f4eb" },
  rankText: { color: theme.colors.muted, fontSize: 12, fontWeight: "800" },
  rankTextFirst: { color: theme.colors.signal },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 3 },
  listTitle: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 19 },
  expenseButton: { minHeight: 43, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: 9, backgroundColor: theme.colors.signal },
  expenseButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  activityCount: { color: theme.colors.muted, fontSize: 11, textAlign: "right", marginTop: -10 },
  // [ADDED] Area daftar mengambil ruang tersisa; hanya daftar ini yang dapat digulir.
  ledgerViewport: { flex: 1, minHeight: 0, width: "100%" },
  ledgerScroll: { flex: 1, minHeight: 0 },
  ledgerScrollContent: { paddingBottom: 132 }, // [MODIFIED] Ruang ekstra agar baris terakhir dapat digulir melewati floating bottom navigation.
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

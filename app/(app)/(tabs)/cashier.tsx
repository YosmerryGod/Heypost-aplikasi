// [MODIFIED] POS mengikuti referensi HeyPost: katalog vertikal, keranjang di header, dan bottom sheet checkout.
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag, formatRupiah, showToast } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
import * as SecureStore from "expo-secure-store";
import { EscPosPrinter } from "rn-escpos-printer";

type Product = { id: number; categoryId: number; name: string; sku: string; price: number; stock: number; imageUrl: string | null; active: boolean };
type Cart = Record<number, number>;
type OrderType = "Makan di tempat" | "Bawa pulang" | "Pesan antar";
type PaymentMethod = "Tunai" | "QRIS" | "Transfer";

export default function CashierScreen() {
  const utils = trpc.useUtils();
  const query = trpc.pos.bootstrap.useQuery();
  const [cart, setCart] = useState<Cart>({});
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [customer, setCustomer] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("Makan di tempat");
  const [method, setMethod] = useState<PaymentMethod>("Tunai");
  const [cash, setCash] = useState("");
  const [discount, setDiscount] = useState("");
  // [ADDED] Alasan diskon bersifat opsional.
  const [discountReason, setDiscountReason] = useState("");

  useEffect(() => {
    const cartSubscription = DeviceEventEmitter.addListener("heypost:open-cart", () => setOpen(true));
    const searchSubscription = DeviceEventEmitter.addListener("heypost:search-query", (value: string) => setSearch(value));
    return () => { cartSubscription.remove(); searchSubscription.remove(); };
  }, []);


  const mutation = trpc.pos.createTransaction.useMutation({
    onSuccess: async (sale) => {
      await Promise.all([utils.pos.bootstrap.invalidate(), utils.pos.transactions.invalidate(), utils.pos.summary.invalidate()]);
      setCart({});
      setOpen(false);
      setPaymentStep(false);
      setCash("");
      setDiscount("");
      setDiscountReason("");
      showToast("Transaksi berhasil", `${sale.invoiceNumber} · ${formatRupiah(sale.total)}`);
      // [ADDED] Cetak struk setelah pembayaran bila opsi cetak otomatis aktif.
      try {
        const printerSettings = await SecureStore.getItemAsync("heypost.printer.preferences");
        const printerPreferences = printerSettings ? JSON.parse(printerSettings) as { autoPrint?: boolean; printerAddress?: string | null } : null;
        if (printerPreferences?.autoPrint && printerPreferences.printerAddress) {
          await EscPosPrinter.initialize();
          if (!(await EscPosPrinter.isConnected())) {
            const pairedPrinters = await EscPosPrinter.getPrinters();
            const selectedPrinter = pairedPrinters.find((printer) => printer.address === printerPreferences.printerAddress);
            if (!selectedPrinter) throw new Error("Printer tidak ditemukan. Periksa koneksi Bluetooth.");
            await EscPosPrinter.connect(selectedPrinter, { timeoutMs: 12000 });
          }
          const receiptText = "HEYPOST\n" + sale.invoiceNumber + "\n--------------------------------\nTOTAL PEMBAYARAN\n" + formatRupiah(sale.total) + "\n--------------------------------\nTerima kasih\n";
          await EscPosPrinter.printText(receiptText, { codePage: "cp850", feedLines: 3, cut: true });
        }
      } catch (error) {
        Alert.alert("Transaksi berhasil", "Pembayaran tersimpan, tetapi struk tidak dapat dicetak. Silakan cetak dari Riwayat.");
      }
    },
    onError: (error) => Alert.alert("Transaksi gagal", error.message),
  });

  const products = (query.data?.products ?? []) as Product[];
  const categories = query.data?.categories ?? [];
  // [MODIFIED] Pencarian header memfilter item Kasir berdasarkan nama, SKU, dan kategori secara langsung.
  const visible = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("id-ID");
    return products.filter((product) => {
      if (!product.active || product.stock <= 0) return false;
      if (!keyword) return true;
      const categoryName = categories.find((category) => category.id === product.categoryId)?.name ?? "";
      return [product.name, product.sku, categoryName].some((value) => value.toLocaleLowerCase("id-ID").includes(keyword));
    });
  }, [products, categories, search]);
  const sections = useMemo(() => categories
    .map((category) => ({
      title: category.name,
      data: visible.filter((product) => product.categoryId === category.id),
    }))
    .filter((section) => section.data.length > 0), [categories, visible]);

  const lines = products.filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] }));
  const count = lines.reduce((sum, p) => sum + p.quantity, 0);

  useEffect(() => {
    DeviceEventEmitter.emit("heypost:cart-count", count);
  }, [count]);

  // [ADDED] Header menyembunyikan tombol keranjang selama tahap pembayaran.
  useEffect(() => {
    DeviceEventEmitter.emit("heypost:payment-step", paymentStep);
    return () => DeviceEventEmitter.emit("heypost:payment-step", false);
  }, [paymentStep]);
  const subtotal = lines.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const discountValue = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = Math.max(0, subtotal - discountValue);

  const add = (product: Product) => setCart((old) => {
    if ((old[product.id] ?? 0) >= Math.min(product.stock, 999)) {
      Alert.alert("Stok tidak cukup", `Stok tersisa ${product.stock}`);
      return old;
    }
    return { ...old, [product.id]: (old[product.id] ?? 0) + 1 };
  });

  const changeQuantity = (product: Product, delta: number) => setCart((old) => {
    const next = { ...old };
    const quantity = (next[product.id] ?? 0) + delta;
    if (quantity <= 0) delete next[product.id];
    else if (quantity <= product.stock) next[product.id] = quantity;
    else Alert.alert("Stok tidak cukup", `Stok tersisa ${product.stock}`);
    return next;
  });

  const pay = () => {
    if (!lines.length || lines.some((p) => p.quantity > p.stock)) {
      Alert.alert("Periksa keranjang", "Jumlah item tidak boleh melebihi stok tersedia.");
      return;
    }
    if (method === "Tunai" && Number(cash) < total) {
      Alert.alert("Uang belum cukup", "Masukkan nominal uang diterima yang benar.");
      return;
    }
    mutation.mutate({
      customerName: customer.trim() || undefined,
      orderType,
      paymentMethod: method,
      discount: discountValue,
      cashReceived: method === "Tunai" ? Number(cash) : undefined,
      items: lines.map((p) => ({ productId: p.id, quantity: p.quantity })),
    });
  };

  if (query.isLoading) return <AppScreen><LoadingState /></AppScreen>;
  if (query.error) return <AppScreen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></AppScreen>;

  return (
    <AppScreen safeAreaTop={false} style={{ paddingTop: 0 }}>
      {/* [MODIFIED] Start the catalog immediately below the shared header without extra top spacing. */}
      <FlatList
        data={sections}
        scrollEnabled={false}
        keyExtractor={(section) => section.title}
        contentContainerStyle={s.catalog}
        renderItem={({ item: section }) => (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.data.map((product) => {
              const quantity = cart[product.id] ?? 0;
              return (
                <View key={product.id} style={s.productRow}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={s.productImage} resizeMode="cover" />
                  ) : (
                    <View style={s.initial}><Text style={s.initialText}>{product.name.slice(0, 1).toUpperCase()}</Text></View>
                  )}
                  <View style={s.productInfo}>
                    <Text style={s.productName}>{product.name}</Text>
                    <Text style={s.productPrice}>{formatRupiah(product.price)}</Text>
                    <Text style={s.stock}>Stok {product.stock}</Text>
                  </View>
                  <View style={s.quantityControls}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Kurangi ${product.name}`} disabled={!quantity} onPress={() => changeQuantity(product, -1)} style={[s.quantityButton, !quantity && s.quantityDisabled]}>
                      <Text style={[s.quantityButtonText, !quantity && s.quantityDisabledText]}>−</Text>
                    </Pressable>
                    <Text style={s.quantityValue}>{quantity}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Tambah ${product.name}`} onPress={() => add(product)} style={s.quantityButton}>
                      <Text style={s.quantityButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        ListEmptyComponent={<EmptyState title="Menu tidak ditemukan" description="Coba kata pencarian lain." />}
      />

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { setOpen(false); setPaymentStep(false); }}>
        <View style={[s.modalOverlay, paymentStep && s.paymentOverlay]}>
          <View style={[s.sheet, paymentStep && s.paymentSheet]}>
            {paymentStep ? (
              // [ADDED] Layar pembayaran terpisah sesuai referensi; detail keranjang tidak ditampilkan di tahap ini.
              <>
                <View style={s.paymentHeader}>
                  <View style={s.paymentHeadingCopy}>
                    <Text style={s.paymentTitle}>Selesaikan pembayaran</Text>
                    <Text style={s.paymentSubtitle}>{count} item · {orderType}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke detail pesanan" onPress={() => setPaymentStep(false)} style={s.paymentClose}>
                    <Ionicons name="close" size={24} color={theme.colors.muted} />
                  </Pressable>
                </View>
                <ScrollView style={s.paymentBody} contentContainerStyle={s.paymentBodyContent} keyboardShouldPersistTaps="handled">
                  <View style={s.amountCard}>
                    <Text style={s.amountLabel}>Total yang harus dibayar</Text>
                    <Text style={s.amountValue}>{formatRupiah(total)}</Text>
                  </View>
                  <View style={s.paymentMethods}>
                    {([
                      { value: "Tunai" as PaymentMethod, label: "Tunai", detail: "Uang cash", icon: "cash-outline" as const },
                      { value: "QRIS" as PaymentMethod, label: "QRIS", detail: "Scan kode QR", icon: "qr-code-outline" as const },
                      { value: "Transfer" as PaymentMethod, label: "Transfer", detail: "Transfer bank", icon: "swap-horizontal-outline" as const },
                    ]).map((option) => (
                      <Pressable key={option.value} accessibilityRole="button" onPress={() => { setMethod(option.value); setCash(""); }} style={[s.paymentMethodCard, method === option.value && s.paymentMethodSelected]}>
                        <Ionicons name={option.icon} size={27} color={method === option.value ? "#087653" : theme.colors.muted} />
                        <View style={s.paymentMethodCopy}>
                          <Text style={[s.paymentMethodTitle, method === option.value && s.paymentMethodTitleSelected]}>{option.label}</Text>
                          <Text style={s.paymentMethodDetail}>{option.detail}</Text>
                        </View>
                        {method === option.value ? <Ionicons name="checkmark" size={20} color="#087653" /> : null}
                      </Pressable>
                    ))}
                  </View>
                  {method === "Tunai" ? (
                    <View style={s.cashCard}>
                      <Text style={s.cashLabel}>Uang diterima</Text>
                      <View style={s.cashInputWrap}>
                        <Text style={s.discountCurrency}>Rp</Text>
                        <TextInput accessibilityLabel="Uang diterima" value={cash} onChangeText={(value) => setCash(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.muted} style={s.cashInput} />
                      </View>
                      <View style={s.quickCashGrid}>
                        {[total, 20000, 50000, 100000].filter((value, index, values) => value > 0 && values.indexOf(value) === index).slice(0, 4).map((value) => (
                          <Pressable key={value} onPress={() => setCash(String(value))} style={s.quickCashButton}>
                            <Text style={s.quickCashText}>{value === total ? "Uang pas  " : ""}{formatRupiah(value)}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={s.shortageRow}>
                        <Text style={s.paymentSubtitle}>{Number(cash) >= total ? "Kembalian" : "Kekurangan"}</Text>
                        <Text style={s.shortageValue}>{formatRupiah(Math.abs(Number(cash || 0) - total))}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={s.paymentInfoCard}>
                      <Ionicons name={method === "QRIS" ? "qr-code-outline" : "business-outline"} size={25} color="#087653" />
                      <Text style={s.paymentInfoText}>{method === "QRIS" ? "Pastikan pembayaran QRIS telah diterima sebelum menyelesaikan transaksi." : "Pastikan transfer bank telah diterima sebelum menyelesaikan transaksi."}</Text>
                    </View>
                  )}
                  <View style={s.paymentSubtotal}>
                    <Text style={s.paymentSubtitle}>Subtotal</Text>
                    <Text style={s.paymentSubtotalValue}>{formatRupiah(subtotal)}</Text>
                  </View>
                </ScrollView>
                <View style={s.paymentFooter}>
                  <ActionButton title={mutation.isPending ? "Memproses..." : `Bayar ${formatRupiah(total)}`} loading={mutation.isPending} disabled={!count || (method === "Tunai" && Number(cash) < total)} onPress={pay} />
                  <Text style={s.footerNote}>Periksa kembali total sebelum menyelesaikan transaksi.</Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.sheetHeader}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={s.eyebrow}>PESANAN SAAT INI</Text>
                    <View style={s.sheetTitleRow}>
                      <Text style={s.sheetTitle}>Detail pesanan</Text>
                      <Tag>{count}</Tag>
                    </View>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Kosongkan keranjang" onPress={() => Alert.alert("Kosongkan keranjang?", "Semua item akan dihapus.", [{ text: "Batal", style: "cancel" }, { text: "Kosongkan", style: "destructive", onPress: () => { setCart({}); setPaymentStep(false); } }])} style={s.sheetIconButton}>
                    <Ionicons name="trash-outline" size={22} color={theme.colors.muted} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Tutup keranjang" onPress={() => { setOpen(false); setPaymentStep(false); }} style={s.sheetIconButton}>
                    <Text style={s.sheetIcon}>×</Text>
                  </Pressable>
                </View>
                <ScrollView style={s.sheetBody} contentContainerStyle={s.sheetBodyContent} keyboardShouldPersistTaps="handled">
                  <View style={s.orderTypeGroup}>
                    {(["Makan di tempat", "Bawa pulang", "Pesan antar"] as OrderType[]).map((value) => (
                      <Pressable key={value} onPress={() => setOrderType(value)} style={[s.orderTypeButton, orderType === value && s.orderTypeActive]}>
                        <Text style={[s.orderTypeText, orderType === value && s.orderTypeTextActive]}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field label="Nama pelanggan (opsional)" value={customer} onChangeText={setCustomer} placeholder="Nama pelanggan" />
                  {lines.length === 0 ? <EmptyState title="Keranjang masih kosong" description="Tambahkan menu terlebih dahulu." /> : lines.map((product) => (
                    <View key={product.id} style={s.cartLine}>
                      <View style={s.cartInitial}><Text style={s.initialText}>{product.name.slice(0, 1).toUpperCase()}</Text></View>
                      <View style={s.cartInfo}>
                        <View style={s.cartLineTop}>
                          <Text style={s.cartProductName}>{product.name}</Text>
                          <Text style={s.cartProductTotal}>{formatRupiah(product.price * product.quantity)}</Text>
                        </View>
                        <Text style={s.stock}>{formatRupiah(product.price)} / item</Text>
                        <View style={s.cartQuantity}>
                          <Pressable onPress={() => changeQuantity(product, -1)} style={s.quantityButton}><Text style={s.quantityButtonText}>−</Text></Pressable>
                          <Text style={s.quantityValue}>{product.quantity}</Text>
                          <Pressable onPress={() => add(product)} style={s.quantityButton}><Text style={s.quantityButtonText}>+</Text></Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={s.sheetFooter}>
                  <View style={s.summaryRow}><Text style={s.summaryLabel}>Subtotal <Text style={s.stock}>{count} item</Text></Text><Text style={s.summaryValue}>{formatRupiah(subtotal)}</Text></View>
                  <View style={s.discountSection}>
                    <Text style={s.discountLabel}>Diskon</Text>
                    <View style={s.discountAmountInput}>
                      <Text style={s.discountCurrency}>Rp</Text>
                      <TextInput accessibilityLabel="Nominal diskon dalam rupiah" value={discount} onChangeText={(value) => setDiscount(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.muted} style={s.discountAmountText} />
                    </View>
                    <Field label="Alasan diskon (opsional)" value={discountReason} onChangeText={setDiscountReason} placeholder="Contoh: kompensasi pesanan" />
                  </View>
                  <View style={s.totalRow}><Text style={s.totalLabel}>Total pembayaran</Text><Text style={s.totalValue}>{formatRupiah(total)}</Text></View>
                  <ActionButton title="Pilih pembayaran  ›" disabled={!count} onPress={() => { setPaymentStep(true); setMethod("Tunai"); setCash(""); }} />
                  <Text style={s.footerNote}>Stok diperbarui setelah pembayaran berhasil</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  catalog: { gap: 0, paddingBottom: 22 },
  section: { gap: 0 },
  // [MODIFIED] Skala judul dan aset katalog diselaraskan dengan layar lain.
  sectionTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.4, marginTop: 12, marginBottom: 14 },
  productRow: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  productImage: { width: 60, height: 60, borderRadius: 13, backgroundColor: theme.colors.signalSoft },
  initial: { width: 60, height: 60, borderRadius: 13, backgroundColor: "#e2f5eb", alignItems: "center", justifyContent: "center" },
  initialText: { fontSize: 22, fontWeight: "800", color: theme.colors.signal },
  productInfo: { flex: 1, minWidth: 0, gap: 4 },
  productName: { color: theme.colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  productPrice: { color: theme.colors.signal, fontSize: 15, fontWeight: "800" },
  stock: { color: theme.colors.muted, fontSize: 12 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  quantityButton: { width: 42, height: 44, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  quantityButtonText: { color: theme.colors.ink, fontSize: 24, fontWeight: "400" },
  quantityDisabled: { backgroundColor: "#f4f8f5", borderColor: "#edf2ee" },
  quantityDisabledText: { color: "#aab5ae" },
  quantityValue: { minWidth: 19, textAlign: "center", color: theme.colors.ink, fontSize: 16, fontWeight: "800" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  sheet: { maxHeight: "94%", minHeight: "72%", backgroundColor: theme.colors.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, overflow: "hidden" },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  eyebrow: { color: theme.colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { color: theme.colors.ink, fontSize: 19, fontWeight: "500", letterSpacing: -0.5 },
  sheetIconButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.line, alignItems: "center", justifyContent: "center" },
  sheetIcon: { color: theme.colors.muted, fontSize: 27 },
  sheetBody: { flexGrow: 0, flexShrink: 1 },
  sheetBodyContent: { padding: 15, gap: 13 },
  orderTypeGroup: { flexDirection: "row", padding: 6, borderRadius: 14, backgroundColor: "#f1f6f2", gap: 4 },
  orderTypeButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 10 },
  orderTypeActive: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.line },
  orderTypeText: { color: theme.colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center" },
  orderTypeTextActive: { color: "#075d43" },
  cartLine: { flexDirection: "row", gap: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  cartInitial: { width: 48, height: 48, borderRadius: 10, backgroundColor: theme.colors.signalSoft, alignItems: "center", justifyContent: "center" },
  cartInfo: { flex: 1, gap: 7 },
  cartLineTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, width: "100%" },
  // [ADDED] Batasi lebar nama agar tidak mendorong nominal harga keluar layar.
  cartProductName: { flex: 1, minWidth: 0, flexShrink: 1, color: theme.colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  cartProductTotal: { flexShrink: 0, maxWidth: "42%", color: theme.colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "800", textAlign: "right" },
  cartQuantity: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetFooter: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 18, borderTopWidth: 1, borderTopColor: theme.colors.line, gap: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: theme.colors.muted, fontSize: 14 },
  summaryValue: { color: theme.colors.ink, fontSize: 15, fontWeight: "700" },
  // [ADDED] Komponen nominal diskon dengan satu prefix mata uang yang tidak berulang.
  discountSection: { gap: 8 },
  discountLabel: { color: theme.colors.muted, fontSize: 14, fontWeight: "600" },
  discountAmountInput: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 12, backgroundColor: theme.colors.surface },
  discountCurrency: { color: theme.colors.muted, fontSize: 14, fontWeight: "700" },
  discountAmountText: { flex: 1, color: theme.colors.ink, fontSize: 15, paddingVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.line },
  totalLabel: { color: theme.colors.ink, fontSize: 15, fontWeight: "800" },
  totalValue: { color: "#075d43", fontSize: 21, fontWeight: "900" },
  // [ADDED] Tata letak layar pembayaran mengikuti referensi visual.
  paymentOverlay: { justifyContent: "center", paddingVertical: 12 },
  paymentSheet: { minHeight: "82%", maxHeight: "90%", borderRadius: 24, marginHorizontal: 12, marginBottom: 0 },
  paymentHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18, gap: 12 },
  paymentHeadingCopy: { flex: 1, gap: 4 },
  // [MODIFIED] Ringkas tipografi dan tinggi komponen pembayaran.
  paymentTitle: { color: theme.colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "800", letterSpacing: -0.6 },
  paymentSubtitle: { color: theme.colors.muted, fontSize: 14 },
  paymentClose: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  paymentBody: { flex: 1 },
  paymentBodyContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  amountCard: { padding: 14, backgroundColor: "#E4F5EC", borderLeftWidth: 4, borderLeftColor: "#087653", gap: 8 },
  amountLabel: { color: "#075D43", fontSize: 14, fontWeight: "700" },
  amountValue: { color: "#075D43", fontSize: 26, fontWeight: "900" },
  paymentMethods: { flexDirection: "row", gap: 8 },
  paymentMethodCard: { flex: 1, minWidth: 0, minHeight: 78, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, padding: 8, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface },
  paymentMethodSelected: { borderWidth: 2, borderColor: "#087653", backgroundColor: "#E4F5EC" },
  paymentMethodCopy: { alignItems: "center", gap: 3 },
  paymentMethodTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: "800" },
  paymentMethodTitleSelected: { color: "#075D43" },
  paymentMethodDetail: { color: theme.colors.muted, fontSize: 11 },
  cashCard: { padding: 15, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: "#F2F8F4", gap: 12 },
  cashLabel: { color: theme.colors.ink, fontSize: 15, fontWeight: "800" },
  cashInputWrap: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "#087653", backgroundColor: "#FFFFFF" },
  cashInput: { flex: 1, color: theme.colors.ink, fontSize: 19, fontWeight: "700", paddingVertical: 8 },
  quickCashGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickCashButton: { width: "48%", minHeight: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: 8, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: "#FFFFFF" },
  quickCashText: { color: theme.colors.muted, fontSize: 13 },
  shortageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.line },
  shortageValue: { color: theme.colors.ink, fontSize: 17, fontWeight: "900" },
  paymentInfoCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, backgroundColor: "#F0F7F3" },
  paymentInfoText: { flex: 1, color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  paymentSubtotal: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderColor: theme.colors.line },
  paymentSubtotalValue: { color: theme.colors.ink, fontSize: 16, fontWeight: "800" },
  paymentFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, gap: 12 },
  footerNote: { color: theme.colors.muted, fontSize: 12, textAlign: "center" },
});

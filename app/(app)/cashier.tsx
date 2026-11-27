// [MODIFIED] POS mengikuti referensi HeyPost: katalog vertikal, keranjang di header, dan bottom sheet checkout.
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag, formatRupiah } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

type Product = { id: number; categoryId: number; name: string; sku: string; price: number; stock: number; imageUrl: string | null; active: boolean };
type Cart = Record<number, number>;
type OrderType = "Makan di tempat" | "Bawa pulang" | "Pesan antar";
type PaymentMethod = "Tunai" | "Kartu";

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
  const [discount, setDiscount] = useState("0");

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
      setDiscount("0");
      Alert.alert("Transaksi berhasil", `${sale.invoiceNumber}\n${formatRupiah(sale.total)}`);
    },
    onError: (error) => Alert.alert("Transaksi gagal", error.message),
  });

  const products = (query.data?.products ?? []) as Product[];
  const visible = useMemo(
    () => products.filter((p) => p.active && p.stock > 0 && p.name.toLowerCase().includes(search.trim().toLowerCase())),
    [products, search],
  );
  const categories = query.data?.categories ?? [];
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
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.eyebrow}>PESANAN SAAT INI</Text>
                <View style={s.sheetTitleRow}>
                  <Text style={s.sheetTitle}>Detail pesanan</Text>
                  <Tag>{count}</Tag>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Kosongkan keranjang" onPress={() => Alert.alert("Kosongkan keranjang?", "Semua item akan dihapus.", [{ text: "Batal", style: "cancel" }, { text: "Kosongkan", style: "destructive", onPress: () => { setCart({}); setPaymentStep(false); } }])} style={s.sheetIconButton}>
                <Text style={s.sheetIcon}>⌫</Text>
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
                      <Text style={s.productName}>{product.name}</Text>
                      <Text style={s.productName}>{formatRupiah(product.price * product.quantity)}</Text>
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
              <View style={s.discountRow}>
                <Text style={s.summaryLabel}>Diskon</Text>
                <View style={s.discountInput}><Text style={s.stock}>Rp</Text><Text style={s.discountValue}>{formatRupiah(discountValue)}</Text></View>
              </View>
              <Field label="" value={discount} onChangeText={(value) => setDiscount(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="Masukkan diskon (Rp)" />
              <View style={s.totalRow}><Text style={s.totalLabel}>Total pembayaran</Text><Text style={s.totalValue}>{formatRupiah(total)}</Text></View>

              {paymentStep ? (
                <>
                  <Text style={s.summaryLabel}>Metode pembayaran</Text>
                  <View style={s.paymentMethods}>
                    {(["Tunai", "Kartu"] as PaymentMethod[]).map((value) => (
                      <Pressable key={value} onPress={() => setMethod(value)} style={[s.paymentMethod, method === value && s.orderTypeActive]}>
                        <Text style={[s.orderTypeText, method === value && s.orderTypeTextActive]}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {method === "Tunai" ? <Field label="Uang diterima (Rp)" value={cash} onChangeText={(value) => setCash(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={String(total)} /> : null}
                  <ActionButton title={mutation.isPending ? "Memproses..." : "Selesaikan transaksi"} loading={mutation.isPending} disabled={!count || (method === "Tunai" && Number(cash) < total)} onPress={pay} />
                </>
              ) : (
                <ActionButton title="Pilih pembayaran  ›" disabled={!count} onPress={() => setPaymentStep(true)} />
              )}
              <Text style={s.footerNote}>Stok diperbarui setelah pembayaran berhasil</Text>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  catalog: { gap: 0, paddingBottom: 22 },
  section: { gap: 0 },
  sectionTitle: { color: theme.colors.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.4, marginTop: 12, marginBottom: 14 },
  productRow: { minHeight: 112, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  productImage: { width: 78, height: 78, borderRadius: 13, backgroundColor: theme.colors.signalSoft },
  initial: { width: 78, height: 78, borderRadius: 13, backgroundColor: "#e2f5eb", alignItems: "center", justifyContent: "center" },
  initialText: { fontSize: 27, fontWeight: "800", color: theme.colors.signal },
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
  sheetTitle: { color: theme.colors.ink, fontSize: 22, fontWeight: "500", letterSpacing: -0.5 },
  sheetIconButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.line, alignItems: "center", justifyContent: "center" },
  sheetIcon: { color: theme.colors.muted, fontSize: 27 },
  sheetBody: { flexGrow: 0, flexShrink: 1 },
  sheetBodyContent: { padding: 18, gap: 17 },
  orderTypeGroup: { flexDirection: "row", padding: 6, borderRadius: 14, backgroundColor: "#f1f6f2", gap: 4 },
  orderTypeButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 10 },
  orderTypeActive: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.colors.line },
  orderTypeText: { color: theme.colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center" },
  orderTypeTextActive: { color: "#075d43" },
  cartLine: { flexDirection: "row", gap: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  cartInitial: { width: 48, height: 48, borderRadius: 10, backgroundColor: theme.colors.signalSoft, alignItems: "center", justifyContent: "center" },
  cartInfo: { flex: 1, gap: 7 },
  cartLineTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cartQuantity: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetFooter: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 18, borderTopWidth: 1, borderTopColor: theme.colors.line, gap: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: theme.colors.muted, fontSize: 14 },
  summaryValue: { color: theme.colors.ink, fontSize: 15, fontWeight: "700" },
  discountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  discountInput: { minWidth: 120, flexDirection: "row", justifyContent: "space-between", padding: 10, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 10 },
  discountValue: { color: theme.colors.muted, fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.line },
  totalLabel: { color: theme.colors.ink, fontSize: 15, fontWeight: "800" },
  totalValue: { color: "#075d43", fontSize: 25, fontWeight: "900" },
  paymentMethods: { flexDirection: "row", gap: 8 },
  paymentMethod: { flex: 1, padding: 13, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: theme.colors.line },
  footerNote: { color: theme.colors.muted, fontSize: 12, textAlign: "center" },
});

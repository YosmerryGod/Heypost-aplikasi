// [MODIFIED] POS mengikuti referensi HeyPost: katalog vertikal, keranjang di header, dan bottom sheet checkout.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {Alert, DeviceEventEmitter, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, AppScreen, EmptyState, ErrorState, Input, LoadingState, formatRupiah, showToast } from "@/components/native-ui";
import { getTheme, type ThemeColors } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker"; // [ADDED]
import { EscPosPrinter } from "rn-escpos-printer";
import Svg from "react-native-svg";
import ReceiptPrintCanvas from "@/components/receipt-print-canvas";

type Product = { id: number; categoryId: number; name: string; sku: string; price: number; stock: number; imageUrl: string | null; active: boolean };
type Cart = Record<number, number>;
type OrderType = "Makan di tempat" | "Bawa pulang" | "Pesan antar";
type PaymentMethod = "Tunai" | "QRIS" | "Transfer";
type PrintSale = { invoiceNumber: string; createdAt: Date | string; customerName: string | null; orderType: string; paymentMethod: string; subtotal: number; discount: number; total: number; cashReceived: number | null; items: { productName: string; unitPrice: number; quantity: number; subtotal: number }[] };
const PRINTER_STORAGE_KEY = "heypost.printer.preferences";

export default function CashierScreen() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const s = useMemo(() => createStyles(colors), [colors]);
  const utils = trpc.useUtils();
  const query = trpc.pos.bootstrap.useQuery();
  const session = trpc.auth.me.useQuery();
  const receiptSettingsQuery = trpc.store.getReceiptSettings.useQuery();
  // [ADDED] Konfigurasi QRIS dan rekening ditampilkan pada langkah pembayaran.
  const paymentSettingsQuery = trpc.store.getPaymentSettings.useQuery();
  const receiptSvgRef = useRef<Svg>(null);
  const [pendingPrintSale, setPendingPrintSale] = useState<PrintSale | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [customer, setCustomer] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("Makan di tempat");
  const [method, setMethod] = useState<PaymentMethod>("Tunai");
  const [cash, setCash] = useState("");
  const [paymentProofDataUrl, setPaymentProofDataUrl] = useState<string | undefined>(); // [ADDED]
  const [paymentProofUri, setPaymentProofUri] = useState<string | null>(null); // [ADDED]
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
      setPaymentProofDataUrl(undefined); // [ADDED]
      setPaymentProofUri(null); // [ADDED]
      setDiscount("");
      setDiscountReason("");
      showToast("Transaksi berhasil", `${sale.invoiceNumber} · ${formatRupiah(sale.total)}`);
      // [MODIFIED] Cetak transaksi asli memakai layout struk raster, bukan teks ringkas.
      setPendingPrintSale(sale);

    },
    onError: (error) => showToast("Transaksi gagal", error.message, "error"),
  });

  useEffect(() => {
    if (!pendingPrintSale || receiptSettingsQuery.isLoading || session.isLoading) return;
    let cancelled = false;
    const printSale = async () => {
      try {
        const stored = await SecureStore.getItemAsync(PRINTER_STORAGE_KEY);
        const preferences = stored ? JSON.parse(stored) as { autoPrint?: boolean; printerAddress?: string | null; paperWidth?: "58" | "80" } : null;
        if (!preferences?.autoPrint) { setPendingPrintSale(null); return; }
        if (!preferences.printerAddress) throw new Error("Printer belum dipilih. Hubungkan printer dari Pengaturan Printer.");
        if (receiptSettingsQuery.isError) throw new Error("Pengaturan struk gagal dimuat.");
        await EscPosPrinter.initialize();
        if (!(await EscPosPrinter.isConnected())) {
          const paired = await EscPosPrinter.getPrinters();
          const selected = paired.find((device) => device.address === preferences.printerAddress);
          if (!selected) throw new Error("Printer tidak ditemukan. Periksa koneksi Bluetooth.");
          await EscPosPrinter.connect(selected, { timeoutMs: 12000 });
        }
        const svg = receiptSvgRef.current;
        if (!svg) throw new Error("Format struk belum siap dicetak.");
        await new Promise<void>((resolve, reject) => {
          svg.toDataURL(async (base64) => {
            try {
              if (cancelled) return resolve();
              await EscPosPrinter.printImageBase64(base64, { paperWidth: preferences.paperWidth === "80" ? 80 : 58, threshold: 170, feedLines: 2, cut: true });
              resolve();
            } catch (error) { reject(error); }
          });
        });
      } catch (error) {
        if (!cancelled) showToast("Transaksi berhasil", error instanceof Error ? "Struk gagal dicetak: " + error.message : "Pembayaran tersimpan, tetapi struk gagal dicetak.", "success");
      } finally { if (!cancelled) setPendingPrintSale(null); }
    };
    void printSale();
    return () => { cancelled = true; };
  }, [pendingPrintSale, receiptSettingsQuery.isLoading, receiptSettingsQuery.isError, session.isLoading]);

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
      showToast("Stok tidak cukup", `Stok tersisa ${product.stock}`, "error");
      return old;
    }
    return { ...old, [product.id]: (old[product.id] ?? 0) + 1 };
  });

  const changeQuantity = (product: Product, delta: number) => setCart((old) => {
    const next = { ...old };
    const quantity = (next[product.id] ?? 0) + delta;
    if (quantity <= 0) delete next[product.id];
    else if (quantity <= product.stock) next[product.id] = quantity;
    else showToast("Stok tidak cukup", `Stok tersisa ${product.stock}`, "error");
    return next;
  });

  const pay = () => {
    if (!lines.length || lines.some((p) => p.quantity > p.stock)) {
      showToast("Periksa keranjang", "Jumlah item tidak boleh melebihi stok tersedia.", "error");
      return;
    }
    if (method === "Tunai" && Number(cash) < total) {
      showToast("Uang belum cukup", "Masukkan nominal uang diterima yang benar.", "error");
      return;
    }
    mutation.mutate({
      customerName: customer.trim() || undefined,
      orderType,
      paymentMethod: method,
      discount: discountValue,
      cashReceived: method === "Tunai" ? Number(cash) : undefined,
      paymentProofDataUrl,
      items: lines.map((p) => ({ productId: p.id, quantity: p.quantity })),
    });
  };

  // [ADDED] Foto bukti bersifat opsional untuk QRIS dan transfer.
  const capturePaymentProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { showToast("Izin kamera diperlukan", "Izinkan akses kamera untuk mengambil bukti pembayaran.", "error"); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.7, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType === "image/png" ? "image/png" : asset.mimeType === "image/webp" ? "image/webp" : "image/jpeg";
    setPaymentProofDataUrl(`data:${mimeType};base64,${asset.base64}`);
    setPaymentProofUri(asset.uri);
  };

  const confirmPayment = () => {
    if (method === "Tunai" || paymentProofDataUrl) { pay(); return; }
    Alert.alert("Bukti pembayaran", "Lampirkan foto bukti atau lewati untuk menyimpan transaksi tanpa foto.", [
      { text: "Batal", style: "cancel" },
      { text: "Ambil foto", onPress: () => { void capturePaymentProof(); } },
      { text: "Lewati", onPress: () => { setPaymentProofDataUrl(undefined); setPaymentProofUri(null); pay(); } },
    ]);
  };

  if (query.isLoading) return <AppScreen><LoadingState variant="list" /></AppScreen>;
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
                    <Pressable accessibilityRole="button" accessibilityLabel={`Kurangi ${product.name}`} disabled={!quantity} onPress={() => changeQuantity(product, -1)} style={({ pressed }) => [s.quantityButton, !quantity && s.quantityDisabled, pressed && s.quantityPressed]}>
                      <Text style={[s.quantityButtonText, !quantity && s.quantityDisabledText]}>−</Text>
                    </Pressable>
                    <Text style={s.quantityValue}>{quantity}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Tambah ${product.name}`} onPress={() => add(product)} style={({ pressed }) => [s.quantityButton, pressed && s.quantityPressed]}>
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
                    <Text style={s.paymentTitle}>Pembayaran</Text>
                    <Text style={s.paymentSubtitle}>{count} item · {orderType}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke detail pesanan" onPress={() => setPaymentStep(false)} style={s.paymentClose}>
                    <Ionicons name="close" size={24} color={colors.muted} />
                  </Pressable>
                </View>
                <ScrollView style={s.paymentBody} contentContainerStyle={s.paymentBodyContent} keyboardShouldPersistTaps="handled">
                  <Card style={s.amountCard}>
                    <Text style={s.amountLabel}>Total yang harus dibayar</Text>
                    <Text style={s.amountValue}>{formatRupiah(total)}</Text>
                  </Card>
                  <View style={s.paymentMethods}>
                    {([
                      { value: "Tunai" as PaymentMethod, label: "Tunai", icon: "cash-outline" as const },
                      { value: "QRIS" as PaymentMethod, label: "QRIS", icon: "qr-code-outline" as const },
                      { value: "Transfer" as PaymentMethod, label: "Transfer", icon: "swap-horizontal-outline" as const },
                    ]).filter((option) => option.value === "Tunai" || (option.value === "QRIS" && paymentSettingsQuery.data?.qrisEnabled) || (option.value === "Transfer" && paymentSettingsQuery.data?.transferEnabled)).map((option) => (
                      <Pressable key={option.value} accessibilityRole="button" onPress={() => { setMethod(option.value); setCash(""); setPaymentProofDataUrl(undefined); setPaymentProofUri(null); }} style={[s.paymentMethodCard, method === option.value && s.paymentMethodSelected]}>
                        <Ionicons name={option.icon} size={27} color={method === option.value ? "#F5B900" : colors.muted} />
                        <Text style={[s.paymentMethodTitle, method === option.value && s.paymentMethodTitleSelected]}>{option.label}</Text>
                        {method === option.value ? <Ionicons name="checkmark" size={20} color="#F5B900" /> : null}
                      </Pressable>
                    ))}
                  </View>
                  {method === "Tunai" ? (
                    <View style={s.cashCard}>
                      <Text style={s.cashLabel}>Uang diterima</Text>
                      <View style={s.cashInputWrap}>
                        <Text style={s.discountCurrency}>Rp</Text>
                        <TextInput accessibilityLabel="Uang diterima" value={cash} onChangeText={(value) => setCash(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={s.cashInput} />
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
                    <View style={[s.paymentInfoCard, method === "QRIS" ? s.qrisInfoCard : s.transferInfoCard]}>
                      {method === "QRIS" ? <>
                        {paymentSettingsQuery.data?.qrisImageUrl ? <Image source={{ uri: paymentSettingsQuery.data.qrisImageUrl }} style={s.paymentQrImage} /> : <View style={s.paymentQrEmpty}><Ionicons name="qr-code-outline" size={38} color={colors.muted} /><Text style={s.paymentInfoText}>QRIS belum tersedia</Text></View>}
                        {paymentSettingsQuery.data?.qrisMerchantName ? <Text style={s.paymentMerchantName}>{paymentSettingsQuery.data.qrisMerchantName}</Text> : null}
                      </> : (paymentSettingsQuery.data?.bankAccounts ?? []).map((account) => <View key={account.id} style={s.transferAccountRow}>
                        <View style={s.transferBankIcon}><Ionicons name="business-outline" size={18} color="#F5B900" /></View>
                        <View style={s.transferAccountCopy}>
                          <Text style={s.transferBankName}>{account.bankName}</Text>
                          <Text style={s.transferAccountNumber}>{account.accountNumber}</Text>
                          <Text style={s.transferAccountName}>{account.accountName}</Text>
                        </View>
                      </View>)}
                    </View>
                  )}
                  {paymentProofUri ? <View style={s.proofPreviewCard}>
                    <Image source={{ uri: paymentProofUri }} style={s.proofPreviewImage} />
                    <View style={s.proofPreviewCopy}><Text style={s.proofPreviewTitle}>Bukti pembayaran terlampir</Text><Pressable onPress={() => { setPaymentProofDataUrl(undefined); setPaymentProofUri(null); void capturePaymentProof(); }}><Text style={s.proofRetake}>Foto ulang</Text></Pressable></View>
                  </View> : null}
                </ScrollView>
                <View style={s.paymentFooter}>
                  <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => { setPaymentStep(false); setPaymentProofDataUrl(undefined); setPaymentProofUri(null); }} style={s.paymentCancelButton}><Text style={s.paymentCancelText}>Batal</Text></Pressable>
                  <View style={s.paymentConfirmButton}><Button title={mutation.isPending ? "Memproses..." : method === "Tunai" ? `Bayar ${formatRupiah(total)}` : paymentProofDataUrl ? "Konfirmasi pembayaran" : "Sudah Bayar"} loading={mutation.isPending} disabled={!count || (method === "Tunai" && Number(cash) < total)} onPress={confirmPayment} /></View>
                </View>
              </>
            ) : (
              <>
                <View style={s.sheetHeader}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={s.eyebrow}>PESANAN SAAT INI</Text>
                    <View style={s.sheetTitleRow}>
                      <Text style={s.sheetTitle}>Detail pesanan</Text>
                      <Badge>{count}</Badge>
                    </View>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Kosongkan keranjang" onPress={() => Alert.alert("Kosongkan keranjang?", "Semua item akan dihapus.", [{ text: "Batal", style: "cancel" }, { text: "Kosongkan", style: "destructive", onPress: () => { setCart({}); setPaymentStep(false); } }])} style={s.sheetIconButton}>
                    <Ionicons name="trash-outline" size={22} color={colors.muted} />
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
                  <Input label="Nama pelanggan (opsional)" value={customer} onChangeText={setCustomer} placeholder="Nama pelanggan" />
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
                      <TextInput accessibilityLabel="Nominal diskon dalam rupiah" value={discount} onChangeText={(value) => setDiscount(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} style={s.discountAmountText} />
                    </View>
                    <Input label="Alasan diskon (opsional)" value={discountReason} onChangeText={setDiscountReason} placeholder="Contoh: kompensasi pesanan" />
                  </View>
                  <View style={s.totalRow}><Text style={s.totalLabel}>Total pembayaran</Text><Text style={s.totalValue}>{formatRupiah(total)}</Text></View>
                  <Button title="Pilih pembayaran  ›" disabled={!count} onPress={() => { setPaymentStep(true); setMethod("Tunai"); setCash(""); }} />
                  <Text style={s.footerNote}>Stok diperbarui setelah pembayaran berhasil</Text>
                </View>

              </>
            )}
          </View>
        </View>
      </Modal>
      {/* [ADDED] Kanvas struk transaksi aktual dirender menjadi bitmap sebelum dicetak. */}
      {pendingPrintSale ? (() => {
        const sale = pendingPrintSale;
        const store = session.data?.store;
        const outlet = session.data?.outlets.find((item) => item.id === session.data?.activeOutletId);
        return <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, opacity: 0 }}>
          <ReceiptPrintCanvas ref={receiptSvgRef} invoiceNumber={sale.invoiceNumber} createdAt={sale.createdAt} cashierName={session.data?.principal.name ?? "Kasir"} customerName={sale.customerName} orderType={sale.orderType} paymentMethod={sale.paymentMethod} subtotal={sale.subtotal} discount={sale.discount} total={sale.total} items={sale.items} storeName={store?.name} outletName={outlet?.name} logoUrl={store?.logoUrl} address={outlet?.address} whatsapp={outlet?.whatsappNumber} settings={receiptSettingsQuery.data} />
        </View>;
      })() : null}
    </AppScreen>
  );
}

// [MODIFIED] Gunakan token warna tema yang mengikuti mode terang/gelap pada seluruh komponen layar.
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  catalog: { gap: 0, paddingBottom: 22 },
  section: { gap: 0 },
  // [MODIFIED] Skala judul dan aset katalog diselaraskan dengan layar lain.
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.4, marginTop: 12, marginBottom: 14 },
  productRow: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  productImage: { width: 60, height: 60, borderRadius: 13, backgroundColor: colors.signalSoft },
  // [MODIFIED] Produk tanpa foto memakai bidang kuning dengan inisial putih.
  initial: { width: 60, height: 60, borderRadius: 13, backgroundColor: colors.signal, alignItems: "center", justifyContent: "center" },
  initialText: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  productInfo: { flex: 1, minWidth: 0, gap: 4 },
  // [MODIFIED] Teks katalog pada mode terang menggunakan hitam; harga tetap kuning.
  productName: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  productPrice: { color: colors.signal, fontSize: 15, fontWeight: "800" },
  stock: { color: colors.ink, fontSize: 12 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  quantityButton: { width: 42, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  // [ADDED] Feedback tekan singkat pada kontrol jumlah produk.
  quantityPressed: { opacity: 0.78, transform: [{ scale: 0.94 }] },
  quantityButtonText: { color: colors.ink, fontSize: 24, fontWeight: "400" },
  // [MODIFIED] Tombol minus nonaktif dibuat hitam pudar pada Dark; Light tetap memakai warna sebelumnya.
  quantityDisabled: {
    backgroundColor: colors.isDark ? "#202020" : "#f4f8f5",
    borderColor: colors.isDark ? "#292929" : "#edf2ee",
  },
  // [MODIFIED] Simbol minus nonaktif sedikit redup pada Dark, tanpa kehilangan keterbacaan.
  quantityDisabledText: { color: colors.isDark ? "#666666" : colors.ink },
  quantityValue: { minWidth: 19, textAlign: "center", color: colors.ink, fontSize: 16, fontWeight: "800" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  // [MODIFIED] Pertahankan tinggi minimum sheet agar header Detail Pesanan tidak lenyap saat keyboard tampil.
  sheet: { maxHeight: "94%", minHeight: "72%", backgroundColor: colors.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, overflow: "hidden" },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { color: colors.ink, fontSize: 19, fontWeight: "500", letterSpacing: -0.5 },
  sheetIconButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  sheetIcon: { color: colors.muted, fontSize: 27 },
  sheetBody: { flexGrow: 0, flexShrink: 1 },
  sheetBodyContent: { padding: 15, gap: 13 },
  // [MODIFIED] Warna pilihan jenis pesanan diseragamkan dengan token global Light/Dark.
  orderTypeGroup: { flexDirection: "row", padding: 6, borderRadius: 14, backgroundColor: colors.surfaceSubtle, gap: 4 },
  orderTypeButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderRadius: 10 },
  orderTypeActive: { backgroundColor: colors.signal, borderWidth: 1, borderColor: colors.signalStrong },
  orderTypeText: { color: colors.ink, fontSize: 12, fontWeight: "700", textAlign: "center" },
  orderTypeTextActive: { color: "#171717" },
  cartLine: { flexDirection: "row", gap: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  cartInitial: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.signalSoft, alignItems: "center", justifyContent: "center" },
  cartInfo: { flex: 1, gap: 7 },
  cartLineTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, width: "100%" },
  // [ADDED] Batasi lebar nama agar tidak mendorong nominal harga keluar layar.
  cartProductName: { flex: 1, minWidth: 0, flexShrink: 1, color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  cartProductTotal: { flexShrink: 0, maxWidth: "42%", color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "800", textAlign: "right" },
  cartQuantity: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetFooter: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 18, borderTopWidth: 1, borderTopColor: colors.line, gap: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: colors.muted, fontSize: 14 },
  summaryValue: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  // [ADDED] Komponen nominal diskon dengan satu prefix mata uang yang tidak berulang.
  discountSection: { gap: 8 },
  discountLabel: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  discountAmountInput: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  discountCurrency: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  discountAmountText: { flex: 1, color: colors.ink, fontSize: 15, paddingVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  totalLabel: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  totalValue: { color: "#075d43", fontSize: 21, fontWeight: "900" },
  // [ADDED] Tata letak layar pembayaran mengikuti referensi visual.
  paymentOverlay: { justifyContent: "center", paddingVertical: 12 },
  paymentSheet: { minHeight: "82%", maxHeight: "90%", borderRadius: 24, marginHorizontal: 12, marginBottom: 0 },
  paymentHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18, gap: 12 },
  paymentHeadingCopy: { flex: 1, gap: 4 },
  // [MODIFIED] Ringkas tipografi dan tinggi komponen pembayaran.
  paymentTitle: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "800", letterSpacing: -0.6 },
  paymentSubtitle: { color: colors.muted, fontSize: 14 },
  paymentClose: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  paymentBody: { flex: 1 },
  paymentBodyContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 13 },
  amountCard: { paddingHorizontal: 15, paddingVertical: 13, backgroundColor: colors.signalSoft, borderRadius: 13, gap: 4 },
  amountLabel: { color: "#9A7100", fontSize: 12, fontWeight: "700" },
  amountValue: { color: "#9A7100", fontSize: 25, fontWeight: "900" },
  paymentMethods: { flexDirection: "row", gap: 8 },
  paymentMethodCard: { flex: 1, minWidth: 0, minHeight: 68, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: 7, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  paymentMethodSelected: { borderWidth: 2, borderColor: "#F5B900", backgroundColor: colors.signalSoft },
  paymentMethodTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  paymentMethodTitleSelected: { color: "#9A7100" },
  cashCard: { padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.line, gap: 12 },
  cashLabel: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  cashInputWrap: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "#F5B900", backgroundColor: colors.surface },
  cashInput: { flex: 1, color: colors.ink, fontSize: 19, fontWeight: "700", paddingVertical: 8 },
  quickCashGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickCashButton: { width: "48%", minHeight: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: 8, borderRadius: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  quickCashText: { color: colors.muted, fontSize: 13 },
  shortageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  shortageValue: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  // [MODIFIED] Informasi metode pembayaran dibuat padat tanpa instruksi berulang.
  paymentInfoCard: { borderRadius: 14, backgroundColor: colors.line, padding: 12 },
  qrisInfoCard: { alignItems: "center", justifyContent: "center", gap: 8, minHeight: 190 },
  paymentQrImage: { width: 190, height: 190, resizeMode: "contain" },
  paymentQrEmpty: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 8 },
  paymentMerchantName: { color: colors.ink, fontSize: 13, fontWeight: "800", textAlign: "center" },
  paymentInfoText: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
  transferInfoCard: { gap: 0, paddingHorizontal: 14, paddingVertical: 4 },
  transferAccountRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#DCE8E0" },
  transferBankIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFF0B8", alignItems: "center", justifyContent: "center" },
  transferAccountCopy: { flex: 1, gap: 2 },
  transferBankName: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  transferAccountNumber: { color: "#9A7100", fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
  transferAccountName: { color: colors.muted, fontSize: 11 },
  paymentFooter: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  paymentCancelButton: { minWidth: 86, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  paymentCancelText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  paymentConfirmButton: { flex: 1 },
  proofPreviewCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  proofPreviewImage: { width: 62, height: 62, borderRadius: 8, backgroundColor: "#EAF1EC" },
  proofPreviewCopy: { flex: 1, gap: 7 },
  proofPreviewTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  proofRetake: { color: "#F5B900", fontSize: 12, fontWeight: "800" },
  footerNote: { color: colors.muted, fontSize: 12, textAlign: "center" },
});

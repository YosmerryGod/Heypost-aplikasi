// [ADDED] Native POS with server-backed cart checkout and stock validation.
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
  const [category, setCategory] = useState(0);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("Makan di tempat");
  const [method, setMethod] = useState<PaymentMethod>("Tunai");
  const [cash, setCash] = useState("");
  const [discount, setDiscount] = useState("0");
  const mutation = trpc.pos.createTransaction.useMutation({ onSuccess: async (sale) => { await Promise.all([utils.pos.bootstrap.invalidate(), utils.pos.transactions.invalidate(), utils.pos.summary.invalidate()]); setCart({}); setOpen(false); setCash(""); Alert.alert("Transaksi berhasil", `${sale.invoiceNumber}\n${formatRupiah(sale.total)}`); }, onError: (error) => Alert.alert("Transaksi gagal", error.message) });
  const products = (query.data?.products ?? []) as Product[];
  const visible = useMemo(() => products.filter((p) => p.active && p.stock > 0 && (!category || p.categoryId === category) && p.name.toLowerCase().includes(search.toLowerCase())), [products, category, search]);
  const lines = products.filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] }));
  const count = lines.reduce((s, p) => s + p.quantity, 0);
  const subtotal = lines.reduce((s, p) => s + p.price * p.quantity, 0);
  const total = Math.max(0, subtotal - Math.min(subtotal, Number(discount) || 0));
  const add = (p: Product) => setCart((old) => { if ((old[p.id] ?? 0) >= Math.min(p.stock, 999)) { Alert.alert("Stok tidak cukup", `Stok tersisa ${p.stock}`); return old; } return { ...old, [p.id]: (old[p.id] ?? 0) + 1 }; });
  const pay = () => {
    if (!lines.length || lines.some((p) => p.quantity > p.stock)) return Alert.alert("Periksa keranjang", "Jumlah item tidak boleh melebihi stok tersedia.");
    if (method === "Tunai" && Number(cash) < total) return Alert.alert("Uang belum cukup", "Masukkan nominal uang diterima yang benar.");
    mutation.mutate({ customerName: customer.trim() || undefined, orderType, paymentMethod: method, discount: Math.min(subtotal, Number(discount) || 0), cashReceived: method === "Tunai" ? Number(cash) : undefined, items: lines.map((p) => ({ productId: p.id, quantity: p.quantity })) });
  };
  if (query.isLoading) return <AppScreen><LoadingState /></AppScreen>;
  if (query.error) return <AppScreen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></AppScreen>;
  return <AppScreen>
    <PageHeading eyebrow={query.data?.outlet.name ?? "HEYPOST"} title="Kasir" subtitle="Pilih menu dan selesaikan pembayaran." right={<Tag>{count} item</Tag>} />
    <Field label="Cari menu" value={search} onChangeText={setSearch} placeholder="Nama menu atau produk" />
    <View style={s.chips}><Pressable onPress={() => setCategory(0)} style={[s.chip, !category && s.active]}><Text style={[s.chipText, !category && s.activeText]}>Semua</Text></Pressable>{query.data?.categories.map((c) => <Pressable key={c.id} onPress={() => setCategory(c.id)} style={[s.chip, category === c.id && s.active]}><Text style={[s.chipText, category === c.id && s.activeText]}>{c.name}</Text></Pressable>)}</View>
    {!visible.length ? <EmptyState title="Menu tidak ditemukan" description="Coba kata pencarian atau kategori lain." /> : <FlatList data={visible} numColumns={2} scrollEnabled={false} keyExtractor={(p) => String(p.id)} columnWrapperStyle={{ gap: 10 }} contentContainerStyle={{ gap: 10 }} renderItem={({ item }) => <Pressable onPress={() => add(item)} style={s.product}><View style={s.initial}><Text style={s.initialText}>{item.name.slice(0,1).toUpperCase()}</Text></View><Text numberOfLines={2} style={s.name}>{item.name}</Text><Text style={s.price}>{formatRupiah(item.price)}</Text><Text style={s.muted}>Stok {item.stock}</Text><Text style={s.add}>+ Tambah</Text></Pressable>} />}
    <Panel><View style={s.row}><Text style={s.heading}>Keranjang</Text><Tag>{count} item</Tag></View>{lines.slice(0,4).map((p) => <View key={p.id} style={s.row}><Text style={s.name}>{p.quantity}× {p.name}</Text><Text style={s.name}>{formatRupiah(p.price*p.quantity)}</Text></View>)}<View style={s.row}><Text style={s.muted}>Total</Text><Text style={s.total}>{formatRupiah(total)}</Text></View><ActionButton title={count ? "Lanjut ke pembayaran" : "Keranjang kosong"} disabled={!count} onPress={() => setOpen(true)} /></Panel>
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}><AppScreen><PageHeading title="Pembayaran" subtitle={`${count} item · ${formatRupiah(total)}`} right={<ActionButton title="Tutup" compact secondary onPress={() => setOpen(false)} />} />{lines.map((p) => <Panel key={p.id}><View style={s.row}><View style={{ flex: 1 }}><Text style={s.name}>{p.name}</Text><Text style={s.muted}>{formatRupiah(p.price)} · Stok {p.stock}</Text></View><View style={s.row}><ActionButton title="−" compact secondary onPress={() => setCart((old) => { const next={...old}; if(next[p.id]<=1) delete next[p.id]; else next[p.id]--; return next; })} /><Text style={s.name}>{p.quantity}</Text><ActionButton title="+" compact secondary onPress={() => add(p)} /></View></View></Panel>)}<Field label="Nama pelanggan (opsional)" value={customer} onChangeText={setCustomer} placeholder="Nama pelanggan" /><Text style={s.heading}>Jenis pesanan</Text><View style={s.chips}>{(["Makan di tempat","Bawa pulang","Pesan antar"] as OrderType[]).map((v) => <Pressable key={v} onPress={() => setOrderType(v)} style={[s.chip, orderType===v && s.active]}><Text style={[s.chipText, orderType===v && s.activeText]}>{v}</Text></Pressable>)}</View><Field label="Diskon (Rp)" value={discount} onChangeText={(v) => setDiscount(v.replace(/\D/g,""))} keyboardType="number-pad" /><Text style={s.heading}>Metode pembayaran</Text><View style={s.chips}>{(["Tunai","Kartu"] as PaymentMethod[]).map((v) => <Pressable key={v} onPress={() => setMethod(v)} style={[s.chip, method===v && s.active]}><Text style={[s.chipText, method===v && s.activeText]}>{v}</Text></Pressable>)}</View>{method==="Tunai" ? <Field label="Uang diterima (Rp)" value={cash} onChangeText={(v) => setCash(v.replace(/\D/g,""))} keyboardType="number-pad" placeholder={String(total)} /> : null}<View style={s.row}><Text style={s.muted}>Total pembayaran</Text><Text style={s.total}>{formatRupiah(total)}</Text></View><ActionButton title={mutation.isPending ? "Memproses..." : "Selesaikan transaksi"} loading={mutation.isPending} disabled={!lines.length || (method==="Tunai" && Number(cash)<total)} onPress={pay} /></AppScreen></Modal>
  </AppScreen>;
}
const s=StyleSheet.create({chips:{flexDirection:"row",flexWrap:"wrap",gap:7},chip:{paddingHorizontal:13,paddingVertical:9,borderRadius:30,backgroundColor:"#e9eeeb"},active:{backgroundColor:theme.colors.signal},chipText:{fontSize:12,color:theme.colors.muted,fontWeight:"600"},activeText:{color:"#fff"},product:{flex:1,minWidth:0,padding:12,gap:5,borderRadius:12,borderWidth:1,borderColor:theme.colors.line,backgroundColor:"#fff"},initial:{width:36,height:36,borderRadius:9,backgroundColor:theme.colors.signalSoft,alignItems:"center",justifyContent:"center"},initialText:{fontSize:16,fontWeight:"800",color:theme.colors.signal},name:{fontSize:13,fontWeight:"700",color:theme.colors.ink},price:{fontSize:13,fontWeight:"800",color:theme.colors.signal},muted:{fontSize:11,color:theme.colors.muted},add:{fontSize:12,fontWeight:"800",color:theme.colors.signal},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},heading:{fontSize:15,fontWeight:"800",color:theme.colors.ink},total:{fontSize:17,fontWeight:"800",color:theme.colors.ink}});
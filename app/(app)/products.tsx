// [MODIFIED] Product management adapted to HeyPost frontend's grouped list layout.
import { useEffect, useMemo, useState } from "react";
import { Alert, DeviceEventEmitter, Image, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { ActionButton, AppScreen, EmptyState, ErrorState, Field, LoadingState, PageHeading, Panel, Tag, formatRupiah } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";

type Product = { id: number; categoryId: number; name: string; sku: string; price: number; stock: number; imageUrl: string | null; active: boolean };
type ProductForm = { id?: number; name: string; categoryId: number; price: string; stock: string };
const blank: ProductForm = { name: "", categoryId: 0, price: "", stock: "0" };

export default function ProductsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.pos.listProducts.useQuery();
  const session = trpc.auth.me.useQuery();
  const owner = session.data?.principal.role === "owner";
  const canManageMenu = owner || session.data?.principal.permissions.includes("menu.edit") === true;
  const canManageStock = owner || session.data?.principal.permissions.includes("stock.edit") === true;
  const canCreateMenu = owner || session.data?.principal.permissions.includes("menu.create") === true;
  const [form, setForm] = useState<ProductForm>(blank);
  const [categoryName, setCategoryName] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const searchSubscription = DeviceEventEmitter.addListener("heypost:search-query", (value: string) => setSearch(value));
    // [ADDED] Header add action opens the existing product form.
    const addSubscription = DeviceEventEmitter.addListener("heypost:products-add", () => openCreate());
    return () => {
      searchSubscription.remove();
      addSubscription.remove();
    };
  }, [query.data?.categories]);

  const refresh = async () => {
    await Promise.all([utils.pos.listProducts.invalidate(), utils.pos.bootstrap.invalidate()]);
  };
  const createCategory = trpc.pos.createCategory.useMutation({
    onSuccess: async () => { await refresh(); setCategoryName(""); setCategoryOpen(false); },
    onError: (error) => Alert.alert("Gagal membuat kategori", error.message),
  });
  const create = trpc.pos.createProduct.useMutation({
    onSuccess: async () => { await refresh(); setFormOpen(false); setForm(blank); },
    onError: (error) => Alert.alert("Gagal menambahkan produk", error.message),
  });
  const update = trpc.pos.updateProduct.useMutation({
    onSuccess: async () => { await refresh(); setFormOpen(false); setForm(blank); },
    onError: (error) => Alert.alert("Gagal memperbarui produk", error.message),
  });
  const active = trpc.pos.setProductActive.useMutation({ onSuccess: refresh, onError: (error) => Alert.alert("Gagal mengubah status", error.message) });
  const archive = trpc.pos.archiveProduct.useMutation({ onSuccess: refresh, onError: (error) => Alert.alert("Gagal mengarsipkan produk", error.message) });

  const products = (query.data?.products ?? []) as Product[];
  const categories = query.data?.categories ?? [];
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const groups = useMemo(() => categories.map((category) => ({
    ...category,
    products: filtered.filter((product) => product.categoryId === category.id),
  })).filter((group) => group.products.length > 0), [categories, filtered]);
  const activeCount = products.filter((product) => product.active).length;
  const inactiveCount = products.length - activeCount;
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

  const openCreate = () => {
    setForm({ ...blank, categoryId: categories[0]?.id ?? 0 });
    setFormOpen(true);
  };
  const openEdit = (product: Product) => {
    setForm({ id: product.id, name: product.name, categoryId: product.categoryId, price: String(product.price), stock: String(product.stock) });
    setFormOpen(true);
  };
  const save = () => {
    const payload = { name: form.name.trim(), categoryId: Number(form.categoryId), price: Number(form.price), stock: Number(form.stock), imageUrl: null };
    if (!payload.name || !payload.categoryId || !Number.isSafeInteger(payload.price) || payload.price < 100 || !Number.isSafeInteger(payload.stock) || payload.stock < 0) {
      Alert.alert("Periksa data", "Nama, kategori, harga minimal Rp100, dan stok harus valid.");
      return;
    }
    if (form.id) update.mutate({ ...payload, id: form.id });
    else create.mutate(payload);
  };

  if (query.isLoading) return <AppScreen><LoadingState /></AppScreen>;
  if (query.error) return <AppScreen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></AppScreen>;

  return (
    <AppScreen>
      {/* [MODIFIED] Catalog heading and summary follow the compact grouped layout from the reference. */}
      <View style={s.catalogHeading}>
        <Text style={s.catalogTitle}>Menu</Text>
        <Text style={s.catalogSubtitle}>{products.length} produk · {categories.length} kategori</Text>
      </View>
      <View style={s.summary}>
        <View style={s.summaryItem}><Text style={s.summaryValue}>{activeCount}</Text><Text style={s.summaryLabel}>Aktif</Text></View>
        <View style={s.summaryItem}><Text style={s.summaryValue}>{inactiveCount}</Text><Text style={s.summaryLabel}>Nonaktif</Text></View>
        <View style={s.summaryItem}><Text style={s.summaryValue}>{totalStock}</Text><Text style={s.summaryLabel}>Total stok</Text></View>
      </View>
      {canCreateMenu ? <Pressable accessibilityRole="button" onPress={() => setCategoryOpen(true)} style={s.addCategory}><Text style={s.addCategoryText}>+ Tambah kategori</Text></Pressable> : null}
      {groups.length === 0 ? <EmptyState title={search ? "Menu tidak ditemukan" : "Belum ada menu"} description={search ? "Coba kata kunci pencarian lain." : "Tambahkan menu untuk mulai mengelola katalog."} action={canCreateMenu && !search ? <ActionButton title="Tambah menu" onPress={openCreate} /> : null} /> : groups.map((group) => (
        <View key={group.id} style={s.group}>
          <View style={s.groupHeading}><Text style={s.groupTitle}>{group.name}</Text><Text style={s.groupCount}>{group.products.length} menu</Text></View>
          <View style={s.list}>
            {group.products.map((product) => (
              <View key={product.id} style={[s.productRow, !product.active && s.inactiveRow]}>
                {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={s.thumbnail} /> : <View style={s.avatar}><Text style={s.avatarText}>{product.name.slice(0, 1).toUpperCase()}</Text></View>}
                <View style={s.productInfo}>
                  <Text numberOfLines={1} style={s.productName}>{product.name}</Text>
                  <Text style={s.sku}>{product.sku}</Text>
                  <View style={s.productMeta}><Text style={s.price}>{formatRupiah(product.price)}</Text><Text style={s.stock}>Stok {product.stock}</Text></View>
                </View>
                <View style={s.actions}>
                  {canManageMenu ? <Switch value={product.active} onValueChange={(value) => active.mutate({ id: product.id, active: value })} trackColor={{ true: theme.colors.signal }} /> : <Tag tone={product.active ? "green" : "neutral"}>{product.active ? "Aktif" : "Nonaktif"}</Tag>}
                  {canManageMenu || canManageStock ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${product.name}`} style={s.editButton} onPress={() => openEdit(product)}><Text style={s.editText}>✎</Text></Pressable> : null}
                  {canManageMenu ? <Pressable accessibilityRole="button" accessibilityLabel={`Arsipkan ${product.name}`} style={s.archiveButton} onPress={() => Alert.alert("Arsipkan produk?", product.name, [{ text: "Batal", style: "cancel" }, { text: "Arsipkan", style: "destructive", onPress: () => archive.mutate({ id: product.id }) }])}><Text style={s.archiveText}>⋯</Text></Pressable> : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Modal visible={formOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFormOpen(false)}>
        <AppScreen>
          <PageHeading title={form.id ? "Edit menu" : "Tambah menu"} subtitle="Atur informasi menu yang tampil di kasir." />
          <Field label="Nama menu" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="Nama menu" />
          <Text style={s.fieldLabel}>Kategori</Text>
          <View style={s.categoryChoices}>{categories.map((category) => <Pressable key={category.id} onPress={() => setForm({ ...form, categoryId: category.id })} style={[s.categoryChoice, form.categoryId === category.id && s.categoryChoiceActive]}><Text style={[s.categoryChoiceText, form.categoryId === category.id && s.categoryChoiceTextActive]}>{category.name}</Text></Pressable>)}</View>
          <Field label="Harga jual (Rp)" value={form.price} onChangeText={(value) => setForm({ ...form, price: value.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="25000" />
          <Field label="Stok" value={form.stock} onChangeText={(value) => setForm({ ...form, stock: value.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="0" />
          <ActionButton title={create.isPending || update.isPending ? "Menyimpan..." : "Simpan menu"} loading={create.isPending || update.isPending} onPress={save} />
          <ActionButton title="Batal" secondary onPress={() => setFormOpen(false)} />
        </AppScreen>
      </Modal>
      <Modal visible={categoryOpen} transparent animationType="fade" onRequestClose={() => setCategoryOpen(false)}>
        <View style={s.overlay}><View style={s.dialog}><PageHeading title="Tambah kategori" subtitle="Kategori dibuat untuk outlet aktif." /><Field label="Nama kategori" value={categoryName} onChangeText={setCategoryName} placeholder="Contoh: Minuman" /><ActionButton title="Simpan kategori" loading={createCategory.isPending} disabled={!categoryName.trim()} onPress={() => createCategory.mutate({ name: categoryName.trim(), sortOrder: categories.length })} /><ActionButton title="Batal" secondary onPress={() => setCategoryOpen(false)} /></View></View>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  // [MODIFIED] Product catalog layout follows the reference's spacious mobile list.
  catalogHeading: { gap: 5, marginTop: 2, marginBottom: 18 },
  catalogTitle: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 34, lineHeight: 42, fontWeight: "900", letterSpacing: -1.1 },
  catalogSubtitle: { color: theme.colors.muted, fontSize: 15 },
  summary: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 17, paddingHorizontal: 18, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 17, backgroundColor: theme.colors.surface },
  summaryItem: { flex: 1, gap: 4 },
  summaryValue: { color: theme.colors.ink, fontSize: 27, fontWeight: "800", fontFamily: "Archivo-Bold" },
  summaryLabel: { color: theme.colors.muted, fontSize: 13 },
  addCategory: { alignSelf: "flex-end", paddingHorizontal: 4, paddingVertical: 3 },
  addCategoryText: { color: theme.colors.signal, fontSize: 12, fontWeight: "800" },
  group: { gap: 13, marginTop: 3 },
  groupHeading: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 4 },
  groupTitle: { color: theme.colors.ink, fontSize: 21, fontWeight: "800", fontFamily: "Archivo-Bold" },
  groupCount: { color: theme.colors.muted, fontSize: 13 },
  list: { overflow: "hidden", borderWidth: 1, borderColor: theme.colors.line, borderRadius: 19, backgroundColor: theme.colors.surface },
  productRow: { minHeight: 112, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  inactiveRow: { backgroundColor: "#f5f8f6" },
  thumbnail: { width: 78, height: 78, borderRadius: 13, backgroundColor: theme.colors.signalSoft },
  avatar: { width: 78, height: 78, borderRadius: 13, backgroundColor: "#e2f5eb", alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.colors.signal, fontSize: 31, fontWeight: "800" },
  productInfo: { flex: 1, minWidth: 0, gap: 4 },
  productName: { color: theme.colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  sku: { color: "#8a9690", fontSize: 12 },
  productMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 11, marginTop: 3 },
  price: { color: theme.colors.ink, fontSize: 15, fontWeight: "900" },
  stock: { color: theme.colors.muted, fontSize: 13 },
  actions: { flexDirection: "row", alignItems: "center", gap: 5 },
  editButton: { width: 34, height: 42, alignItems: "center", justifyContent: "center" },
  editText: { color: "#59665f", fontSize: 26, fontWeight: "500" },
  archiveButton: { width: 22, height: 34, alignItems: "center", justifyContent: "center" },
  archiveText: { color: theme.colors.muted, fontSize: 21, fontWeight: "800" },
  fieldLabel: { color: theme.colors.ink, fontSize: 13, fontWeight: "700" },
  categoryChoices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  categoryChoice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: "#eef2ef" },
  categoryChoiceActive: { backgroundColor: theme.colors.signal },
  categoryChoiceText: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  categoryChoiceTextActive: { color: "#fff" },
  overlay: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#0007" },
  dialog: { padding: 20, gap: 14, borderRadius: 16, backgroundColor: theme.colors.ground },
});

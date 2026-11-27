// [ADDED] Halaman Produk baru — dibangun ulang dari awal untuk HeyPost.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, EmptyState, LoadingState, formatRupiah } from "@/components/native-ui";
import { theme } from "@/constants/theme";
import { trpc } from "@/providers/trpc";
import * as ImagePicker from "expo-image-picker";

type Product = {
  id: number;
  categoryId: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  active: boolean;
};

type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

type ProductForm = {
  id?: number;
  name: string;
  categoryId: number;
  price: string;
  stock: string;
};

const INITIAL_FORM: ProductForm = {
  name: "",
  categoryId: 0,
  price: "",
  stock: "0",
};

export default function ProductsScreen() {
  // [ADDED] Penanda mount halaman Produk untuk diagnosis navigasi dari Profil.
  useEffect(() => {
    console.log(`[NAV_DEBUG] ${new Date().toISOString()} PRODUCTS_SCREEN_MOUNT`);
    return () => console.log(`[NAV_DEBUG] ${new Date().toISOString()} PRODUCTS_SCREEN_UNMOUNT`);
  }, []);
  const utils = trpc.useUtils();
  const insets = useSafeAreaInsets();
  const productsQuery = trpc.pos.listProducts.useQuery();

  const [searchVisible, setSearchVisible] = useState(false);
  const [search, setSearch] = useState("");
  // [ADDED] Animasi pencarian mengikuti pola buka/tutup search di halaman Kasir.
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchWidth = Math.max(220, Dimensions.get("window").width - 28);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  // [ADDED] Preview foto lokal dan URL foto yang sudah tersimpan di server.
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  // [ADDED] Menu aksi tombol tambah dan form kategori.
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [categoryFormVisible, setCategoryFormVisible] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const products = (productsQuery.data?.products ?? []) as Product[];
  const categories = (productsQuery.data?.categories ?? []) as Category[];
  const searchTerm = search.trim().toLocaleLowerCase("id-ID");

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((product) =>
      product.name.toLocaleLowerCase("id-ID").includes(searchTerm)
      || product.sku.toLocaleLowerCase("id-ID").includes(searchTerm)
    );
  }, [products, searchTerm]);

  const activeCount = products.filter((product) => product.active).length;
  const inactiveCount = products.length - activeCount;
  const totalStock = products.reduce((total, product) => total + product.stock, 0);

  const categorySections = categories
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      category,
      items: filteredProducts.filter((product) => product.categoryId === category.id),
    }))
    .filter((section) => section.items.length > 0);

  const refreshProducts = async () => {
    await Promise.all([
      utils.pos.listProducts.invalidate(),
      utils.pos.bootstrap.invalidate(),
    ]);
  };

  const toggleProduct = trpc.pos.setProductActive.useMutation({
    onSuccess: refreshProducts,
    onError: (error) => Alert.alert("Gagal mengubah status", error.message),
  });

  // [ADDED] Pembuatan kategori menggunakan prosedur backend yang sudah tersedia.
  // [ADDED] Upload foto produk ke endpoint penyimpanan backend.
  const uploadProductImage = trpc.pos.uploadProductImage.useMutation({
    onSuccess: (result) => setProductImageUrl(result.imageUrl),
    onError: (error) => Alert.alert("Upload foto gagal", error.message),
  });

  const createCategory = trpc.pos.createCategory.useMutation({
    onSuccess: async () => {
      await refreshProducts();
      setCategoryFormVisible(false);
      setCategoryName("");
      Alert.alert("Berhasil", "Kategori berhasil ditambahkan.");
    },
    onError: (error) => Alert.alert("Gagal menambahkan kategori", error.message),
  });

  const createProduct = trpc.pos.createProduct.useMutation({
    onSuccess: async () => {
      await refreshProducts();
      setFormVisible(false);
      setForm(INITIAL_FORM);
      Alert.alert("Berhasil", "Produk berhasil ditambahkan.");
    },
    onError: (error) => Alert.alert("Gagal menambahkan produk", error.message),
  });

  const updateProduct = trpc.pos.updateProduct.useMutation({
    onSuccess: async () => {
      await refreshProducts();
      setFormVisible(false);
      setForm(INITIAL_FORM);
      Alert.alert("Berhasil", "Perubahan produk berhasil disimpan.");
    },
    onError: (error) => Alert.alert("Gagal memperbarui produk", error.message),
  });

  const openCreateForm = () => {
    setAddMenuVisible(false);
    setProductImageUri(null);
    setProductImageUrl(null);
    setForm({
      ...INITIAL_FORM,
      categoryId: categories[0]?.id ?? 0,
    });
    setFormVisible(true);
  };

  // [ADDED] Validasi dan simpan kategori baru untuk outlet aktif.
  const submitCategory = () => {
    const name = categoryName.trim();
    if (name.length < 2) {
      Alert.alert("Nama kategori belum valid", "Nama kategori minimal 2 karakter.");
      return;
    }
    createCategory.mutate({ name, sortOrder: categories.length });
  };

  const openEditForm = (product: Product) => {
    setProductImageUri(product.imageUrl);
    setProductImageUrl(product.imageUrl);
    setForm({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      price: String(product.price),
      stock: String(product.stock),
    });
    setFormVisible(true);
  };

  const closeForm = () => {
    if (createProduct.isPending || updateProduct.isPending || uploadProductImage.isPending) return;
    setFormVisible(false);
    setForm(INITIAL_FORM);
    setProductImageUri(null);
    setProductImageUrl(null);
  };

  // [ADDED] Pilih foto dari galeri, tampilkan preview, lalu unggah ke backend.
  const chooseProductImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin galeri diperlukan", "Izinkan HeyPost mengakses galeri untuk memilih foto menu.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      Alert.alert("Format tidak didukung", "Gunakan JPG, PNG, atau WebP.");
      return;
    }
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert("Ukuran foto terlalu besar", "Pilih foto dengan ukuran maksimal 5 MB.");
      return;
    }
    if (!asset.base64) {
      Alert.alert("Foto tidak dapat dibaca", "Silakan pilih foto lain dari galeri.");
      return;
    }
    setProductImageUri(asset.uri);
    setProductImageUrl(null);
    uploadProductImage.mutate({ dataUrl: `data:${mime};base64,${asset.base64}` });
  };

  const submitForm = () => {
    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (name.length < 2) {
      Alert.alert("Nama produk belum valid", "Nama produk minimal 2 karakter.");
      return;
    }

    if (!form.categoryId) {
      Alert.alert("Kategori belum dipilih", "Pilih kategori produk terlebih dahulu.");
      return;
    }

    if (!Number.isInteger(price) || price < 100) {
      Alert.alert("Harga belum valid", "Harga minimal Rp100.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      Alert.alert("Stok belum valid", "Stok harus berupa angka 0 atau lebih.");
      return;
    }

    const payload = {
      name,
      categoryId: form.categoryId,
      price,
      stock,
      imageUrl: productImageUrl,
    };

    if (form.id) {
      updateProduct.mutate({ id: form.id, ...payload });
    } else {
      createProduct.mutate(payload);
    }
  };

  if (productsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (productsQuery.error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={25} color={theme.colors.ink} />
          </Pressable>
          <Text style={styles.toolbarTitle}>Menu</Text>
        </View>
        <EmptyState
          title="Produk belum dapat dimuat"
          description={productsQuery.error.message}
          action={
            <ActionButton
              title="Coba lagi"
              secondary
              onPress={() => void productsQuery.refetch()}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const isSaving = createProduct.isPending || updateProduct.isPending || uploadProductImage.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* [ADDED] Toolbar halaman Menu sesuai referensi visual. */}
      <View style={styles.toolbar}>
        {searchVisible ? (
          <Animated.View style={[styles.searchBox, {
            width: searchAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, searchWidth] }),
            opacity: searchAnimation,
            transform: [{ scaleX: searchAnimation }],
          }]}>
            <Ionicons name="search-outline" size={20} color="#68766E" />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Cari produk..."
              placeholderTextColor="#87938C"
              style={styles.searchInput}
              returnKeyType="search"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup pencarian"
              onPress={() => {
                Animated.timing(searchAnimation, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
                  if (!finished) return;
                  setSearch("");
                  setSearchVisible(false);
                });
              }}
              style={styles.searchCloseButton}
            >
              <Ionicons name="close" size={21} color="#68766E" />
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={25} color="#53635B" />
            </Pressable>
            <Text style={styles.toolbarTitle}>Menu</Text>
            <View style={styles.toolbarSpacer} />
            <Pressable accessibilityRole="button" accessibilityLabel="Cari produk" onPress={() => {
              searchAnimation.setValue(0);
              setSearchVisible(true);
              Animated.timing(searchAnimation, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
            }} style={styles.toolbarIcon}>
              <Ionicons name="search-outline" size={27} color="#53635B" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Tambah" onPress={() => setAddMenuVisible(true)} style={styles.addButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Pressable>
          </>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* [REMOVED] Judul dan jumlah produk/kategori sudah ditampilkan di header. */}
        {/* [ADDED] Ringkasan status dan total stok dari data backend. */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Aktif</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{inactiveCount}</Text>
            <Text style={styles.summaryLabel}>Nonaktif</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryItemRight]}>
            <Text style={styles.summaryValue}>{totalStock.toLocaleString("id-ID")}</Text>
            <Text style={styles.summaryLabel}>Total stok</Text>
          </View>
        </View>

        {categorySections.length === 0 ? (
          <EmptyState
            title={searchTerm ? "Produk tidak ditemukan" : "Belum ada produk"}
            description={
              searchTerm
                ? "Coba kata kunci nama atau SKU yang lain."
                : "Tambahkan produk pertama untuk mulai mengelola menu."
            }
            action={
              searchTerm
                ? undefined
                : <ActionButton title="Tambah produk" onPress={openCreateForm} />
            }
          />
        ) : (
          categorySections.map(({ category, items }) => (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeading}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                <Text style={styles.categoryCount}>{items.length} menu</Text>
              </View>

              <View style={styles.productCard}>
                {items.map((product, index) => (
                  <View
                    key={product.id}
                    style={[
                      styles.productRow,
                      index < items.length - 1 && styles.productDivider,
                      !product.active && styles.inactiveRow,
                    ]}
                  >
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productInitial}>
                        <Text style={styles.productInitialText}>
                          {product.name.slice(0, 1).toLocaleUpperCase("id-ID")}
                        </Text>
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <Text numberOfLines={1} style={styles.productName}>
                        {product.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.sku}>
                        {product.sku}
                      </Text>
                      <View style={styles.productMeta}>
                        <Text style={styles.price}>{formatRupiah(product.price)}</Text>
                        <Text style={styles.stock}>
                          Stok {product.stock.toLocaleString("id-ID")}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.productActions}>
                      <Switch
                        value={product.active}
                        onValueChange={(active) =>
                          toggleProduct.mutate({ id: product.id, active })
                        }
                        disabled={toggleProduct.isPending}
                        trackColor={{ false: "#D8DEDA", true: "#16835E" }}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor="#D8DEDA"
                        style={styles.switch}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${product.name}`}
                        onPress={() => openEditForm(product)}
                        style={styles.editButton}
                      >
                        <Ionicons name="create-outline" size={21} color="#56645D" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* [ADDED] Menu pilihan aksi tambah, mengikuti referensi dropdown di bawah tombol plus. */}
      <Modal visible={addMenuVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setAddMenuVisible(false)}>
        <View style={styles.addMenuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddMenuVisible(false)} />
          <View style={[styles.addMenuCard, { top: insets.top + 76 }]}>
            <Pressable style={styles.addMenuItem} onPress={openCreateForm}>
              <Ionicons name="add" size={22} color="#17241D" />
              <Text style={styles.addMenuText}>Tambah Menu</Text>
            </Pressable>
            <Pressable style={styles.addMenuItem} onPress={() => {
              setAddMenuVisible(false);
              setCategoryName("");
              setCategoryFormVisible(true);
            }}>
              <Ionicons name="cube-outline" size={22} color="#17241D" />
              <Text style={styles.addMenuText}>Tambah Kategori</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* [ADDED] Form tambah kategori terhubung ke pos.createCategory. */}
      <Modal visible={categoryFormVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCategoryFormVisible(false)}>
        <View style={styles.categoryModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !createCategory.isPending && setCategoryFormVisible(false)} />
          <View style={styles.categoryDialog}>
            <View style={styles.categoryDialogHeader}>
              <Text style={styles.categoryDialogTitle}>Tambah kategori</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup" disabled={createCategory.isPending} onPress={() => setCategoryFormVisible(false)}>
                <Ionicons name="close" size={23} color="#68756D" />
              </Pressable>
            </View>
            <Text style={styles.categoryDialogDescription}>Kategori dibuat untuk outlet yang sedang aktif.</Text>
            <Text style={styles.fieldLabel}>Nama kategori</Text>
            <TextInput value={categoryName} onChangeText={setCategoryName} placeholder="Contoh: Minuman" placeholderTextColor="#8A9690" style={styles.input} autoFocus returnKeyType="done" onSubmitEditing={submitCategory} />
            <View style={styles.categoryDialogActions}>
              <Pressable style={styles.categoryCancelButton} disabled={createCategory.isPending} onPress={() => setCategoryFormVisible(false)}>
                <Text style={styles.categoryCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.categorySaveButton, (!categoryName.trim() || createCategory.isPending) && styles.categorySaveDisabled]} disabled={!categoryName.trim() || createCategory.isPending} onPress={submitCategory}>
                <Text style={styles.categorySaveText}>{createCategory.isPending ? "Menyimpan..." : "Simpan kategori"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* [ADDED] Form tambah/edit produk memakai mutation backend yang sudah tersedia. */}
      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeForm} />
          <View style={styles.formSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle}>
                  {form.id ? "Edit produk" : "Tambah produk"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tutup formulir"
                  onPress={closeForm}
                  disabled={isSaving}
                >
                  <Ionicons name="close" size={25} color={theme.colors.muted} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              <Text style={styles.fieldLabel}>Nama produk</Text>
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm((current) => ({ ...current, name }))}
                placeholder="Contoh: Ayam Panggang"
                placeholderTextColor="#8A9690"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Kategori</Text>
              <View style={styles.categoryChoices}>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setForm((current) => ({ ...current, categoryId: category.id }))}
                    style={[
                      styles.categoryChip,
                      form.categoryId === category.id && styles.categoryChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        form.categoryId === category.id && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Harga (Rp)</Text>
              <TextInput
                value={form.price}
                onChangeText={(price) =>
                  setForm((current) => ({ ...current, price: price.replace(/\D/g, "") }))
                }
                keyboardType="number-pad"
                placeholder="15000"
                placeholderTextColor="#8A9690"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Stok</Text>
              <TextInput
                value={form.stock}
                onChangeText={(stock) =>
                  setForm((current) => ({ ...current, stock: stock.replace(/\D/g, "") }))
                }
                keyboardType="number-pad"
                placeholder="50"
                placeholderTextColor="#8A9690"
                style={styles.input}
              />

              {/* [ADDED] Upload foto menu dengan preview, ganti, dan hapus foto. */}
              <Text style={styles.fieldLabel}>Foto menu (opsional)</Text>
              <View style={styles.productPhotoCard}>
                {productImageUri ? (
                  <Image source={{ uri: productImageUri }} style={styles.productPhotoPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.productPhotoPlaceholder}>
                    <Ionicons name="image-outline" size={30} color="#87938C" />
                    <Text style={styles.productPhotoPlaceholderText}>Belum ada foto</Text>
                  </View>
                )}
                <View style={styles.productPhotoActions}>
                  <Pressable style={styles.productPhotoChoose} onPress={chooseProductImage} disabled={uploadProductImage.isPending || isSaving}>
                    <Ionicons name="images-outline" size={18} color="#087B58" />
                    <Text style={styles.productPhotoChooseText}>{uploadProductImage.isPending ? "Mengunggah foto..." : productImageUri ? "Ganti foto" : "Pilih foto"}</Text>
                  </Pressable>
                  {productImageUri ? (
                    <Pressable style={styles.productPhotoRemove} onPress={() => { setProductImageUri(null); setProductImageUrl(null); }} disabled={uploadProductImage.isPending || isSaving}>
                      <Ionicons name="trash-outline" size={17} color="#A34F59" />
                      <Text style={styles.productPhotoRemoveText}>Hapus</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.productPhotoHint}>JPG, PNG, atau WebP · Maksimal 5 MB · Foto persegi disarankan</Text>
                {uploadProductImage.isPending ? <Text style={styles.productPhotoStatus}>Foto sedang diunggah...</Text> : productImageUri && !productImageUrl ? <Text style={styles.productPhotoStatus}>Menunggu upload selesai</Text> : null}
              </View>

              <ActionButton
                title={isSaving ? "Menyimpan..." : "Simpan produk"}
                loading={isSaving}
                onPress={submitForm}
              />
              <ActionButton title="Batal" secondary onPress={closeForm} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F1F7F3",
  },
  toolbar: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E9E3",
  },
  backButton: {
    width: 34,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarTitle: {
    color: "#15231C",
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    fontWeight: "800",
  },
  toolbarSpacer: {
    flex: 1,
  },
  toolbarIcon: {
    width: 42,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DCE6DF",
    backgroundColor: "#F6F9F7",
    overflow: "hidden",
  },
  searchCloseButton: {
    width: 30,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    color: "#17241D",
    fontSize: 13,
    padding: 0,
  },
  addButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#087B58",
  },
  content: {
    paddingHorizontal: 15,
    // [MODIFIED] Kartu ringkasan dimulai dekat dengan header tanpa rongga besar.
    paddingTop: 12,
    paddingBottom: 110,
    gap: 22,
  },
  heading: {
    gap: 4,
  },
  pageTitle: {
    color: "#14231C",
    fontFamily: "Archivo-Bold",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: "#66736B",
    fontSize: 14,
  },
  summaryCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6E1D9",
    backgroundColor: "#FFFFFF",
  },
  summaryItem: {
    flex: 1,
    gap: 3,
  },
  summaryItemRight: {
    alignItems: "flex-end",
  },
  summaryValue: {
    color: "#15231C",
    fontFamily: "Archivo-Bold",
    fontSize: 23,
    fontWeight: "800",
  },
  summaryLabel: {
    color: "#68756D",
    fontSize: 12,
  },
  categorySection: {
    gap: 12,
  },
  categoryHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryTitle: {
    color: "#17241D",
    fontFamily: "Archivo-Bold",
    fontSize: 19,
    fontWeight: "800",
  },
  categoryCount: {
    color: "#829087",
    fontSize: 13,
  },
  productCard: {
    overflow: "hidden",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#D6E1D9",
    backgroundColor: "#FFFFFF",
  },
  productRow: {
    // [MODIFIED] Konten baris lebih ringkas agar informasi dan aksi sejajar.
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  productDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E8E2",
  },
  inactiveRow: {
    opacity: 0.58,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 9,
    backgroundColor: "#E7F4EC",
  },
  productInitial: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#E3F5EB",
  },
  productInitialText: {
    color: "#087B58",
    fontFamily: "Archivo-Bold",
    fontSize: 23,
    fontWeight: "800",
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  productName: {
    color: "#18251E",
    fontFamily: "Figtree-Bold",
    fontSize: 14,
    fontWeight: "800",
  },
  sku: {
    color: "#8A9690",
    fontSize: 10,
  },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "nowrap",
  },
  price: {
    color: "#17241D",
    fontFamily: "Archivo-Bold",
    fontSize: 13,
    fontWeight: "800",
  },
  stock: {
    color: "#68756D",
    fontSize: 11,
  },
  productActions: {
    // [MODIFIED] Toggle dan tombol edit berada dalam satu baris.
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  switch: {
    transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }],
  },
  editButton: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  // [ADDED] Dropdown aksi tambah.
  addMenuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  addMenuCard: {
    position: "absolute",
    right: 14,
    width: 250,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E8E2",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  addMenuItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
  },
  addMenuText: {
    color: "#17241D",
    fontSize: 15,
    fontWeight: "700",
  },
  categoryModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  categoryDialog: {
    width: "100%",
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  categoryDialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryDialogTitle: {
    color: "#17241D",
    fontFamily: "Archivo-Bold",
    fontSize: 21,
    fontWeight: "800",
  },
  categoryDialogDescription: {
    color: "#68756D",
    fontSize: 13,
    marginTop: -6,
    marginBottom: 8,
  },
  categoryDialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  categoryCancelButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DCE6DF",
  },
  categoryCancelText: {
    color: "#17241D",
    fontSize: 14,
    fontWeight: "700",
  },
  categorySaveButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#087B58",
  },
  categorySaveDisabled: {
    opacity: 0.5,
  },
  categorySaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // [ADDED] Komponen foto produk yang ringkas dan konsisten dengan formulir.
  productPhotoCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCE6DF",
    borderRadius: 14,
    backgroundColor: "#F8FBF9",
    gap: 10,
  },
  productPhotoPreview: {
    width: "100%",
    aspectRatio: 1.65,
    borderRadius: 10,
    backgroundColor: "#E8F0EB",
  },
  productPhotoPlaceholder: {
    width: "100%",
    aspectRatio: 1.65,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C8D8CE",
    backgroundColor: "#EFF5F1",
  },
  productPhotoPlaceholderText: {
    color: "#68756D",
    fontSize: 12,
    fontWeight: "600",
  },
  productPhotoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  productPhotoChoose: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CFE2D7",
    backgroundColor: "#FFFFFF",
  },
  productPhotoChooseText: {
    color: "#087B58",
    fontSize: 13,
    fontWeight: "700",
  },
  productPhotoRemove: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  productPhotoRemoveText: {
    color: "#A34F59",
    fontSize: 13,
    fontWeight: "700",
  },
  productPhotoHint: {
    color: "#87938C",
    fontSize: 11,
    lineHeight: 16,
  },
  productPhotoStatus: {
    color: "#087B58",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  formSheet: {
    maxHeight: "88%",
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  sheetHeader: {
    gap: 13,
    paddingBottom: 15,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "#D8E0DB",
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: "#17241D",
    fontFamily: "Archivo-Bold",
    fontSize: 21,
    fontWeight: "800",
  },
  formContent: {
    gap: 12,
    paddingBottom: 10,
  },
  fieldLabel: {
    color: "#17241D",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#DCE6DF",
    borderRadius: 11,
    color: "#17241D",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },
  categoryChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#EEF3EF",
  },
  categoryChipActive: {
    backgroundColor: "#087B58",
  },
  categoryChipText: {
    color: "#526158",
    fontSize: 12,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
});

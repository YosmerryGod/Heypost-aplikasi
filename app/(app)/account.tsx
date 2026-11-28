import { showToast } from "@/components/native-ui"; // [ADDED] Feedback visual HeyPost.
// [ADDED] Pengaturan akun pribadi owner terpisah dari pengaturan toko.
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { trpc } from "@/providers/trpc";
import { getTheme, type ThemeColors } from "@/constants/theme";

export default function AccountSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const utils = trpc.useUtils();
  const session = trpc.auth.me.useQuery();
  const principal = session.data?.principal;
  const isOwner = principal?.role === "owner";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!principal) return;
    setName(principal.name);
    setEmail(principal.email ?? "");
  }, [principal?.name, principal?.email]);

  const updateAccount = trpc.auth.updateAccount.useMutation({
    onSuccess: async () => {
      setProfileCurrentPassword("");
      await utils.auth.me.invalidate();
      showToast("Tersimpan", "Informasi akun berhasil diperbarui.", "success");
    },
    onError: (error) => showToast("Gagal menyimpan", error.message, "error"),
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordCurrent("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password diperbarui", "Password akun berhasil diganti.", "success");
    },
    onError: (error) => showToast("Gagal mengganti password", error.message, "error"),
  });

  const uploadAvatar = trpc.auth.uploadAvatar.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      showToast("Foto diperbarui", "Foto profil berhasil diperbarui.", "success");
    },
    onError: (error) => showToast("Gagal mengunggah foto", error.message, "error"),
  });

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Izin diperlukan", "Izinkan akses galeri untuk memilih foto profil.", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    // [MODIFIED] Backend mendeteksi format sebenarnya dari signature file, bukan MIME Android.
    // Label JPEG di sini hanya pembungkus transport; backend menentukan ekstensi dari byte gambar.
    if (!asset.base64) {
      showToast("Foto tidak terbaca", "Pilih foto lain atau coba kembali.", "info");
      return;
    }
    uploadAvatar.mutate({ dataUrl: `data:image/jpeg;base64,${asset.base64}` });
  };

  const saveProfile = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      showToast("Nama belum valid", "Nama minimal 2 karakter.", "error");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      showToast("Email belum valid", "Masukkan alamat email yang benar.", "error");
      return;
    }
    if (principal?.hasPassword && cleanEmail !== principal.email && !profileCurrentPassword) {
      showToast("Verifikasi diperlukan", "Masukkan password saat ini untuk mengganti email.", "error");
      return;
    }
    updateAccount.mutate({
      name: cleanName,
      email: cleanEmail,
      ...(profileCurrentPassword ? { currentPassword: profileCurrentPassword } : {}),
    });
  };

  const savePassword = () => {
    if (!passwordCurrent) {
      showToast("Password saat ini wajib diisi", "Masukkan password yang sedang digunakan.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password terlalu pendek", "Password baru minimal 8 karakter.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Konfirmasi tidak cocok", "Ulangi password baru dengan benar.", "info");
      return;
    }
    changePassword.mutate({ currentPassword: passwordCurrent, newPassword });
  };

  const displayName = principal?.name ?? "Akun";
  const roleLabel = principal?.role === "owner" ? "Owner" : principal?.role === "manager" ? "Manager" : principal?.role === "kasir" ? "Kasir" : principal?.customTitle ?? "Karyawan";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={23} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Akun & Keamanan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            {principal?.avatarUrl ? <Image source={{ uri: principal.avatarUrl }} style={styles.avatar} /> : (
              <View style={styles.avatarPlaceholder}><Ionicons name="person-outline" size={38} color={colors.signal} /></View>
            )}
            {isOwner ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Ganti foto profil" onPress={chooseAvatar} disabled={uploadAvatar.isPending} style={styles.cameraButton}>
                <Ionicons name="camera" size={17} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.identityName}>{displayName}</Text>
          <Text style={styles.identityEmail}>{principal?.email ?? "Email tidak tersedia"}</Text>
          <View style={styles.rolePill}><Text style={styles.roleText}>{roleLabel}</Text></View>
          {uploadAvatar.isPending ? <Text style={styles.uploadHint}>Mengunggah foto...</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}><Ionicons name="person-outline" size={19} color={colors.signal} /></View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Informasi akun</Text>
              <Text style={styles.sectionDescription}>Ubah identitas yang digunakan pada akun HeyPost.</Text>
            </View>
          </View>

          {isOwner ? (
            <>
              <Text style={styles.label}>Nama lengkap</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Nama lengkap" placeholderTextColor="#96A19A" maxLength={100} style={styles.input} />
              <Text style={styles.label}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="nama@email.com" placeholderTextColor="#96A19A" keyboardType="email-address" autoCapitalize="none" editable={!principal?.googleLinked} style={[styles.input, principal?.googleLinked && styles.inputDisabled]} />
              {principal?.googleLinked ? <Text style={styles.helper}>Email terhubung ke Google dan dikelola melalui akun Google.</Text> : principal?.hasPassword && email.trim().toLowerCase() !== principal.email ? (
                <>
                  <Text style={styles.label}>Password saat ini untuk verifikasi email</Text>
                  <TextInput value={profileCurrentPassword} onChangeText={setProfileCurrentPassword} placeholder="Masukkan password saat ini" placeholderTextColor="#96A19A" secureTextEntry style={styles.input} />
                </>
              ) : null}
              <Pressable onPress={saveProfile} disabled={updateAccount.isPending || session.isLoading} style={[styles.primaryButton, (updateAccount.isPending || session.isLoading) && styles.disabledButton]}>
                <Text style={styles.primaryButtonText}>{updateAccount.isPending ? "Menyimpan..." : "Simpan perubahan"}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.helper}>Informasi akun karyawan dikelola oleh pemilik toko. Hubungi owner jika perlu memperbarui data.</Text>
          )}
        </View>

        {isOwner ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}><Ionicons name="lock-closed-outline" size={19} color={colors.signal} /></View>
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionTitle}>Keamanan</Text>
                <Text style={styles.sectionDescription}>Gunakan password yang kuat dan tidak dipakai di tempat lain.</Text>
              </View>
            </View>
            {principal?.hasPassword ? (
              <>
                <Text style={styles.label}>Password saat ini</Text>
                <TextInput value={passwordCurrent} onChangeText={setPasswordCurrent} placeholder="Password saat ini" placeholderTextColor="#96A19A" secureTextEntry style={styles.input} />
                <Text style={styles.label}>Password baru</Text>
                <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Minimal 8 karakter" placeholderTextColor="#96A19A" secureTextEntry style={styles.input} />
                <Text style={styles.label}>Konfirmasi password baru</Text>
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ulangi password baru" placeholderTextColor="#96A19A" secureTextEntry style={styles.input} />
                <Pressable onPress={savePassword} disabled={changePassword.isPending} style={[styles.primaryButton, changePassword.isPending && styles.disabledButton]}>
                  <Text style={styles.primaryButtonText}>{changePassword.isPending ? "Memperbarui..." : "Ganti password"}</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.googleNotice}>
                <Ionicons name="logo-google" size={19} color="#5E6A63" />
                <Text style={styles.googleNoticeText}>Akun ini menggunakan login Google. Pengelolaan password dilakukan melalui Google.</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={17} color="#7C8981" />
          <Text style={styles.infoText}>Perubahan akun disimpan dengan aman ke server HeyPost.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// [MODIFIED] Gunakan token warna tema yang mengikuti mode terang/gelap pada seluruh komponen layar.
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  backButton: { width: 38, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.ink, fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  identityCard: { alignItems: "center", paddingHorizontal: 18, paddingVertical: 22, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  avatarWrap: { width: 96, height: 96, position: "relative", marginBottom: 11 },
  avatar: { width: 96, height: 96, borderRadius: 30, backgroundColor: "#E8F2ED" },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F2ED" },
  cameraButton: { position: "absolute", right: -4, bottom: -3, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.signal, borderWidth: 3, borderColor: colors.surface },
  identityName: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  identityEmail: { marginTop: 3, color: colors.muted, fontSize: 12 },
  rolePill: { marginTop: 10, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.signalSoft },
  roleText: { color: colors.signal, fontSize: 11, fontWeight: "800" },
  uploadHint: { marginTop: 8, color: colors.muted, fontSize: 11 },
  sectionCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 15 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.signalSoft },
  sectionHeadingText: { flex: 1, gap: 3 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  sectionDescription: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  label: { marginTop: 11, marginBottom: 6, color: "#374151", fontSize: 12, fontWeight: "800" },
  input: { minHeight: 47, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 11, backgroundColor: colors.line, color: colors.ink, fontSize: 14 },
  inputDisabled: { color: "#849188", backgroundColor: "#F1F4F2" },
  helper: { marginTop: 8, color: colors.muted, fontSize: 11, lineHeight: 17 },
  primaryButton: { minHeight: 46, marginTop: 17, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.signal },
  primaryButtonText: { color: colors.surface, fontSize: 13, fontWeight: "800" },
  disabledButton: { opacity: 0.65 },
  googleNotice: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 11, backgroundColor: "#F2F5F3" },
  googleNoticeText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 8 },
  infoText: { color: "#7C8981", fontSize: 10 },
});

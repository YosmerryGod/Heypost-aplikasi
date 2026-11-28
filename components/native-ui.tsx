// [ADDED] Shared native design primitives adapted from HeyPost web tokens.
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, DeviceEventEmitter, Modal as NativeModal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme, type TextInputProps, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getTheme, type ThemeColors } from "@/constants/theme";

export const formatRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export const formatDate = (value: Date | string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

// [ADDED] Kirim feedback singkat yang konsisten tanpa dialog native yang memblokir layar.
export function showToast(title: string, message?: string, type: "success" | "error" | "info" | "warning" = "success") {
  DeviceEventEmitter.emit("heypost:toast", { title, message, type });
}

// [ADDED] Toast global untuk setiap halaman yang menggunakan AppScreen.
export function ToastHost() {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ title: string; message?: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("heypost:toast", (payload: { title: string; message?: string; type: "success" | "error" | "info" | "warning" }) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(payload);
      setVisible(true);
      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -8, duration: 180, useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished) { setVisible(false); setToast(null); } });
      }, 3000);
    });
    return () => { subscription.remove(); if (timer.current) clearTimeout(timer.current); };
  }, [opacity, translateY]);

  if (!visible || !toast) return null;
  const palette = toast.type === "success"
    ? { iconBg: "#E6F5EC", icon: "checkmark-circle" as const, color: "#F5B900", accent: "#15966D" }
    : toast.type === "error"
      ? { iconBg: "#FCEBEC", icon: "alert-circle" as const, color: "#B42318", accent: "#D64545" }
      : toast.type === "warning"
        ? { iconBg: "#FFF3DA", icon: "warning" as const, color: "#98620A", accent: "#D99A25" }
        : { iconBg: "#EAF1FA", icon: "information-circle" as const, color: "#315F91", accent: "#5487C7" };
  return <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ position: "absolute", top: insets.top + 10, left: 16, right: 16, zIndex: 10000, elevation: 30, opacity, transform: [{ translateY }], flexDirection: "row", alignItems: "center", gap: 11, paddingLeft: 11, paddingRight: 15, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: "#E3EAE5", backgroundColor: colors.surface, shadowColor: "#14271D", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.16, shadowRadius: 18 }}>
    <View style={{ width: 3, alignSelf: "stretch", borderRadius: 3, backgroundColor: palette.accent }} />
    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: palette.iconBg, alignItems: "center", justifyContent: "center" }}><Ionicons name={palette.icon} size={21} color={palette.color} /></View>
    <View style={{ flex: 1, gap: 2 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13, fontFamily: "Figtree-Bold", fontWeight: "800" }}>{toast.title}</Text>{toast.message ? <Text numberOfLines={2} style={{ color: colors.muted, fontFamily: "Figtree-Regular", fontSize: 12, lineHeight: 17 }}>{toast.message}</Text> : null}</View>
  </Animated.View>;
}

// [MODIFIED] Allow screens below a safe-area-aware app header to avoid a second top inset.
export function AppScreen({ children, scroll = true, style, safeAreaTop = true }: { children: ReactNode; scroll?: boolean; style?: ViewStyle; safeAreaTop?: boolean }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <SafeAreaView style={styles.safe} edges={safeAreaTop ? ["top", "left", "right"] : ["left", "right"]}>
    {scroll ? <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, style]}>{children}</ScrollView> : <View style={[styles.content, { flex: 1 }, style]}>{children}</View>}
  </SafeAreaView>;
}

export function PageHeading({ title, subtitle, eyebrow, right }: { title: string; subtitle?: string; eyebrow?: string; right?: ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.heading}><View style={{ flex: 1, gap: 5 }}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}<Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{right}</View>;
}

export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.panel, style]}>{children}</View>;
}

// [ADDED] API komponen standar; alias menjaga kompatibilitas halaman yang sudah memakai nama lama.
export const Card = Panel;
export const Button = ActionButton;
export const Input = Field;
export const Badge = Tag;
export const PageHeader = PageHeading;

// [REMOVED] Indikator kotak beranimasi dihapus dari komponen bersama.

export function ActionButton({ title, onPress, disabled, loading, secondary, danger, compact }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: boolean; danger?: boolean; compact?: boolean }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  // [MODIFIED] Saat proses berjalan, tombol tetap informatif tanpa spinner animasi.
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, secondary && styles.buttonSecondary, danger && styles.buttonDanger, (disabled || loading) && styles.buttonDisabled, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.buttonSecondaryText, danger && styles.buttonDangerText]}>{title}</Text></Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, editable = true, ...props }: TextInputProps & { label: string; value: string; onChangeText: (value: string) => void }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} editable={editable} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} secureTextEntry={secureTextEntry} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.multiline, !editable && { opacity: 0.6 }]} /></View>;
}

// [ADDED] Input autentikasi global untuk Login dan Register, termasuk ikon serta aksi trailing.
export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  leftIcon,
  rightIcon,
  onRightPress,
  secureTextEntry,
  containerStyle,
  inputStyle,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  secureTextEntry?: boolean;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: ViewStyle;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  maxLength?: number;
}) {
  // [MODIFIED] Autentikasi selalu menggunakan palet Dark.
  const colors = useMemo(() => getTheme(true).colors, []);
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.ink, fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "700" }}>{label}</Text>
      <View style={[{
        minHeight: 50,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: 14,
        backgroundColor: colors.surface,
      }, containerStyle]}>
        {leftIcon ? <Ionicons name={leftIcon} size={21} color={colors.signal} style={{ width: 34 }} /> : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          style={[{ flex: 1, minHeight: 50, padding: 0, color: colors.ink, fontSize: 16 }, inputStyle]}
        />
        {rightIcon && onRightPress ? (
          <Pressable accessibilityRole="button" accessibilityLabel={rightIcon.includes("eye") ? "Ubah visibilitas password" : label} hitSlop={10} onPress={onRightPress} style={{ minWidth: 38, minHeight: 42, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={rightIcon} size={22} color={colors.signal} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// [ADDED] Tombol utama autentikasi global dengan state disabled/loading.
export function AuthButton({ title, onPress, disabled, loading, style, trailing }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  trailing?: ReactNode;
}) {
  // [MODIFIED] Autentikasi selalu menggunakan palet Dark.
  const colors = useMemo(() => getTheme(true).colors, []);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [{
        minHeight: 50,
        paddingHorizontal: 18,
        borderRadius: 14,
        backgroundColor: colors.signal,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled || loading ? 0.55 : pressed ? 0.78 : 1,
      }, style]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Text style={{ color: "#FFFFFF", fontFamily: "Figtree-Bold", fontSize: 15, fontWeight: "800" }}>{loading ? "Memproses..." : title}</Text>
        {!loading ? trailing : null}
      </View>
    </Pressable>
  );
}

export function Tag({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "neutral" }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toneColors = tone === "green" ? ["#FFF5D6", colors.signal] : tone === "amber" ? ["#fff4df", "#93600b"] : tone === "red" ? ["#fcebea", "#b42318"] : ["#eef1ef", colors.muted];
  return <View style={[styles.tag, { backgroundColor: toneColors[0] }]}><Text style={[styles.tagText, { color: toneColors[1] }]}>{children}</Text></View>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.empty}><Text style={styles.emptyMark}>—</Text><Text style={styles.emptyTitle}>{title}</Text>{description ? <Text style={styles.subtitle}>{description}</Text> : null}{action}</View>;
}

// [MODIFIED] Skeleton statis mengikuti struktur konten, tanpa shimmer atau animasi.
export function LoadingState({ variant = "list" }: { variant?: "list" | "report" | "form" }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const block = (width: number | string, height: number, radius = 8) => (
    <View style={{ width: width as ViewStyle["width"], height, borderRadius: radius, backgroundColor: colors.line }} />
  );
  return <View accessibilityRole="progressbar" accessibilityLabel="Sedang memuat konten" style={{ gap: 14, paddingVertical: 12 }}>
    {variant === "report" ? (
      <>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[0, 1].map((key) => <View key={key} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 14, borderWidth: 1, borderColor: colors.line }}>{block("60%", 11)}{block("85%", 26)}</View>)}
        </View>
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 18, borderWidth: 1, borderColor: colors.line }}>
          {block("45%", 15)}
          <View style={{ height: 115, flexDirection: "row", alignItems: "flex-end", gap: 10 }}>{[58, 90, 70, 110, 82, 100, 66].map((height, key) => <View key={key} style={{ flex: 1, height, backgroundColor: colors.line, borderRadius: 6 }} />)}</View>
        </View>
      </>
    ) : variant === "form" ? (
      [0, 1, 2].map((key) => <View key={key} style={{ gap: 9 }}>{block("35%", 12)}{block("100%", 46, 10)}</View>)
    ) : (
      [0, 1, 2, 3].map((key) => <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.surface, borderRadius: 13, padding: 14, borderWidth: 1, borderColor: colors.line }}>
        {block(42, 42, 11)}
        <View style={{ flex: 1, gap: 10 }}>{block("65%", 13)}{block("42%", 10)}</View>
        {block(42, 12)}
      </View>)
    )}
  </View>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <EmptyState title="Data belum dapat dimuat" description={message} action={<ActionButton title="Coba lagi" onPress={retry} secondary />} />;
}

// [ADDED] Modal global dengan backdrop, header, area konten, dan footer opsional.
export function Modal({ visible, onClose, title, children, footer }: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  return (
    <NativeModal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Tutup dialog" onPress={onClose} style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: colors.overlay }}>
        <Pressable onPress={() => undefined} style={{ width: "100%", maxWidth: 520, alignSelf: "center", maxHeight: "85%", overflow: "hidden", borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
          {title ? <View style={{ paddingHorizontal: 20, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ color: colors.ink, fontFamily: "Figtree-Bold", fontSize: 17 }}>{title}</Text>
          </View> : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line }}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}

// [ADDED] Pemisah visual yang mengambil warna dari token tema.
export function Divider({ style }: { style?: ViewStyle }) {
  const colorScheme = useColorScheme();
  const colors = useMemo(() => getTheme(colorScheme === "dark").colors, [colorScheme]);
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, width: "100%" }, style]} />;
}

// [MODIFIED] Gunakan token warna tema yang mengikuti mode terang/gelap pada seluruh komponen layar.
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34, gap: 18 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  eyebrow: { color: colors.signal, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontFamily: "Archivo-Bold", fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontFamily: "Figtree-Regular", fontSize: 13, lineHeight: 19 },
  panel: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 13 },
  button: { minHeight: 48, paddingHorizontal: 17, borderRadius: 10, backgroundColor: colors.signal, alignItems: "center", justifyContent: "center" },
  buttonCompact: { minHeight: 40, paddingHorizontal: 13 },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  buttonDanger: { backgroundColor: "#fcebea", borderWidth: 1, borderColor: "#f3c9c5" },
  buttonDisabled: { opacity: 0.48 },
  buttonText: { color: colors.surface, fontFamily: "Figtree-Bold", fontSize: 14, fontWeight: "700" },
  buttonSecondaryText: { color: colors.ink },
  buttonDangerText: { color: "#b42318" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  field: { gap: 7 },
  label: { color: colors.ink, fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, fontSize: 14 },
  multiline: { minHeight: 88, paddingTop: 12 },
  tag: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  tagText: { fontSize: 11, fontWeight: "700" },
  empty: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 9, padding: 22 },
  emptyMark: { color: colors.signal, fontSize: 32, fontWeight: "300" },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
});
// [ADDED] Shared native design primitives adapted from HeyPost web tokens.
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

export const formatRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export const formatDate = (value: Date | string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function AppScreen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) {
  return <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    {scroll ? <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, style]}>{children}</ScrollView> : <View style={[styles.content, { flex: 1 }, style]}>{children}</View>}
  </SafeAreaView>;
}

export function PageHeading({ title, subtitle, eyebrow, right }: { title: string; subtitle?: string; eyebrow?: string; right?: ReactNode }) {
  return <View style={styles.heading}><View style={{ flex: 1, gap: 5 }}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}<Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{right}</View>;
}

export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function ActionButton({ title, onPress, disabled, loading, secondary, danger, compact }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: boolean; danger?: boolean; compact?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, secondary && styles.buttonSecondary, danger && styles.buttonDanger, (disabled || loading) && styles.buttonDisabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={secondary ? theme.colors.signal : "#fff"} /> : <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText, danger && styles.buttonDangerText]}>{title}</Text>}</Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, editable = true, ...props }: TextInputProps & { label: string; value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} editable={editable} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.muted} keyboardType={keyboardType} secureTextEntry={secureTextEntry} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.multiline, !editable && { opacity: 0.6 }]} /></View>;
}

export function Tag({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "neutral" }) {
  const colors = tone === "green" ? ["#e8f2ed", theme.colors.signal] : tone === "amber" ? ["#fff4df", "#93600b"] : tone === "red" ? ["#fcebea", "#b42318"] : ["#eef1ef", theme.colors.muted];
  return <View style={[styles.tag, { backgroundColor: colors[0] }]}><Text style={[styles.tagText, { color: colors[1] }]}>{children}</Text></View>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <View style={styles.empty}><Text style={styles.emptyMark}>—</Text><Text style={styles.emptyTitle}>{title}</Text>{description ? <Text style={styles.subtitle}>{description}</Text> : null}{action}</View>;
}

export function LoadingState() {
  return <View style={styles.empty}><ActivityIndicator color={theme.colors.signal} size="large" /><Text style={styles.subtitle}>Memuat data...</Text></View>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <EmptyState title="Data belum dapat dimuat" description={message} action={<ActionButton title="Coba lagi" onPress={retry} secondary />} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ground },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34, gap: 18 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  eyebrow: { color: theme.colors.signal, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: theme.colors.ink, fontFamily: "Archivo-Bold", fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: theme.colors.muted, fontFamily: "Figtree-Regular", fontSize: 13, lineHeight: 19 },
  panel: { backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.line, padding: 16, gap: 13 },
  button: { minHeight: 48, paddingHorizontal: 17, borderRadius: 10, backgroundColor: theme.colors.signal, alignItems: "center", justifyContent: "center" },
  buttonCompact: { minHeight: 40, paddingHorizontal: 13 },
  buttonSecondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line },
  buttonDanger: { backgroundColor: "#fcebea", borderWidth: 1, borderColor: "#f3c9c5" },
  buttonDisabled: { opacity: 0.48 },
  buttonText: { color: "#fff", fontFamily: "Figtree-Bold", fontSize: 14, fontWeight: "700" },
  buttonSecondaryText: { color: theme.colors.ink },
  buttonDangerText: { color: "#b42318" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  field: { gap: 7 },
  label: { color: theme.colors.ink, fontFamily: "Figtree-Bold", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: theme.colors.line, borderRadius: 10, backgroundColor: "#fff", color: theme.colors.ink, fontSize: 14 },
  multiline: { minHeight: 88, paddingTop: 12 },
  tag: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  tagText: { fontSize: 11, fontWeight: "700" },
  empty: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 9, padding: 22 },
  emptyMark: { color: theme.colors.signal, fontSize: 32, fontWeight: "300" },
  emptyTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: "700" },
});
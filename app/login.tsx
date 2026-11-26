import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "@/components/Screen";
import { theme } from "@/constants/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleContinue() {
    // Login API and secure session handling are implemented in the authentication phase.
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.title}>Masuk</Text>
          <Text style={styles.subtitle}>Masuk ke akun HeyPost Anda.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="nama@email.com"
              placeholderTextColor={theme.colors.muted}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Masukkan password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              (!email.trim() || !password) && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Autentikasi segera tersedia</Text>
          </Pressable>

          <Text style={styles.notice}>
            Form ini adalah kerangka antarmuka. Autentikasi belum dihubungkan ke server.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
  backText: {
    color: theme.colors.signal,
    fontSize: 14,
    fontWeight: "700",
  },
  heading: {
    marginTop: 36,
    marginBottom: 30,
    gap: 8,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.ink,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.signal,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
  notice: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
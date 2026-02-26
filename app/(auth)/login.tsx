import { Link } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAuth } from "../../components/AuthProvider";

const DARK_BG = "#020617";
const CARD_BG = "#020617";
const BORDER = "#1f2937";
const ACCENT = "#22c55e";
const TEXT = "#f9fafb";
const MUTED = "#9ca3af";
const ERROR = "#f87171";

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onSubmit = async () => {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    setError(undefined);

    const { error } = await login(email.trim(), password);
    setSubmitting(false);

    if (error) {
      setError(error);
      return;
    }

    // Auth flow handled automatically by app/_layout.tsx Redirect logic
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>GymBond</Text>
        <Text style={styles.subtitle}>Welcome back</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={MUTED}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={MUTED}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && !submitting && styles.buttonPressed,
            submitting && styles.buttonDisabled,
          ]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Signing in..." : "Sign in"}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to GymBond?</Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text style={styles.linkText}>Create account</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: TEXT,
  },
  subtitle: {
    marginTop: 4,
    color: MUTED,
  },
  field: {
    marginTop: 16,
  },
  label: {
    color: MUTED,
    marginBottom: 6,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
    backgroundColor: "#020617",
    fontSize: 15,
  },
  button: {
    marginTop: 24,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "600",
    fontSize: 16,
  },
  footerRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    color: MUTED,
    fontSize: 13,
  },
  linkText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "500",
  },
  errorText: {
    marginTop: 12,
    color: ERROR,
    fontSize: 13,
  },
});


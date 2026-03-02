import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAuth } from "../../../components/AuthProvider";
import { db } from "../../../lib/firebase";

const DARK_BG = "#020617";
const CARD_BG = "#020617";
const BORDER = "#1f2937";
const ACCENT = "#22c55e";
const TEXT = "#f9fafb";
const MUTED = "#9ca3af";
const ERROR = "#f87171";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const GOAL_OPTIONS = [
  "Build muscle",
  "Lose fat",
  "Get stronger",
  "Improve endurance",
  "General fitness",
];
const TIME_OPTIONS = [
  "Early morning",
  "Morning",
  "Afternoon",
  "Evening",
  "Late night",
  "Weekends",
];

export default function EditProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [goal, setGoal] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || "");
          setAge(data.age?.toString() || "");
          setGender(data.gender || "");
          setGoal(data.goal || "");
          setPreferredTime(data.preferredTime || "");
          setBio(data.bio || "");
        }
      } catch (e) {
        console.error("[EditProfile] Error loading profile", e);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const onSubmit = async () => {
    if (!user) {
      setError("You must be signed in to edit your profile.");
      return;
    }
    if (!db) {
      setError("Firestore is not configured. Please check lib/firebase.ts.");
      return;
    }

    if (!name || !age || !gender || !goal || !preferredTime || !bio) {
      setError("Please fill in all fields.");
      return;
    }

    const parsedAge = Number(age);
    if (Number.isNaN(parsedAge) || parsedAge <= 0) {
      setError("Please enter a valid age.");
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name,
        age: parsedAge,
        gender,
        goal,
        preferredTime,
        bio,
      });

      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: DARK_BG }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your fitness profile</Text>

          <Field label="Name">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Alex Johnson"
              placeholderTextColor={MUTED}
            />
          </Field>

          <Field label="Age">
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="26"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
            />
          </Field>

          <Field label="Gender">
            <OptionChips
              options={GENDER_OPTIONS}
              value={gender}
              onChange={setGender}
            />
          </Field>

          <Field label="Goal">
            <OptionChips
              options={GOAL_OPTIONS}
              value={goal}
              onChange={setGoal}
            />
          </Field>

          <Field label="Preferred time to workout">
            <OptionChips
              options={TIME_OPTIONS}
              value={preferredTime}
              onChange={setPreferredTime}
            />
          </Field>

          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Share a bit about your training history or what motivates you."
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

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
              {submitting ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

type OptionChipsProps = {
  options: string[];
  value: string;
  onChange: (next: string) => void;
};

function OptionChips({ options, value, onChange }: OptionChipsProps) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.chipPressed,
            ]}
          >
            <Text
              style={selected ? styles.chipTextSelected : styles.chipText}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
  },
  subtitle: {
    marginTop: 6,
    color: MUTED,
    fontSize: 13,
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
  textArea: {
    minHeight: 96,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    backgroundColor: "#020617",
  },
  chipSelected: {
    borderColor: ACCENT,
    backgroundColor: "#022c22",
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    color: MUTED,
    fontSize: 13,
  },
  chipTextSelected: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
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
  cancelButton: {
    marginTop: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: TEXT,
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    color: ERROR,
    fontSize: 13,
  },
});

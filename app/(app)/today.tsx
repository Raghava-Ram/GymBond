import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useAuth } from "../../components/AuthProvider";
import {
    Checkbox,
    CheckboxIcon,
    CheckboxIndicator,
    CheckboxLabel,
} from "../../components/ui/checkbox";
import { CheckIcon } from "../../components/ui/icon";
import { getTodayDateString } from "../../lib/dateUtils";
import { db } from "../../lib/firebase";
import { completeWorkout } from "../../lib/streak";

export default function TodayScreen() {
  const { user, loading, hasProfile } = useAuth();
  const router = useRouter();
  const [weeklyPlan, setWeeklyPlan] = useState<any>(null);
  const [musclesDone, setMusclesDone] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [workoutDone, setWorkoutDone] = useState(false);

  const todayKey = useCallback(() => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[new Date().getDay()];
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    if (!hasProfile) {
      router.replace("/(app)/profile/create");
    }
  }, [user, loading, hasProfile]);

  // fetch plan and streak whenever user becomes available
  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setWeeklyPlan(data.weeklyPlan || {
            sunday: { muscles: [], isRest: false },
            monday: { muscles: [], isRest: false },
            tuesday: { muscles: [], isRest: false },
            wednesday: { muscles: [], isRest: false },
            thursday: { muscles: [], isRest: false },
            friday: { muscles: [], isRest: false },
            saturday: { muscles: [], isRest: false },
          });
          setCurrentStreak(data.currentStreak || 0);
        }
      } catch (e) {
        console.error("[Today] failed to load plan", e);
      }
    };
    load();

    // also check if today's workout is already done
    const checkDone = async () => {
      if (!user?.uid) return;
      const today = getTodayDateString();
      try {
        const logSnap = await getDoc(doc(db, "workoutLogs", user.uid, "days", today));
        if (logSnap.exists()) {
          setWorkoutDone(true);
        }
      } catch (e) {
        console.error("[Today] failed to check workout log", e);
      }
    };

    checkDone();
  }, [user]);

  const toggleMuscle = (muscle: string) => {
    setMusclesDone((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const handleComplete = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await completeWorkout(user.uid, musclesDone);
      // fetch updated streak
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setCurrentStreak(snap.data().currentStreak || 0);
      }
      // mark done so UI disables permanently
      setWorkoutDone(true);
      // reset so the button disables
      setMusclesDone([]);
    } catch (e) {
      console.error("[Today] complete workout error", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !hasProfile || !weeklyPlan) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const plan = weeklyPlan[todayKey()];
  const isRest = plan?.isRest;
  const muscles: string[] = plan?.muscles || [];
  const allChecked = isRest || muscles.length === musclesDone.length;
  const shouldDisableButton = !allChecked || saving || workoutDone;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Workout</Text>
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {currentStreak} day streak</Text>
        </View>
      </View>

      {isRest ? (
        <Text style={styles.restText}>Rest day 💤</Text>
      ) : muscles.length === 0 ? (
        <Text style={styles.restText}>No workout planned for today.</Text>
      ) : workoutDone ? (
        <Text style={styles.restText}>Workout already completed ✅</Text>
      ) : (
        muscles.map((m) => {
          const selected = musclesDone.includes(m);
          return (
            <Checkbox
              key={m}
              size="md"
              onPress={() => toggleMuscle(m)}
              isDisabled={workoutDone}
            >
              <CheckboxIndicator>
                {selected && (
                  <CheckboxIcon as={CheckIcon} color="#22c55e" size={20} />
                )}
              </CheckboxIndicator>
              <CheckboxLabel>{m}</CheckboxLabel>
            </Checkbox>
          );
        })
      )}

      <Pressable
        style={[
          styles.completeButton,
          shouldDisableButton && styles.completeButtonDisabled,
        ]}
        onPress={handleComplete}
        disabled={shouldDisableButton}
      >
        <Text style={styles.completeButtonText}>
          {workoutDone ? "Completed" : saving ? "Completing..." : "Complete Workout"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#020617",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 12,
  },
  streakBadge: {
    backgroundColor: "#022c22",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  streakText: {
    color: "#22c55e",
    fontWeight: "600",
    fontSize: 14,
  },
  restText: {
    color: "#22c55e",
    fontSize: 16,
    marginBottom: 20,
  },
  muscleItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 10,
    backgroundColor: "#020617",
  },
  muscleItemSelected: {
    backgroundColor: "#022c22",
    borderColor: "#22c55e",
  },
  muscleText: {
    color: "#f9fafb",
  },
  muscleTextSelected: {
    color: "#22c55e",
    fontWeight: "600",
  },
  completeButton: {
    marginTop: 30,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: "#020617",
    fontWeight: "600",
    fontSize: 16,
  },
});
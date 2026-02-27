import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { useAuth } from '../../components/AuthProvider';
import { db } from '../../lib/firebase';

const MUSCLE_GROUPS = [
  "Back",
  "Biceps",
  "Chest",
  "Triceps",
  "Legs",
  "Shoulders",
  "Abs",
  "Forearms",
  "Glutes",
  "Cardio",
];

const DARK_BG = '#020617';
const CARD_BG = '#020617';
const BORDER = '#1f2937';
const ACCENT = '#22c55e';
const TEXT = '#f9fafb';
const MUTED = '#9ca3af';
const DANGER = '#ef4444';

type UserProfile = {
  name: string;
  age?: number;
  goal?: string;
  preferredTime?: string;
  bio?: string;
  individualStreak?: number;
  lastWorkout?: any;
  activeDuoId?: string | null;
  createdAt?: any;
};

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const createEmptyDay = () => ({
    muscles: [],
    isRest: false,
  });

  const [weeklyPlan, setWeeklyPlan] = useState<any>({
    sunday: createEmptyDay(),
    monday: createEmptyDay(),
    tuesday: createEmptyDay(),
    wednesday: createEmptyDay(),
    thursday: createEmptyDay(),
    friday: createEmptyDay(),
    saturday: createEmptyDay(),
  });
  const [editingPlan, setEditingPlan] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!db || !user?.uid) return;

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      if (data?.weeklyPlan) {
        setWeeklyPlan(data.weeklyPlan);
      }
    });

    return unsubscribe;
  }, [user]);

  const toggleMuscle = (day: string, muscle: string) => {
    setWeeklyPlan((prev: any) => {
      const current = prev[day]?.muscles || [];

      const updatedMuscles = current.includes(muscle)
        ? current.filter((m: string) => m !== muscle)
        : [...current, muscle];

      return {
        ...prev,
        [day]: {
          ...prev[day],
          muscles: updatedMuscles,
        },
      };
    });
  };

  const toggleRestDay = (day: string) => {
    setWeeklyPlan((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isRest: !prev[day].isRest,
        muscles: [],
      },
    }));
  };

  const getTodayKey = () => {
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
  };

  const getOrderedDays = () => {
    return [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
  };

  const handleSavePlan = async () => {
    if (!db || !user?.uid) return;

    await updateDoc(doc(db, "users", user.uid), {
      weeklyPlan,
    });

    Alert.alert("Success", "Weekly plan saved!");
  };

  const fetchProfile = async () => {
    if (!db || !user?.uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setProfile({
          name: userData.name || 'Unknown',
          age: userData.age,
          goal: userData.goal,
          preferredTime: userData.preferredTime,
          bio: userData.bio,
          individualStreak: userData.individualStreak || 0,
          lastWorkout: userData.lastWorkout,
          activeDuoId: userData.activeDuoId || null,
          createdAt: userData.createdAt,
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('[Profile] Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // Navigate to edit profile (placeholder)
    // TODO: Implement edit profile functionality
    Alert.alert('Edit Profile', 'Edit profile functionality coming soon!');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {profile ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{profile.name}</Text>
                {profile.age && (
                  <Text style={styles.age}>Age: {profile.age}</Text>
                )}
              </View>
            </View>

            {profile.goal && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Goal</Text>
                <Text style={styles.sectionContent}>{profile.goal}</Text>
              </View>
            )}

            {profile.preferredTime && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferred Workout Time</Text>
                <Text style={styles.sectionContent}>{profile.preferredTime}</Text>
              </View>
            )}

            {profile.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.sectionContent}>{profile.bio}</Text>
              </View>
            )}

            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.individualStreak || 0}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {profile.activeDuoId ? '👥' : '🏃‍♂️'}
                  </Text>
                  <Text style={styles.statLabel}>
                    {profile.activeDuoId ? 'In Duo' : 'Solo'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Today's Plan</Text>
          
          <View style={styles.card}>
            {(() => {
              const todayKey = getTodayKey();
              const todayPlan = weeklyPlan[todayKey];

              return todayPlan?.isRest ? (
                <Text style={{ color: ACCENT, fontSize: 16, fontWeight: '600' }}>Rest Day 💤</Text>
              ) : todayPlan?.muscles?.length > 0 ? (
                todayPlan.muscles.map((muscle: string) => (
                  <Text key={muscle} style={{ color: TEXT, fontSize: 14, marginBottom: 4 }}>
                    • {muscle}
                  </Text>
                ))
              ) : (
                <Text style={{ color: MUTED, fontSize: 14 }}>
                  No workout planned for today
                </Text>
              );
            })()}
          </View>

          {!editingPlan ? (
            <Pressable
              style={styles.editPlanButton}
              onPress={() => setEditingPlan(true)}
            >
              <Text style={styles.editPlanButtonText}>
                Edit Weekly Plan
              </Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Weekly Workout Plan</Text>

              {getOrderedDays().map((day) => (
                <View key={day} style={styles.dayContainer}>
                  <Text style={styles.dayTitle}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>

                  <Pressable
                    style={[
                      styles.restButton,
                      weeklyPlan[day]?.isRest && styles.restButtonActive,
                    ]}
                    onPress={() => toggleRestDay(day)}
                  >
                    <Text style={styles.restButtonText}>
                      {weeklyPlan[day]?.isRest ? "Rest Day Selected" : "Mark as Rest Day"}
                    </Text>
                  </Pressable>

                  {!weeklyPlan[day]?.isRest && (
                    <View style={styles.muscleGrid}>
                      {MUSCLE_GROUPS.map((muscle) => {
                        const selected = weeklyPlan[day]?.muscles?.includes(muscle);

                        return (
                          <Pressable
                            key={muscle}
                            style={[
                              styles.muscleChip,
                              selected && styles.muscleChipSelected,
                            ]}
                            onPress={() => toggleMuscle(day, muscle)}
                          >
                            <Text
                              style={[
                                styles.muscleText,
                                selected && styles.muscleTextSelected,
                              ]}
                            >
                              {muscle}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}

              <Pressable
                style={styles.saveButton}
                onPress={() => {
                  handleSavePlan();
                  setEditingPlan(false);
                }}
              >
                <Text style={styles.saveButtonText}>
                  Save Plan
                </Text>
              </Pressable>
            </>
          )}

          <View style={styles.actionsCard}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleEditProfile}
            >
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Profile not found</Text>
          <Text style={styles.emptySubtext}>
            Please complete your profile setup.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: TEXT,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    color: MUTED,
    textAlign: 'center',
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: DARK_BG,
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  age: {
    color: MUTED,
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  bioSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  bio: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  statsSection: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: MUTED,
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: BORDER,
    marginHorizontal: 20,
  },
  actionsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  actionButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    color: DARK_BG,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DANGER,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutButtonText: {
    color: DANGER,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  dayContainer: {
    marginBottom: 20,
  },
  dayTitle: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  muscleChipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  muscleText: {
    color: TEXT,
    fontSize: 12,
  },
  muscleTextSelected: {
    color: DARK_BG,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: DARK_BG,
    fontWeight: '600',
  },
  editPlanButton: {
    backgroundColor: ACCENT,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 16,
  },
  editPlanButtonText: {
    color: DARK_BG,
    fontWeight: "600",
  },
  restButton: {
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  restButtonActive: {
    backgroundColor: "#334155",
  },
  restButtonText: {
    color: TEXT,
    fontSize: 12,
  },
});

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { useAuth } from '../../components/AuthProvider';
import { db } from '../../lib/firebase';

const DARK_BG = '#020617';
const CARD_BG = '#020617';
const BORDER = '#1f2937';
const ACCENT = '#22c55e';
const TEXT = '#f9fafb';
const MUTED = '#9ca3af';
const DANGER = '#ef4444';

type Duo = {
  id: string;
  members: string[];
  status: string;
  duoStreak: number;
  lastDuoWorkout: any;
  partnerName: string;
  partnerAge?: number;
  partnerGoal?: string;
  createdAt: any;
  endRequestedBy?: string | null;
  endApprovedBy?: string[];
};

export default function DuoScreen() {
  const { user } = useAuth();
  const [duo, setDuo] = useState<Duo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDuoId, setActiveDuoId] = useState<string | null>(null);

  // 1️⃣ Listen to user document
  useEffect(() => {
    if (!db || !user?.uid) {
      setActiveDuoId(null);
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setActiveDuoId(null);
        return;
      }

      const data = snap.data();
      setActiveDuoId(data?.activeDuoId ?? null);
    });

    return unsubscribe;
  }, [user]);


  // 2️⃣ Listen to duo document separately
  useEffect(() => {
    if (!db || !user?.uid) {
      setDuo(null);
      setLoading(false);
      return;
    }

    if (!activeDuoId) {
      setDuo(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const duoRef = doc(db, "duos", activeDuoId);

    const unsubscribe = onSnapshot(duoRef, async (duoSnap) => {
      if (!duoSnap.exists()) {
        setDuo(null);
        setLoading(false);
        return;
      }

      const duoData = duoSnap.data() as DocumentData;

      // 🔥 IMPORTANT: ignore ended duos
      if (duoData.status === "ended") {
        setDuo(null);
        setLoading(false);
        return;
      }

      const partnerId = duoData.members.find(
        (uid: string) => uid !== user.uid
      );

      if (!partnerId) {
        setDuo(null);
        setLoading(false);
        return;
      }

      const partnerSnap = await getDocs(
        query(collection(db, "users"), where("__name__", "==", partnerId))
      );

      const partnerData = partnerSnap.docs[0]?.data();

      setDuo({
        id: duoSnap.id,
        members: duoData.members,
        status: duoData.status,
        duoStreak: duoData.duoStreak || 0,
        lastDuoWorkout: duoData.lastDuoWorkout,
        partnerName: partnerData?.name || "Unknown",
        partnerAge: partnerData?.age,
        partnerGoal: partnerData?.goal,
        createdAt: duoData.createdAt,
        endRequestedBy: duoData.endRequestedBy || null,
        endApprovedBy: duoData.endApprovedBy || [],
      });

      setLoading(false);
    });

    return unsubscribe;
  }, [activeDuoId, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time listeners will automatically update
    // No manual fetch needed as onSnapshot handles real-time updates
    setRefreshing(false);
  };

  const handleStartWorkout = () => {
    // Placeholder for workout logic
    console.log('Start workout with', duo?.partnerName);
  };

  const handleApproveEnd = async () => {
    if (!duo || !user?.uid || !db) return;

    try {
      const batch = writeBatch(db);
      const duoRef = doc(db, "duos", duo.id);

      const updatedApprovals = [...(duo.endApprovedBy || []), user.uid];

      if (updatedApprovals.length < 2) {
        await updateDoc(duoRef, {
          endApprovedBy: updatedApprovals,
        });
        return;
      }

      // Both approved → end partnership
      batch.update(duoRef, {
        status: "ended",
      });

      duo.members.forEach((memberId: string) => {
        batch.update(doc(db, "users", memberId), {
          activeDuoId: null,
        });
      });

      await batch.commit();

    } catch (error) {
      Alert.alert("Error", "Failed to approve ending.");
    }
  };

  const handleRequestEnd = async () => {
    if (!duo || !user?.uid || !db) return;

    try {
      const duoRef = doc(db, "duos", duo.id);

      await updateDoc(duoRef, {
        status: "ending_requested",
        endRequestedBy: user.uid,
        endApprovedBy: [user.uid],
      });

    } catch (error) {
      Alert.alert("Error", "Failed to request ending.");
    }
  };

  const handleCancelEndRequest = async () => {
    if (!duo || !db) return;

    try {
      const duoRef = doc(db, "duos", duo.id);

      await updateDoc(duoRef, {
        status: "active",
        endRequestedBy: null,
        endApprovedBy: [],
      });

    } catch (error) {
      Alert.alert("Error", "Failed to cancel end request.");
    }
  };

  const handleRejectEndRequest = async () => {
    if (!duo || !db) return;

    try {
      await updateDoc(doc(db, "duos", duo.id), {
        status: "active",
        endRequestedBy: null,
        endApprovedBy: [],
      });
    } catch (error) {
      Alert.alert("Error", "Failed to reject end request.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Gym Duo</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingText}>Loading your duo...</Text>
          </View>
        ) : !duo ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active bond yet</Text>
            <Text style={styles.emptySubtext}>
              Accept a bond request to start your fitness journey together.
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.partnerHeader}>
                <Text style={styles.partnerTitle}>Your Gym Buddy</Text>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>{duo.duoStreak} day streak</Text>
                </View>
              </View>

              <Text style={styles.partnerName}>
                {duo.partnerName}
                {duo.partnerAge ? `, ${duo.partnerAge}` : ''}
              </Text>
              
              {duo.partnerGoal ? (
                <Text style={styles.meta}>
                  Goal: <Text style={styles.metaValue}>{duo.partnerGoal}</Text>
                </Text>
              ) : null}

              <View style={styles.workoutSection}>
                <Text style={styles.workoutTitle}>Ready to workout?</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.workoutButton,
                    pressed && styles.workoutButtonPressed,
                  ]}
                  onPress={handleStartWorkout}
                >
                  <Text style={styles.workoutButtonText}>Start Workout</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Partnership Stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{duo.duoStreak}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>🔥</Text>
                  <Text style={styles.statLabel}>Motivation</Text>
                </View>
              </View>
            </View>

            {duo.status === "active" && (
              <Pressable
                style={({ pressed }) => [
                  styles.endButton,
                  pressed && styles.endButtonPressed,
                ]}
                onPress={handleRequestEnd}
              >
                <Text style={styles.endButtonText}>End Partnership</Text>
              </Pressable>
            )}

            {duo.status === "ending_requested" && (
              <View style={styles.endRequestContainer}>
                {duo.endRequestedBy === user?.uid ? (
                  // Case 1: Current user requested it
                  <>
                    <Text style={styles.waitingText}>
                      Waiting for partner to approve...
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.cancelButton,
                        pressed && styles.cancelButtonPressed,
                      ]}
                      onPress={handleCancelEndRequest}
                    >
                      <Text style={styles.cancelButtonText}>Cancel End Request</Text>
                    </Pressable>
                  </>
                ) : (
                  // Case 2: Partner requested it
                  <>
                    <Text style={styles.endRequestText}>
                      Your partner wants to end the partnership
                    </Text>
                    <View style={styles.buttonRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.approveButton,
                          pressed && styles.approveButtonPressed,
                        ]}
                        onPress={handleApproveEnd}
                      >
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.rejectButton,
                          pressed && styles.rejectButtonPressed,
                        ]}
                        onPress={handleRejectEndRequest}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  partnerTitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  streakBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  streakText: {
    color: DARK_BG,
    fontSize: 11,
    fontWeight: '600',
  },
  partnerName: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  meta: {
    color: MUTED,
    fontSize: 14,
    marginBottom: 20,
  },
  metaValue: {
    color: ACCENT,
  },
  workoutSection: {
    alignItems: 'center',
  },
  workoutTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  workoutButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 200,
  },
  workoutButtonPressed: {
    opacity: 0.8,
  },
  workoutButtonText: {
    color: DARK_BG,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statsTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: MUTED,
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: BORDER,
    marginHorizontal: 20,
  },
  endButton: {
    backgroundColor: DANGER,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 8,
  },
  endButtonPressed: {
    opacity: 0.8,
  },
  endButtonText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  endRequestContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  endRequestText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  approveButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  approveButtonPressed: {
    opacity: 0.8,
  },
  approveButtonText: {
    color: DARK_BG,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingText: {
    color: MUTED,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: DANGER,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 12,
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelButtonText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: DANGER,
  },
  rejectButtonPressed: {
    opacity: 0.8,
  },
  rejectButtonText: {
    color: DANGER,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

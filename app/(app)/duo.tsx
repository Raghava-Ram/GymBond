import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    where,
    type DocumentData
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
};

export default function DuoScreen() {
  const { user } = useAuth();
  const [duo, setDuo] = useState<Duo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!db || !user?.uid) {
      setDuo(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener for current user document to get activeDuoId
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, async (userSnap) => {
      if (!userSnap.exists()) {
        setDuo(null);
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      const activeDuoId = userData?.activeDuoId;

      // If no active duo, show "No bond yet"
      if (!activeDuoId) {
        setDuo(null);
        setLoading(false);
        return;
      }

      // Listen to the duo document
      const duoRef = doc(db!, 'duos', activeDuoId);
      const unsubscribeDuo = onSnapshot(duoRef, async (duoSnap) => {
        if (!duoSnap.exists()) {
          setDuo(null);
          setLoading(false);
          return;
        }

        const duoData = duoSnap.data() as DocumentData;
        
        // Determine partner ID (the other member in the members array)
        const partnerId = duoData.members.find((uid: string) => uid !== user.uid);

        if (!partnerId) {
          console.error('[Duo] Invalid duo members array');
          setDuo(null);
          setLoading(false);
          return;
        }

        // Fetch partner's user details
        const usersRef = collection(db!, 'users');
        const userQuery = query(usersRef, where('__name__', '==', partnerId));
        const userSnapshot = await getDocs(userQuery);

        const partnerData = userSnapshot.docs[0]?.data() as DocumentData;

        const resolvedDuo: Duo = {
          id: duoSnap.id,
          members: duoData.members,
          status: duoData.status,
          duoStreak: duoData.duoStreak || 0,
          lastDuoWorkout: duoData.lastDuoWorkout,
          partnerName: partnerData?.name || 'Unknown',
          partnerAge: partnerData?.age,
          partnerGoal: partnerData?.goal,
          createdAt: duoData.createdAt,
        };

        setDuo(resolvedDuo);
        setLoading(false);
      }, (error) => {
        console.error('[Duo] Error listening to duo:', error);
        setDuo(null);
        setLoading(false);
      });

      return () => {
        unsubscribeDuo();
      };
    }, (error) => {
      console.error('[Duo] Error listening to user:', error);
      setDuo(null);
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
    };
  }, [user]);

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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

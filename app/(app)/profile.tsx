import {
    doc,
    getDoc
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
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

  useEffect(() => {
    fetchProfile();
  }, [user]);

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
        <View style={styles.content}>
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
                  <Text style={styles.age}>Age {profile.age}</Text>
                )}
              </View>
            </View>

            {profile.goal && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fitness Goal</Text>
                <Text style={styles.infoValue}>{profile.goal}</Text>
              </View>
            )}

            {profile.preferredTime && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Preferred Time</Text>
                <Text style={styles.infoValue}>{profile.preferredTime}</Text>
              </View>
            )}

            {profile.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.infoLabel}>Bio</Text>
                <Text style={styles.bio}>{profile.bio}</Text>
              </View>
            )}

            <View style={styles.statsSection}>
              <Text style={styles.infoLabel}>Personal Stats</Text>
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
        </View>
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
});

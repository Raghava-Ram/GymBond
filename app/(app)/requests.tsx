import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
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
const REJECT = '#ef4444';

type BondRequest = {
  id: string;
  from: string;
  fromName: string;
  fromAge?: number;
  fromGoal?: string;
  fromBio?: string;
  createdAt: any;
};

export default function RequestsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BondRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !user?.uid) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener for bondRequests where current user is recipient and status is pending
    const requestsRef = collection(db, 'bondRequests');
    const q = query(
      requestsRef,
      where('to', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Fetch user details for each request
      const requestPromises = snapshot.docs.map(async (docSnap) => {
        const requestData = docSnap.data() as DocumentData;
        const fromUserId = requestData.from as string;

        // Get sender's user details
        const usersRef = collection(db!, 'users');
        const userQuery = query(usersRef, where('__name__', '==', fromUserId));
        const userSnapshot = await getDocs(userQuery);

        const userData = userSnapshot.docs[0]?.data() as DocumentData;

        return {
          id: docSnap.id,
          from: fromUserId,
          fromName: userData?.name || 'Unknown',
          fromAge: userData?.age,
          fromGoal: userData?.goal,
          fromBio: userData?.bio,
          createdAt: requestData.createdAt,
        };
      });

      const resolvedRequests = await Promise.all(requestPromises);
      setRequests(resolvedRequests);
      setLoading(false);
    }, (error) => {
      console.error('[Requests] Error listening to requests:', error);
      setRequests([]);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time listeners will automatically update
    // No manual fetch needed as onSnapshot handles real-time updates
    setRefreshing(false);
  };

  const handleAccept = async (requestId: string, fromUserId: string) => {
    if (!db || !user?.uid) return;

    setProcessing(requestId);

    try {
      // Check if both users are free (no active duo)
      const [currentUserDoc, senderDoc] = await Promise.all([
        getDoc(doc(db!, 'users', user.uid)),
        getDoc(doc(db!, 'users', fromUserId))
      ]);

      const currentUserData = currentUserDoc.data();
      const senderData = senderDoc.data();

      const currentUserActiveDuo = currentUserData?.activeDuoId;
      const senderActiveDuo = senderData?.activeDuoId;

      // If either user already has an active duo, show error
      if (currentUserActiveDuo) {
        Alert.alert('Cannot Accept', 'You already have an active gym duo. End your current partnership first.');
        return;
      }

      if (senderActiveDuo) {
        Alert.alert('Cannot Accept', 'This person already has an active gym duo.');
        return;
      }

      // Both users are free - create new duo and update everything in a batch
      const batch = writeBatch(db!);
      
      // Create new duo document reference
      const duosRef = collection(db!, 'duos');
      const duoDocRef = doc(duosRef);
      
      // Add duo creation to batch
      batch.set(duoDocRef, {
        members: [fromUserId, user.uid],
        status: 'active',
        duoStreak: 0,
        createdAt: serverTimestamp(),
      });

      // Update bond request status to accepted
      const requestRef = doc(db!, 'bondRequests', requestId);
      batch.update(requestRef, {
        status: 'accepted',
      });

      // Update both users with activeDuoId
      batch.update(doc(db!, 'users', user.uid), {
        activeDuoId: duoDocRef.id,
      });
      
      batch.update(doc(db!, 'users', fromUserId), {
        activeDuoId: duoDocRef.id,
      });

      // Commit all operations atomically
      await batch.commit();

      // Remove from local state
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      
      Alert.alert('Success', 'Bond request accepted! You are now gym buddies.');
    } catch (error) {
      console.error('[Requests] Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!db) return;

    setProcessing(requestId);

    try {
      // Update bond request status to rejected
      const requestRef = doc(db!, 'bondRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
      });

      // Remove from local state
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      
      Alert.alert('Request rejected');
    } catch (error) {
      console.error('[Requests] Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const renderItem = ({ item }: { item: BondRequest }) => {
    const isProcessing = processing === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          {item.fromName}
          {item.fromAge ? `, ${item.fromAge}` : ''}
        </Text>
        {item.fromGoal ? (
          <Text style={styles.meta}>
            Goal: <Text style={styles.metaValue}>{item.fromGoal}</Text>
          </Text>
        ) : null}
        {item.fromBio ? <Text style={styles.bio}>{item.fromBio}</Text> : null}

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.rejectButton,
              (pressed || isProcessing) && styles.buttonPressed,
            ]}
            onPress={() => handleReject(item.id)}
            disabled={isProcessing}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.acceptButton,
              (pressed || isProcessing) && styles.buttonPressed,
            ]}
            onPress={() => handleAccept(item.id, item.from)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={DARK_BG} />
            ) : (
              <Text style={styles.acceptButtonText}>Accept</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bond Requests</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pending requests</Text>
          <Text style={styles.emptySubtext}>
            When someone sends you a bond request, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
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
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  name: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    marginTop: 6,
    color: MUTED,
    fontSize: 13,
  },
  metaValue: {
    color: ACCENT,
  },
  bio: {
    marginTop: 10,
    color: TEXT,
    fontSize: 14,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  acceptButton: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  acceptButtonText: {
    color: DARK_BG,
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: REJECT,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  rejectButtonText: {
    color: REJECT,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});

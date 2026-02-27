import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    type DocumentData
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";

const DARK_BG = "#020617";
const CARD_BG = "#020617";
const BORDER = "#1f2937";
const ACCENT = "#22c55e";
const TEXT = "#f9fafb";
const MUTED = "#9ca3af";

type DiscoverUser = {
  id: string;
  name: string;
  age: number;
  goal: string;
  preferredTime: string;
  bio: string;
};

function RequestsSection() {
  return (
    <View style={styles.requestsContainer}>
      <Text style={styles.sectionTitle}>Bond Requests</Text>
      <Text style={styles.emptyText}>No pending requests</Text>
      <Text style={styles.subText}>
        When someone sends you a bond request, it will appear here.
      </Text>
    </View>
  );
}

function useDiscoverUsers() {
  const { logout, user } = useAuth();
  const [members, setMembers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDuoId, setActiveDuoId] = useState<string | null>(null);
  const [pendingOutgoing, setPendingOutgoing] = useState<string[]>([]);
  const [sendingFor, setSendingFor] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !user?.uid) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener for users collection
    const usersRef = collection(db, "users");
    const usersQuery = query(
      usersRef,
      where("__name__", "!=", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const items: DiscoverUser[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as DocumentData;
        return {
          id: docSnap.id,
          name: data.name || "Unknown",
          age: data.age || 0,
          goal: data.goal || "",
          preferredTime: data.preferredTime || "",
          bio: data.bio || "",
        };
      });
      setMembers(items);
      setLoading(false);
    });

    // Real-time listener for current user's activeDuoId
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setActiveDuoId(data?.activeDuoId || null);
    });

    // Real-time listener for outgoing bond requests
    const bondsRef = collection(db, "bondRequests");
    const bondsQuery = query(
      bondsRef,
      where("from", "==", user.uid)
    );

    const unsubscribeBonds = onSnapshot(bondsQuery, (snapshot) => {
      const pendingIds = snapshot.docs
        .filter((docSnap) => docSnap.data().status === "pending")
        .map((docSnap) => docSnap.data().to);
      setPendingOutgoing(pendingIds);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeUser();
      unsubscribeBonds();
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh logic is handled by real-time listeners
    setTimeout(() => setRefreshing(false), 1000);
  };

  const sendBondRequest = async (toUid: string) => {
    if (!db || !user?.uid) return;
    if (sendingFor) return;

    setSendingFor(toUid);

    try {
      const bondsRef = collection(db, "bondRequests");

      const [existingOutgoing, existingIncoming] = await Promise.all([
        getDocs(
          query(
            bondsRef,
            where("from", "==", user.uid),
            where("to", "==", toUid)
          )
        ),
        getDocs(
          query(
            bondsRef,
            where("from", "==", toUid),
            where("to", "==", user.uid)
          )
        ),
      ]);

      const existingDoc = !existingOutgoing.empty
        ? existingOutgoing.docs[0]
        : !existingIncoming.empty
        ? existingIncoming.docs[0]
        : null;

      if (existingDoc) {
        const existingStatus = existingDoc.data().status;
        if (existingStatus === "pending") {
          return;
        }
      }

      await addDoc(bondsRef, {
        from: user.uid,
        to: toUid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Discover] Error sending bond request", error);
    } finally {
      setSendingFor(null);
    }
  };

  const handleCancelBondRequest = async (toUid: string) => {
    if (!db || !user?.uid) return;

    try {
      const q = query(
        collection(db, "bondRequests"),
        where("from", "==", user.uid),
        where("to", "==", toUid),
        where("status", "==", "pending")
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        await updateDoc(doc(db, "bondRequests", docSnap.id), {
          status: "cancelled",
        });
      });
    } catch (error) {
      console.error("Cancel error:", error);
    }
  };

  const renderItem = ({ item }: { item: DiscoverUser }) => {
    const isBonded = !!activeDuoId;
    const isPending = pendingOutgoing.includes(item.id);
    const isSending = sendingFor === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.name}>
          {item.name}
          {item.age ? `, ${item.age}` : ""}
        </Text>
        {item.goal ? (
          <Text style={styles.meta}>
            Goal: <Text style={styles.metaValue}>{item.goal}</Text>
          </Text>
        ) : null}
        {item.preferredTime ? (
          <Text style={styles.meta}>
            Prefers:{" "}
            <Text style={styles.metaValue}>{item.preferredTime}</Text>
          </Text>
        ) : null}
        {item.bio ? <Text style={styles.bio}>{item.bio}</Text> : null}
        <View style={styles.actionsRow}>
          {isBonded ? (
            <Text style={styles.bondedText}>Already Bonded</Text>
          ) : isPending ? (
            <Pressable
              style={styles.cancelRequestButton}
              onPress={() => handleCancelBondRequest(item.id)}
            >
              <Text style={styles.cancelRequestText}> Cancel Request </Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.requestButton,
                pressed && styles.requestButtonPressed,
              ]}
              onPress={() => sendBondRequest(item.id)}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <Text style={styles.requestButtonText}>
                  Send Bond Request
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return {
    users: members,
    loading,
    refreshing,
    renderItem,
    onRefresh,
  };
}

export default function PeopleScreen() {
  const { users, loading, renderItem, onRefresh } = useDiscoverUsers();

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ padding: 20 }}>
            <Text style={styles.mainTitle}>People</Text>
            <View style={{ marginTop: 24 }}>
              <RequestsSection />
            </View>
            <Text style={{ color: TEXT, fontSize: 20, marginTop: 32 }}>
              Discover
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: TEXT,
  },
  requestsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: TEXT,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT,
  },
  subText: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT,
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 4,
  },
  metaValue: {
    color: TEXT,
    fontWeight: "500",
  },
  bio: {
    fontSize: 14,
    color: TEXT,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  requestButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: "center",
  },
  requestButtonPressed: {
    opacity: 0.7,
  },
  requestButtonText: {
    color: DARK_BG,
    fontWeight: "600",
    fontSize: 16,
  },
  cancelRequestButton: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: "center",
  },
  cancelRequestText: {
    color: TEXT,
    fontWeight: "600",
    fontSize: 16,
  },
  bondedText: {
    color: MUTED,
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
});

import { StatusBar } from "expo-status-bar";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";

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


export default function DiscoverScreen() {
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
      setActiveDuoId(null);
      setPendingOutgoing([]);
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
          name: data.name ?? "Unknown",
          age: typeof data.age === "number" ? data.age : 0,
          goal: data.goal ?? "",
          preferredTime: data.preferredTime ?? "",
          bio: data.bio ?? "",
        };
      });

      setMembers(items);
      setLoading(false);
    }, (error) => {
      console.error("[Discover] Error listening to users:", error);
      setMembers([]);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
    };
  }, [user]);

  useEffect(() => {
    if (!db || !user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      setActiveDuoId(data?.activeDuoId ?? null);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!db || !user?.uid) return;

    const q = query(
      collection(db, "bondRequests"),
      where("from", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map((doc) => doc.data().to);
      setPendingOutgoing(ids);
    });

    return unsubscribe;
  }, [user]);


  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time listeners will automatically update
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
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
        return;
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
            <Text style={styles.pendingText}>Request Pending</Text>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.requestButton,
                (pressed || isSending) && styles.requestButtonPressed,
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Finding gym members...</Text>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No gym members yet</Text>
          <Text style={styles.emptySubtext}>
            Invite friends to join GymBond and build your crew.
          </Text>
        </View>
      ) : (
        <FlatList
          data={members}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: TEXT,
  },
  logoutButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutText: {
    color: MUTED,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: TEXT,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    marginTop: 8,
    color: MUTED,
    textAlign: "center",
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
    fontWeight: "600",
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
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  requestButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  requestButtonPressed: {
    opacity: 0.85,
  },
  requestButtonText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "600",
  },
  pendingText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "500",
  },
  bondedText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
});


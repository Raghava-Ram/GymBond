import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
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

type BondRequest = {
  id: string;
  from: string;
  to: string;
  status: string;
  createdAt: any;
  senderInfo?: DiscoverUser;
};

function RequestsSection({
  incomingRequests,
  onAccept,
  onDecline,
  processingId,
}: {
  incomingRequests: BondRequest[];
  onAccept: (req: BondRequest) => void;
  onDecline: (id: string) => void;
  processingId: string | null;
}) {
  return (
    <View style={styles.requestsContainer}>
      <Text style={styles.sectionTitle}>Bond Requests</Text>
      
      {incomingRequests.length === 0 ? (
        <>
          <Text style={styles.emptyText}>No pending requests</Text>
          <Text style={styles.subText}>
            When someone sends you a bond request, it will appear here.
          </Text>
        </>
      ) : (
        incomingRequests.map((req) => (
          <View key={req.id} style={styles.requestCard}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>
                {req.senderInfo?.name || "Unknown User"}
              </Text>
              {req.senderInfo?.goal && (
                <Text style={styles.requestMeta}>Goal: {req.senderInfo.goal}</Text>
              )}
            </View>
            <View style={styles.requestActions}>
              <Pressable
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => onDecline(req.id)}
                disabled={processingId === req.id}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => onAccept(req)}
                disabled={processingId === req.id}
              >
                {processingId === req.id ? (
                  <ActivityIndicator size="small" color={DARK_BG} />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept</Text>
                )}
              </Pressable>
            </View>
          </View>
        ))
      )}
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
  const [incomingRequests, setIncomingRequests] = useState<BondRequest[]>([]);
  const [sendingFor, setSendingFor] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

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

    // Real-time listener for incoming AND outgoing bond requests
    const bondsRef = collection(db, "bondRequests");
    
    // Outgoing requests
    const outgoingQuery = query(
      bondsRef,
      where("from", "==", user.uid)
    );

    const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const pendingIds = snapshot.docs
        .filter((docSnap) => docSnap.data().status === "pending")
        .map((docSnap) => docSnap.data().to);
      setPendingOutgoing(pendingIds);
    });

    // Incoming requests
    const incomingQuery = query(
      bondsRef,
      where("to", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribeIncoming = onSnapshot(incomingQuery, async (snapshot) => {
      const requests: BondRequest[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const req: BondRequest = {
          id: docSnap.id,
          from: data.from,
          to: data.to,
          status: data.status,
          createdAt: data.createdAt,
        };

        // Fetch sender details
        try {
          const senderDoc = await getDoc(doc(db, "users", data.from));
          if (senderDoc.exists()) {
            const senderData = senderDoc.data();
            req.senderInfo = {
               id: senderDoc.id,
               name: senderData.name,
               age: senderData.age,
               goal: senderData.goal,
               preferredTime: senderData.preferredTime,
               bio: senderData.bio,
            };
          }
        } catch (err) {
          console.error("Failed to fetch sender info", err);
        }
        requests.push(req);
      }
      
      // Sort manually since we might not have a composite index for this query yet
      requests.sort((a, b) => {
         const timeA = a.createdAt?.toMillis() || 0;
         const timeB = b.createdAt?.toMillis() || 0;
         return timeB - timeA;
      });
      
      setIncomingRequests(requests);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeUser();
      unsubscribeOutgoing();
      unsubscribeIncoming();
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

  const handleAcceptRequest = async (request: BondRequest) => {
    if (!db || !user?.uid) return;
    setProcessingRequestId(request.id);

    try {
      const batch = writeBatch(db);
      
      // 1. Update the request status
      const requestRef = doc(db, "bondRequests", request.id);
      batch.update(requestRef, { status: "accepted" });

      // 2. Create the Duo document
      const duoRef = doc(collection(db, "duos"));
      batch.set(duoRef, {
        members: [request.from, request.to],
        status: "active",
        duoStreak: 0,
        createdAt: serverTimestamp(),
      });

      // 3. Update activeDuoId for both users
      const currentUserRef = doc(db, "users", user.uid);
      const senderRef = doc(db, "users", request.from);
      
      batch.update(currentUserRef, { activeDuoId: duoRef.id });
      batch.update(senderRef, { activeDuoId: duoRef.id });

      await batch.commit();

    } catch (error) {
      console.error("Failed to accept bond request", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!db) return;
    setProcessingRequestId(requestId);
    try {
      await updateDoc(doc(db, "bondRequests", requestId), {
        status: "declined",
      });
    } catch (error) {
      console.error("Failed to decline request", error);
    } finally {
      setProcessingRequestId(null);
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
    incomingRequests,
    loading,
    refreshing,
    processingRequestId,
    renderItem,
    onRefresh,
    handleAcceptRequest,
    handleDeclineRequest,
  };
}

export default function PeopleScreen() {
  const { 
    users, 
    incomingRequests,
    loading, 
    processingRequestId,
    renderItem, 
    onRefresh,
    handleAcceptRequest,
    handleDeclineRequest
  } = useDiscoverUsers();

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
              <RequestsSection 
                 incomingRequests={incomingRequests}
                 onAccept={handleAcceptRequest}
                 onDecline={handleDeclineRequest}
                 processingId={processingRequestId}
              />
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
  requestCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
    marginBottom: 4,
  },
  requestMeta: {
    fontSize: 13,
    color: MUTED,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtn: {
    backgroundColor: ACCENT,
  },
  acceptBtnText: {
    color: DARK_BG,
    fontWeight: "600",
    fontSize: 14,
  },
  declineBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: BORDER,
  },
  declineBtnText: {
    color: TEXT,
    fontWeight: "600",
    fontSize: 14,
  },
});

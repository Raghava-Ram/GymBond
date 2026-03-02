import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../components/AuthProvider";

function AuthGate() {
  const { user, loading, hasProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/(auth)/login");
    } else if (!hasProfile) {
      // still need to fill out profile before entering the app
      router.replace("/(app)/profile/create");
    } else {
      router.replace("/(app)/today");
    }
  }, [user, loading, hasProfile]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

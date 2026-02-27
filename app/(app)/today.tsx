import { SafeAreaView, Text, View, StyleSheet } from "react-native";
import { useAuth } from "../../components/AuthProvider";

const DARK_BG = "#020617";
const TEXT = "#f9fafb";
const ACCENT = "#22c55e";

export default function TodayScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 20 }}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.subtitle}>
          Your workout plan for today will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: TEXT,
  },
  subtitle: {
    marginTop: 8,
    color: ACCENT,
  },
});

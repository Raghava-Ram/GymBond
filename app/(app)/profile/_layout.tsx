import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="edit"
        options={{
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          animationEnabled: true,
        }}
      />
    </Stack>
  );
}

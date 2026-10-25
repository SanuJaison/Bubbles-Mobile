import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="chat/[chatId]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="new-chat"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="feedback"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ animation: "slide_from_right" }}
      />
    </Stack>
  );
}

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ChatsProvider } from "../context/ChatsContext";
import { SocketProvider } from "../context/SocketContext";
import { ToastProvider } from "../context/ToastContext";
import { ThemeProvider, useTheme } from "../theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
};

const SplashController = () => {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  return null;
};

const RootNavigator = () => {
  const { token, user, loading } = useAuth();

  if (loading) return null;

  const signedIn = Boolean(token && user);

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="verify-email" />
      </Stack.Protected>

      <Stack.Screen name="+not-found" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ChatsProvider>
              <ToastProvider>
                <ThemedStatusBar />
                <SplashController />
                <RootNavigator />
              </ToastProvider>
            </ChatsProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

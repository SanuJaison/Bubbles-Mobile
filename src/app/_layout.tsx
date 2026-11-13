import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BackgroundServiceBridge } from "../components/BackgroundServiceBridge";
import { CallOverlay } from "../components/CallOverlay";
import { LoadingScreen } from "../components/LoadingScreen";
import { NotificationBridge } from "../components/NotificationBridge";
import { UpdateGate } from "../components/UpdateGate";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { CallProvider } from "../context/CallContext";
import { ChatPrefsProvider } from "../context/ChatPrefsContext";
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

  if (loading) return <LoadingScreen />;

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
          <ChatPrefsProvider>
            <SocketProvider>
              <ChatsProvider>
                <ToastProvider>
                  <CallProvider>
                    <ThemedStatusBar />
                    <SplashController />
                    <NotificationBridge />
                    <BackgroundServiceBridge />
                    <RootNavigator />
                    <CallOverlay />
                    <UpdateGate />
                  </CallProvider>
                </ToastProvider>
              </ChatsProvider>
            </SocketProvider>
          </ChatPrefsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

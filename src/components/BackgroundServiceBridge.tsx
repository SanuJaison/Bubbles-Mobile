import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  startBackgroundService,
  stopBackgroundService,
} from "../lib/backgroundService";

/**
 * Keeps the socket alive while the app is minimized. Android freezes cached
 * apps, which silently kills the Socket.IO connection — and without FCM there
 * is no other way to learn about a new message. A low-importance foreground
 * service is the supported way to stay reachable.
 */
export const BackgroundServiceBridge = () => {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      stopBackgroundService();
      return;
    }

    // Start after the first frame so Android does not see this as a background
    // start (which is restricted on Android 12+).
    const timer = setTimeout(() => {
      startBackgroundService();
    }, 1500);

    return () => clearTimeout(timer);
  }, [token]);

  return null;
};

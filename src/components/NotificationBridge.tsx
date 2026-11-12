import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { prepareNotifications } from "../lib/notifications";

/**
 * Asks for the notification permission once the first screen is on-screen and
 * opens the right chat when a message notification is tapped.
 */
export const NotificationBridge = () => {
  const { token } = useAuth();
  const handled = useRef<string | null>(null);
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!token) return;

    // Give the first frame time to paint so the system prompt does not fight
    // with the screen transition.
    const timer = setTimeout(() => {
      void prepareNotifications();
    }, 900);

    return () => clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    if (!response) return;

    const identifier = response.notification.request.identifier;
    if (handled.current === identifier) return;

    handled.current = identifier;

    const chatId = response.notification.request.content.data?.chatId;

    if (typeof chatId === "string" && chatId) {
      router.push({ pathname: "/chat/[chatId]", params: { chatId } });
    }

    void Notifications.clearLastNotificationResponseAsync();
  }, [response]);

  return null;
};

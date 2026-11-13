import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import {
  openNotificationSettings,
  prepareNotifications,
} from "../lib/notifications";

/**
 * Asks for the notification permission once the first screen is on-screen,
 * nudges the user to the system settings when alerts are blocked, and opens the
 * right chat when a message notification is tapped.
 */
export const NotificationBridge = () => {
  const { token, user } = useAuth();
  const handled = useRef<string | null>(null);
  const checked = useRef(false);
  const response = Notifications.useLastNotificationResponse();
  const [settingsPrompt, setSettingsPrompt] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Give the first frame time to paint so the system prompt does not fight
    // with the screen transition.
    const timer = setTimeout(async () => {
      const enabled = await prepareNotifications();

      // Android silently drops every alert when notifications are off, so tell
      // the user instead of letting messages disappear without a trace.
      if (
        !enabled &&
        !checked.current &&
        user?.messageNotifications !== false
      ) {
        checked.current = true;
        setSettingsPrompt(true);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [token, user?.messageNotifications]);

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

  return (
    <ConfirmDialog
      visible={settingsPrompt}
      title="Turn on notifications"
      message="Message alerts are turned off for Bubbles, so new messages will not show up in your notification bar. Enable them in Android settings so you never miss a chat."
      confirmLabel="Open settings"
      cancelLabel="Not now"
      onConfirm={() => {
        setSettingsPrompt(false);
        void openNotificationSettings();
      }}
      onCancel={() => setSettingsPrompt(false)}
    />
  );
};

/* eslint-disable import/namespace -- the import resolver cannot see the enums
   that expo-notifications re-exports from its *.types modules */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import type { Message } from "../types";

export const MESSAGE_CHANNEL_ID = "messages";

const PROMPTED_KEY = "bubblesNotificationsPrompted";

// The app schedules its own local notifications, so nothing should pop up
// while the user is already looking at the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady: Promise<void> | null = null;

const ensureChannel = () => {
  if (Platform.OS !== "android") return Promise.resolve();

  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(
      MESSAGE_CHANNEL_ID,
      {
        name: "Messages",
        description: "New message alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 220, 160, 220],
        lightColor: "#A855F7",
        sound: "default",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PRIVATE,
        showBadge: true,
      }
    )
      .then(() => undefined)
      .catch(() => {
        channelReady = null;
      });
  }

  return channelReady;
};

const granted = (permission: Notifications.NotificationPermissionsStatus) =>
  permission.granted ||
  permission.ios?.status ===
    Notifications.IosAuthorizationStatus.PROVISIONAL;

/**
 * Creates the Android channel and asks for the notification permission once.
 * Android 13+ only shows the system prompt after a channel exists, so the
 * channel has to be created first.
 */
export const prepareNotifications = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;

  try {
    await ensureChannel();

    const current = await Notifications.getPermissionsAsync();
    if (granted(current)) return true;
    if (!current.canAskAgain) return false;

    const alreadyAsked = await AsyncStorage.getItem(PROMPTED_KEY);
    if (alreadyAsked === "1") return false;

    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });

    await AsyncStorage.setItem(PROMPTED_KEY, "1");

    return granted(requested);
  } catch {
    return false;
  }
};

export const notificationsEnabled = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;

  try {
    return granted(await Notifications.getPermissionsAsync());
  } catch {
    return false;
  }
};

const previewFor = (message: Message) => {
  if (message.isDeleted) return "This message was deleted";
  if (message.text?.trim()) return message.text.trim();

  switch (message.messageType) {
    case "image":
      return "Photo";
    case "file":
      return message.files?.[0]?.name
        ? `Document: ${message.files[0].name}`
        : "Document";
    case "audio":
      return "Voice message";
    case "call":
      return "Call";
    default:
      return "New message";
  }
};

type NotifyMessageInput = {
  chatId: string;
  chatTitle: string;
  isGroup: boolean;
  senderName: string;
  message: Message;
  sound: boolean;
};

/**
 * Shows a local notification for a message that arrived while the app is in
 * the background. Messages for the chat on screen and messages you sent are
 * filtered out by the caller.
 */
export const notifyIncomingMessage = async ({
  chatId,
  chatTitle,
  isGroup,
  senderName,
  message,
  sound,
}: NotifyMessageInput) => {
  if (Platform.OS === "web") return;
  if (AppState.currentState === "active") return;

  try {
    await ensureChannel();

    if (!(await notificationsEnabled())) return;

    const preview = previewFor(message);
    const body = isGroup && senderName ? `${senderName}: ${preview}` : preview;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: chatTitle,
        body,
        sound: sound ? "default" : undefined,
        data: { chatId, url: `/chat/${chatId}` },
        ...(Platform.OS === "android" ? { color: "#A855F7" } : {}),
      },
      // `null` posts the notification right away. A time-interval trigger goes
      // through AlarmManager, which Android 12+ throttles (or drops) unless the
      // app holds the exact-alarm permission — that was why alerts never made
      // it to the notification bar.
      trigger: null,
    });
  } catch {
    // Notifications are best effort — never break message delivery over them.
  }
};

export const clearMessageNotifications = async (chatId?: string) => {
  if (Platform.OS === "web") return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    await Promise.all(
      scheduled
        .filter(
          (item) =>
            !chatId || String(item.content.data?.chatId || "") === chatId
        )
        .map((item) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier)
        )
    );

    // Dismiss only our message notifications. `dismissAllNotificationsAsync`
    // calls NotificationManager.cancelAll(), which would also wipe the
    // foreground-service notification that keeps the socket alive.
    const presented = await Notifications.getPresentedNotificationsAsync();

    await Promise.all(
      presented
        .filter(
          (item) =>
            !chatId || String(item.request.content.data?.chatId || "") === chatId
        )
        .map((item) =>
          Notifications.dismissNotificationAsync(item.request.identifier)
        )
    );
  } catch {
    // Ignore — clearing is cosmetic.
  }
};

/**
 * Opens the system screen where notifications for Bubbles can be re-enabled.
 * Android 13+ silently drops every notification when the permission is off, and
 * once it has been denied twice the app can no longer show the prompt itself.
 */
export const openNotificationSettings = async () => {
  if (Platform.OS !== "android") return;

  const packageName =
    Constants.expoConfig?.android?.package || "com.bubbles.chat";

  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
      {
        extra: { "android.provider.extra.APP_PACKAGE": packageName },
      }
    );
  } catch {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
        { data: `package:${packageName}` }
      );
    } catch {
      // Nothing else we can do — the user can still use Android settings.
    }
  }
};

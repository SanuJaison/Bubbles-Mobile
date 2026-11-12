/* eslint-disable import/namespace -- the import resolver cannot see the enums
   that expo-notifications re-exports from its *.types modules */
import AsyncStorage from "@react-native-async-storage/async-storage";
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
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: MESSAGE_CHANNEL_ID,
      },
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

    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Ignore — clearing is cosmetic.
  }
};

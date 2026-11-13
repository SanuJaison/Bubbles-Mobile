import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

type BubblesBackgroundNativeModule = {
  start: (title: string, text: string) => boolean;
  stop: () => boolean;
};

// Local Expo module (`modules/bubbles-background`). Optional so the app keeps
// working on iOS/web and in builds where the module was not linked.
const nativeModule =
  Platform.OS === "android"
    ? requireOptionalNativeModule<BubblesBackgroundNativeModule>(
        "BubblesBackground"
      )
    : null;

export const isBackgroundServiceAvailable = Boolean(nativeModule);

/**
 * Starts the Android foreground service that keeps the app process (and the
 * chat socket) alive while Bubbles is minimized, so new messages still arrive
 * and can raise a notification without FCM.
 */
export const startBackgroundService = (
  title = "Bubbles",
  text = "Listening for new messages"
) => {
  try {
    return nativeModule?.start(title, text) ?? false;
  } catch {
    return false;
  }
};

export const stopBackgroundService = () => {
  try {
    return nativeModule?.stop() ?? false;
  } catch {
    return false;
  }
};

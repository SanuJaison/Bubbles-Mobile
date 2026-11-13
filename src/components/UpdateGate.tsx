import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  checkForUpdate,
  currentVersion,
  downloadAndInstallUpdate,
  onUpdateCheckRequested,
  snoozeUpdate,
  type AvailableUpdate,
} from "../lib/appUpdate";
import { useToast } from "../context/ToastContext";
import { openExternalUrl } from "../utils/links";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Checks GitHub for a newer APK shortly after launch, again when the app comes
 * back to the foreground, and on demand from Profile → Check for updates.
 * Sideloaded builds cannot self-update, but Android's package installer can
 * replace the app in place when the signing key matches.
 */
export const UpdateGate = () => {
  const { showToast } = useToast();
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mirrors `update` so the background checks can skip without re-subscribing.
  const pending = useRef<AvailableUpdate | null>(null);

  const applyUpdate = useCallback((next: AvailableUpdate | null) => {
    pending.current = next;
    setUpdate(next);
  }, []);

  const runCheck = useCallback(
    async (force: boolean) => {
      // A prompt is already on screen (or the installer is running).
      if (!force && pending.current) return;

      const found = await checkForUpdate(force).catch(() => null);

      if (found) {
        applyUpdate(found);
        return;
      }

      if (force) {
        showToast(
          `You are on the latest version of Bubbles (${currentVersion()}).`,
          "success"
        );
      }
    },
    [applyUpdate, showToast]
  );

  useEffect(() => {
    // Let the app settle first so the prompt does not fight with login or the
    // chat list loading.
    const timer = setTimeout(() => {
      void runCheck(false);
    }, 2500);

    // Coming back from the background is the other moment the user expects a
    // fresh answer, and it costs nothing thanks to the throttle.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void runCheck(false);
    });

    const unsubscribe = onUpdateCheckRequested(() => {
      void runCheck(true);
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
      unsubscribe();
    };
  }, [runCheck]);

  const handleInstall = async () => {
    if (!update) return;

    setDownloading(true);
    setProgress(0);

    try {
      await downloadAndInstallUpdate(update, setProgress);
      applyUpdate(null);
    } catch {
      showToast(
        "Could not start the installer. Opening the download page instead.",
        "error"
      );
      void openExternalUrl(update.url).catch(() => {});
      applyUpdate(null);
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  const percent = Math.round(progress * 100);

  return (
    <ConfirmDialog
      visible={Boolean(update)}
      title="Update available"
      message={
        downloading
          ? `Downloading Bubbles ${update?.version}… ${percent}%\n\nKeep the app open until the installer appears.`
          : `Bubbles ${update?.version} is ready to install. You are on ${currentVersion()}.\n\nYour chats and settings stay exactly as they are. Android will ask you to allow installs from Bubbles the first time.`
      }
      confirmLabel={downloading ? "Downloading…" : "Update now"}
      cancelLabel="Later"
      loading={downloading}
      onConfirm={handleInstall}
      onCancel={() => {
        if (downloading) return;

        if (update) void snoozeUpdate(update.version);
        applyUpdate(null);
      }}
    />
  );
};

import { useEffect, useState } from "react";
import {
  checkForUpdate,
  currentVersion,
  downloadAndInstallUpdate,
  type AvailableUpdate,
} from "../lib/appUpdate";
import { useToast } from "../context/ToastContext";
import { openExternalUrl } from "../utils/links";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Checks GitHub for a newer APK shortly after launch and offers a one-tap
 * install. Sideloaded builds cannot self-update, but Android's package
 * installer can replace the app in place when the signing key matches.
 */
export const UpdateGate = () => {
  const { showToast } = useToast();
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let active = true;

    // Let the app settle first so the prompt does not fight with login or the
    // chat list loading.
    const timer = setTimeout(() => {
      checkForUpdate()
        .then((found) => {
          if (active && found) setUpdate(found);
        })
        .catch(() => {});
    }, 2500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!update) return;

    setDownloading(true);
    setProgress(0);

    try {
      await downloadAndInstallUpdate(update, setProgress);
      setUpdate(null);
    } catch {
      showToast(
        "Could not start the installer. Opening the download page instead.",
        "error"
      );
      void openExternalUrl(update.url).catch(() => {});
      setUpdate(null);
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
        if (!downloading) setUpdate(null);
      }}
    />
  );
};

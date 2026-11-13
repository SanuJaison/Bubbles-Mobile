import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

const RELEASE_API =
  "https://api.github.com/repos/SanuJaison/Bubbles-Mobile/releases/latest";

export const UPDATE_FALLBACK_URL =
  "https://github.com/SanuJaison/Bubbles-Mobile/releases/latest/download/Bubbles.apk";

const LAST_CHECK_KEY = "bubblesUpdateCheckedAt";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type AvailableUpdate = {
  version: string;
  notes: string;
  url: string;
};

const parseVersion = (value: string) =>
  value
    .replace(/^android-/i, "")
    .replace(/^v/i, "")
    .split(".")
    .map((part) => parseInt(part, 10) || 0);

/** Returns 1 when `first` is newer, -1 when older and 0 when equal. */
export const compareVersions = (first: string, second: string) => {
  const left = parseVersion(first);
  const right = parseVersion(second);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);

    if (difference !== 0) return difference > 0 ? 1 : -1;
  }

  return 0;
};

export const currentVersion = () =>
  String(Constants.expoConfig?.version || "0.0.0");

export const checkForUpdate = async (
  force = false
): Promise<AvailableUpdate | null> => {
  if (Platform.OS !== "android") return null;

  if (!force) {
    const lastCheck = Number(await AsyncStorage.getItem(LAST_CHECK_KEY)) || 0;

    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return null;
  }

  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) return null;

    const release = await response.json();
    const tag = String(release?.tag_name || "");

    if (!tag) return null;

    // Only remember a successful check, so being offline does not silence the
    // prompt for six hours.
    await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(
      () => {}
    );

    const version = tag.replace(/^android-/i, "").replace(/^v/i, "");

    if (compareVersions(version, currentVersion()) <= 0) return null;

    const assets = Array.isArray(release?.assets) ? release.assets : [];
    const apk = assets.find((asset: any) =>
      String(asset?.name || "")
        .toLowerCase()
        .endsWith(".apk")
    );

    return {
      version,
      notes: String(release?.body || "").trim(),
      url: apk?.browser_download_url || UPDATE_FALLBACK_URL,
    };
  } catch {
    return null;
  }
};

/**
 * Downloads the APK and hands it to Android's package installer. The app is
 * signed with the same key for every release, so this replaces the installed
 * copy in place and keeps all local data.
 */
export const downloadAndInstallUpdate = async (
  update: AvailableUpdate,
  onProgress?: (ratio: number) => void
) => {
  if (Platform.OS !== "android") {
    throw new Error("Updates are only supported on Android.");
  }

  const cacheDirectory = FileSystem.cacheDirectory;

  if (!cacheDirectory) {
    throw new Error("No cache directory available for the update.");
  }

  const target = `${cacheDirectory}bubbles-update-${update.version}.apk`;

  await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});

  const download = FileSystem.createDownloadResumable(
    update.url,
    target,
    {},
    (progress) => {
      const total = progress.totalBytesExpectedToWrite || 0;

      if (total > 0) onProgress?.(progress.totalBytesWritten / total);
    }
  );

  const result = await download.downloadAsync();

  if (!result?.uri) {
    throw new Error("The update could not be downloaded.");
  }

  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    type: "application/vnd.android.package-archive",
    // FLAG_GRANT_READ_URI_PERMISSION so the installer can read our cache file.
    flags: 1,
  });
};

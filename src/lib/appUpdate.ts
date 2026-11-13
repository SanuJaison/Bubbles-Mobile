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
const CACHED_UPDATE_KEY = "bubblesUpdateAvailable";
const SNOOZE_KEY = "bubblesUpdateSnoozedUntil";

// Short enough that a release published today is offered the next time the app
// is opened, long enough to stay well inside GitHub's anonymous rate limit.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// "Later" is honoured for a while, but the user is reminded the same day.
const SNOOZE_MS = 12 * 60 * 60 * 1000;

export type AvailableUpdate = {
  version: string;
  notes: string;
  url: string;
  size?: number;
};

const readJson = async <T,>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
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

/**
 * Fetches the newest release. `null` means GitHub answered and there is nothing
 * newer, `undefined` means the request failed and the cached answer should be
 * kept instead.
 */
const fetchLatestRelease = async (): Promise<
  AvailableUpdate | null | undefined
> => {
  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) return undefined;

    const release = await response.json();
    const tag = String(release?.tag_name || "");

    if (!tag) return undefined;

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
      size: typeof apk?.size === "number" ? apk.size : undefined,
    };
  } catch {
    return undefined;
  }
};

/**
 * Looks for a newer APK. The last successful answer is cached, so a known
 * update is still offered when the phone is offline, and a release published
 * minutes ago is picked up on the next launch instead of hours later.
 */
export const checkForUpdate = async (
  force = false
): Promise<AvailableUpdate | null> => {
  if (Platform.OS !== "android") return null;

  const lastCheck = Number(await AsyncStorage.getItem(LAST_CHECK_KEY)) || 0;
  const stale = Date.now() - lastCheck >= CHECK_INTERVAL_MS;

  let update = await readJson<AvailableUpdate>(CACHED_UPDATE_KEY);

  if (force || stale) {
    const fetched = await fetchLatestRelease();

    if (fetched !== undefined) {
      update = fetched;

      // Only remember a successful check, so being offline does not silence
      // the prompt.
      await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(
        () => {}
      );

      if (fetched) {
        await AsyncStorage.setItem(
          CACHED_UPDATE_KEY,
          JSON.stringify(fetched)
        ).catch(() => {});
      } else {
        await AsyncStorage.removeItem(CACHED_UPDATE_KEY).catch(() => {});
      }
    }
  }

  if (!update) return null;
  if (compareVersions(update.version, currentVersion()) <= 0) return null;

  if (!force) {
    const snoozed = await readJson<{ version: string; until: number }>(
      SNOOZE_KEY
    );

    if (
      snoozed &&
      snoozed.version === update.version &&
      Number(snoozed.until) > Date.now()
    ) {
      return null;
    }
  }

  return update;
};

/** Hides the prompt for this version for a while ("Later"). */
export const snoozeUpdate = async (version: string) => {
  try {
    await AsyncStorage.setItem(
      SNOOZE_KEY,
      JSON.stringify({ version, until: Date.now() + SNOOZE_MS })
    );
  } catch {
    // Best effort — worst case the prompt shows again next launch.
  }
};

type UpdateCheckListener = () => void;

const checkListeners = new Set<UpdateCheckListener>();

/**
 * Lets another screen (Profile → Check for updates) ask the update gate to run
 * a check, so the prompt and the manual button share one code path.
 */
export const onUpdateCheckRequested = (listener: UpdateCheckListener) => {
  checkListeners.add(listener);

  return () => {
    checkListeners.delete(listener);
  };
};

export const requestUpdateCheck = () => {
  checkListeners.forEach((listener) => listener());
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

  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(
      () => {}
    );
    throw new Error(`The update download failed (HTTP ${result.status}).`);
  }

  // A partial APK would only fail later inside Android's installer, so catch a
  // truncated download here and fall back to the browser.
  if (update.size) {
    const info = await FileSystem.getInfoAsync(result.uri);
    const writtenSize = info.exists && "size" in info ? info.size : 0;

    if (writtenSize && Math.abs(writtenSize - update.size) > 1024) {
      await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(
        () => {}
      );
      throw new Error("The update download was incomplete.");
    }
  }

  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    type: "application/vnd.android.package-archive",
    // FLAG_GRANT_READ_URI_PERMISSION so the installer can read our cache file.
    flags: 1,
  });
};

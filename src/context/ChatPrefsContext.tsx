import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_WALLPAPER_VALUE } from "../constants/wallpapers";
import { userIdOf } from "../utils/chat";
import { useAuth } from "./AuthContext";

// The website keeps favourites, pins and mutes in localStorage. The backend
// has no endpoints for them, so the app mirrors that behaviour on-device,
// scoped to the signed-in account. Chat wallpapers are mobile-only and live
// here too: one value per chat id, plus a default for chats without one.
type ChatPrefs = {
  favorites: string[];
  pinned: string[];
  muted: string[];
  archived: string[];
  wallpapers: Record<string, string>;
  defaultWallpaper: string;
};

const EMPTY_PREFS: ChatPrefs = {
  favorites: [],
  pinned: [],
  muted: [],
  archived: [],
  wallpapers: {},
  defaultWallpaper: DEFAULT_WALLPAPER_VALUE,
};

const storageKey = (userId?: string | null) =>
  `bubblesChatPrefs:${userId || "guest"}`;

const normalizeList = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => String(item || "")).filter(Boolean)))
    : [];

const normalizeWallpapers = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(
      ([chatId, wallpaper]) =>
        Boolean(chatId) && typeof wallpaper === "string" && wallpaper.length > 0
    )
    .slice(0, 400);

  return Object.fromEntries(entries) as Record<string, string>;
};

const normalizePrefs = (value: any): ChatPrefs => ({
  favorites: normalizeList(value?.favorites),
  pinned: normalizeList(value?.pinned),
  muted: normalizeList(value?.muted),
  archived: normalizeList(value?.archived),
  wallpapers: normalizeWallpapers(value?.wallpapers),
  defaultWallpaper:
    typeof value?.defaultWallpaper === "string" && value.defaultWallpaper
      ? value.defaultWallpaper
      : DEFAULT_WALLPAPER_VALUE,
});

type ChatPrefsContextValue = ChatPrefs & {
  ready: boolean;
  isFavorite: (chatId?: string | null) => boolean;
  isPinned: (chatId?: string | null) => boolean;
  isMuted: (chatId?: string | null) => boolean;
  isArchived: (chatId?: string | null) => boolean;
  toggleFavorite: (chatId?: string | null) => void;
  togglePinned: (chatId?: string | null) => void;
  toggleMuted: (chatId?: string | null) => void;
  toggleArchived: (chatId?: string | null) => void;
  /** The wallpaper this chat should paint, falling back to the default. */
  wallpaperFor: (chatId?: string | null) => string;
  setWallpaper: (chatId: string | undefined | null, value: string) => void;
  setWallpaperForAll: (value: string) => void;
  setDefaultWallpaper: (value: string) => void;
};

const ChatPrefsContext = createContext<ChatPrefsContextValue | null>(null);

export const ChatPrefsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const currentUserId = userIdOf(user);
  const [prefs, setPrefs] = useState<ChatPrefs>(EMPTY_PREFS);
  const [ready, setReady] = useState(false);
  const loadedFor = useRef<string>("");

  useEffect(() => {
    let active = true;

    if (loadedFor.current === currentUserId) return;

    setReady(false);

    AsyncStorage.getItem(storageKey(currentUserId))
      .then((raw) => {
        if (!active) return;

        if (!raw) {
          setPrefs(EMPTY_PREFS);
          return;
        }

        try {
          setPrefs(normalizePrefs(JSON.parse(raw)));
        } catch {
          setPrefs(EMPTY_PREFS);
        }
      })
      .catch(() => {
        if (active) setPrefs(EMPTY_PREFS);
      })
      .finally(() => {
        if (!active) return;
        loadedFor.current = currentUserId;
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!ready || loadedFor.current !== currentUserId) return;

    AsyncStorage.setItem(storageKey(currentUserId), JSON.stringify(prefs)).catch(
      () => {}
    );
  }, [prefs, ready, currentUserId]);

  const toggle = useCallback(
    (
      key: "favorites" | "pinned" | "muted" | "archived",
      chatId?: string | null
    ) => {
      const id = String(chatId || "");
      if (!id) return;

      setPrefs((previous) => {
        const list = previous[key];
        const next = list.includes(id)
          ? list.filter((item) => item !== id)
          : [...list, id];

        return { ...previous, [key]: next };
      });
    },
    []
  );

  const setWallpaper = useCallback(
    (chatId: string | undefined | null, value: string) => {
      const id = String(chatId || "");
      if (!id) return;

      setPrefs((previous) => {
        const wallpapers = { ...previous.wallpapers };

        if (!value) {
          delete wallpapers[id];
        } else {
          wallpapers[id] = value;
        }

        return { ...previous, wallpapers };
      });
    },
    []
  );

  const setDefaultWallpaper = useCallback((value: string) => {
    setPrefs((previous) => ({
      ...previous,
      defaultWallpaper: value || DEFAULT_WALLPAPER_VALUE,
    }));
  }, []);

  /** Applies one wallpaper to every chat and drops per-chat overrides. */
  const setWallpaperForAll = useCallback((value: string) => {
    setPrefs((previous) => ({
      ...previous,
      wallpapers: {},
      defaultWallpaper: value || DEFAULT_WALLPAPER_VALUE,
    }));
  }, []);

  const value = useMemo<ChatPrefsContextValue>(() => {
    const includes = (list: string[], chatId?: string | null) =>
      Boolean(chatId) && list.includes(String(chatId));

    return {
      ...prefs,
      ready,
      isFavorite: (chatId) => includes(prefs.favorites, chatId),
      isPinned: (chatId) => includes(prefs.pinned, chatId),
      isMuted: (chatId) => includes(prefs.muted, chatId),
      isArchived: (chatId) => includes(prefs.archived, chatId),
      toggleFavorite: (chatId) => toggle("favorites", chatId),
      togglePinned: (chatId) => toggle("pinned", chatId),
      toggleMuted: (chatId) => toggle("muted", chatId),
      toggleArchived: (chatId) => toggle("archived", chatId),
      wallpaperFor: (chatId) =>
        (chatId ? prefs.wallpapers[String(chatId)] : "") ||
        prefs.defaultWallpaper,
      setWallpaper,
      setWallpaperForAll,
      setDefaultWallpaper,
    };
  }, [
    prefs,
    ready,
    toggle,
    setWallpaper,
    setWallpaperForAll,
    setDefaultWallpaper,
  ]);

  return (
    <ChatPrefsContext.Provider value={value}>
      {children}
    </ChatPrefsContext.Provider>
  );
};

export const useChatPrefs = () => {
  const context = useContext(ChatPrefsContext);

  if (!context) {
    throw new Error("useChatPrefs must be used inside ChatPrefsProvider");
  }

  return context;
};

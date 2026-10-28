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
import { userIdOf } from "../utils/chat";
import { useAuth } from "./AuthContext";

// The website keeps favourites, pins and mutes in localStorage. The backend
// has no endpoints for them, so the app mirrors that behaviour on-device,
// scoped to the signed-in account.
type ChatPrefs = {
  favorites: string[];
  pinned: string[];
  muted: string[];
};

const EMPTY_PREFS: ChatPrefs = { favorites: [], pinned: [], muted: [] };

const storageKey = (userId?: string | null) =>
  `bubblesChatPrefs:${userId || "guest"}`;

const normalizeList = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => String(item || "")).filter(Boolean)))
    : [];

const normalizePrefs = (value: any): ChatPrefs => ({
  favorites: normalizeList(value?.favorites),
  pinned: normalizeList(value?.pinned),
  muted: normalizeList(value?.muted),
});

type ChatPrefsContextValue = ChatPrefs & {
  ready: boolean;
  isFavorite: (chatId?: string | null) => boolean;
  isPinned: (chatId?: string | null) => boolean;
  isMuted: (chatId?: string | null) => boolean;
  toggleFavorite: (chatId?: string | null) => void;
  togglePinned: (chatId?: string | null) => void;
  toggleMuted: (chatId?: string | null) => void;
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
    (key: keyof ChatPrefs, chatId?: string | null) => {
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

  const value = useMemo<ChatPrefsContextValue>(() => {
    const includes = (list: string[], chatId?: string | null) =>
      Boolean(chatId) && list.includes(String(chatId));

    return {
      ...prefs,
      ready,
      isFavorite: (chatId) => includes(prefs.favorites, chatId),
      isPinned: (chatId) => includes(prefs.pinned, chatId),
      isMuted: (chatId) => includes(prefs.muted, chatId),
      toggleFavorite: (chatId) => toggle("favorites", chatId),
      togglePinned: (chatId) => toggle("pinned", chatId),
      toggleMuted: (chatId) => toggle("muted", chatId),
    };
  }, [prefs, ready, toggle]);

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

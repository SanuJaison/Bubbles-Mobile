import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AIHistoryMessage } from "../types";
import { cleanAIText } from "../utils/ai";

const storageKey = (userId?: string | null) =>
  `bubblesAIHistory:${userId || "guest"}`;

const normalizeMessage = (value: any): AIHistoryMessage | null => {
  if (!value || typeof value !== "object") return null;

  const type = value.type === "ai" ? "ai" : value.type === "user" ? "user" : null;
  const text = cleanAIText(String(value.text || ""));

  if (!type || !text) return null;

  const sources = Array.isArray(value.sources)
    ? value.sources
        .filter(
          (source: any) =>
            source &&
            typeof source.title === "string" &&
            typeof source.url === "string"
        )
        .slice(0, 5)
    : [];

  return {
    id: String(value.id || `${type}-${Math.random().toString(36).slice(2)}`),
    type,
    text,
    createdAt: String(value.createdAt || new Date().toISOString()),
    sources,
    showSources: value.showSources === true && sources.length > 0,
    replyToText:
      typeof value.replyToText === "string" && value.replyToText.trim()
        ? cleanAIText(value.replyToText)
        : undefined,
  };
};

export const loadAIHistory = async (
  userId?: string | null
): Promise<AIHistoryMessage[]> => {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeMessage)
      .filter((message): message is AIHistoryMessage => Boolean(message));
  } catch {
    return [];
  }
};

export const saveAIHistory = async (
  userId: string | null | undefined,
  messages: AIHistoryMessage[]
) => {
  try {
    await AsyncStorage.setItem(
      storageKey(userId),
      JSON.stringify(messages.slice(-120))
    );
  } catch {
    // Local AI history is helpful, but the assistant should still work when
    // storage is unavailable.
  }
};

export const clearAIHistory = async (userId?: string | null) => {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // Ignore storage failures.
  }
};

export const getAIHistorySummary = async (userId?: string | null) => {
  const messages = await loadAIHistory(userId);
  const hasConversation = messages.some((message) => message.type === "user");
  const lastMessage = messages[messages.length - 1];

  return {
    hasConversation,
    lastMessage: lastMessage?.text || "",
    lastMessageAt: lastMessage?.createdAt || null,
  };
};

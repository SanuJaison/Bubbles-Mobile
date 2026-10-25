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
import { getMyChatsAPI } from "../api/chats";
import { getErrorMessage } from "../api/client";
import type { Chat, Conversation } from "../types";
import { formatChat, userIdOf } from "../utils/chat";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

type ChatsContextValue = {
  conversations: Conversation[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  refreshChats: (silent?: boolean) => Promise<void>;
  upsertConversation: (chat: Chat) => Conversation | null;
  markChatRead: (chatId: string) => void;
  removeConversation: (chatId: string) => void;
  updatePreview: (
    chatId: string,
    text: string,
    at?: string | null,
    senderName?: string
  ) => void;
};

const ChatsContext = createContext<ChatsContextValue | null>(null);

const sortConversations = (items: Conversation[]) =>
  [...items].sort((first, second) => {
    const firstTime = new Date(first.lastMessageAt || 0).getTime();
    const secondTime = new Date(second.lastMessageAt || 0).getTime();
    return secondTime - firstTime;
  });

export const ChatsProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  const currentUserId = userIdOf(user);
  const currentUserName = user?.name || user?.username || "You";

  const setActiveChatId = useCallback((chatId: string | null) => {
    activeChatIdRef.current = chatId;
    setActiveChatIdState(chatId);
  }, []);

  const refreshChats = useCallback(
    async (silent = false) => {
      if (!token || !currentUserId) {
        setConversations([]);
        setLoading(false);
        return;
      }

      if (!silent) setRefreshing(true);

      try {
        const response = await getMyChatsAPI();
        const rawChats = Array.isArray(response.data?.chats)
          ? response.data.chats
          : [];

        setConversations((previous) => {
          const unreadById = new Map(
            previous.map((conversation) => [conversation.id, conversation.unread])
          );

          const next = rawChats
            .map((chat) => formatChat(chat, currentUserId, currentUserName))
            .map((conversation) => ({
              ...conversation,
              unread: unreadById.get(conversation.id) || 0,
            }));

          return sortConversations(next);
        });
        setError(null);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load your chats."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, currentUserId, currentUserName]
  );

  const upsertConversation = useCallback(
    (chat: Chat) => {
      if (!chat || !currentUserId) return null;

      const formatted = formatChat(chat, currentUserId, currentUserName);

      setConversations((previous) => {
        const existing = previous.find(
          (conversation) => conversation.id === formatted.id
        );

        const merged: Conversation = {
          ...formatted,
          unread: existing?.unread || 0,
          typing: existing?.typing || false,
          online: formatted.online || existing?.online,
        };

        return sortConversations([
          merged,
          ...previous.filter(
            (conversation) => conversation.id !== formatted.id
          ),
        ]);
      });

      return formatted;
    },
    [currentUserId, currentUserName]
  );

  const markChatRead = useCallback((chatId: string) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === chatId
          ? { ...conversation, unread: 0 }
          : conversation
      )
    );
  }, []);

  const removeConversation = useCallback((chatId: string) => {
    setConversations((previous) =>
      previous.filter((conversation) => conversation.id !== chatId)
    );
  }, []);

  const updatePreview = useCallback(
    (
      chatId: string,
      text: string,
      at?: string | null,
      senderName?: string
    ) => {
      setConversations((previous) =>
        sortConversations(
          previous.map((conversation) =>
            conversation.id === chatId
              ? {
                  ...conversation,
                  lastMessage: text || conversation.lastMessage,
                  lastMessageAt:
                    at || new Date().toISOString(),
                  lastMessageSenderName:
                    senderName !== undefined
                      ? senderName
                      : conversation.lastMessageSenderName,
                  unread: 0,
                }
              : conversation
          )
        )
      );
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshChats();
    }, 0);

    return () => clearTimeout(timer);
  }, [refreshChats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      const message = payload?.message;
      const chat = payload?.chat;

      if (!message || !chat || !currentUserId) return;

      const chatId = String(chat._id || message.chat || "");
      if (!chatId) return;

      const senderId = userIdOf(message.sender);
      const isMine = senderId === currentUserId;
      const isActive = activeChatIdRef.current === chatId;

      const formatted = formatChat(chat, currentUserId, currentUserName);

      setConversations((previous) => {
        const existing = previous.find(
          (conversation) => conversation.id === chatId
        );

        const nextUnread = isMine || isActive ? 0 : (existing?.unread || 0) + 1;

        const merged: Conversation = {
          ...formatted,
          unread: nextUnread,
          typing: false,
          online: formatted.online || existing?.online,
        };

        return sortConversations([
          merged,
          ...previous.filter(
            (conversation) => conversation.id !== chatId
          ),
        ]);
      });
    };

    const handleChatsChanged = () => {
      refreshChats(true);
    };

    const handleChatRemoved = ({ chatId }: { chatId?: string } = {}) => {
      if (chatId) removeConversation(String(chatId));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("chatsChanged", handleChatsChanged);
    socket.on("chatRemoved", handleChatRemoved);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("chatsChanged", handleChatsChanged);
      socket.off("chatRemoved", handleChatRemoved);
    };
  }, [
    socket,
    currentUserId,
    currentUserName,
    refreshChats,
    removeConversation,
  ]);

  const value = useMemo<ChatsContextValue>(
    () => ({
      conversations,
      loading,
      refreshing,
      error,
      activeChatId,
      setActiveChatId,
      refreshChats,
      upsertConversation,
      markChatRead,
      removeConversation,
      updatePreview,
    }),
    [
      conversations,
      loading,
      refreshing,
      error,
      activeChatId,
      setActiveChatId,
      refreshChats,
      upsertConversation,
      markChatRead,
      removeConversation,
      updatePreview,
    ]
  );

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
};

export const useChats = () => {
  const value = useContext(ChatsContext);
  if (!value) throw new Error("useChats must be used inside ChatsProvider");
  return value;
};

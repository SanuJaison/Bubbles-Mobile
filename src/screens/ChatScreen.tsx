import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync } from "expo-audio";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clearChatAPI, deleteChatAPI, getChatByIdAPI } from "../api/chats";
import { getErrorMessage } from "../api/client";
import {
  deleteMessageAPI,
  editMessageAPI,
  forwardMessageAPI,
  getChatMessagesAPI,
  markMessagesAsDeliveredAPI,
  markMessagesAsReadAPI,
  sendMessageAPI,
  toggleMessageReactionAPI,
  type PickedFile,
} from "../api/messages";
import { ActionSheet, type ActionSheetOption } from "../components/ActionSheet";
import { Avatar } from "../components/Avatar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmojiPicker } from "../components/EmojiPicker";
import { ForwardModal } from "../components/ForwardModal";
import { InfoDialog } from "../components/InfoDialog";
import { MessageBubble } from "../components/MessageBubble";
import { ProfileSheet } from "../components/ProfileSheet";
import { Screen } from "../components/Screen";
import { CALLS_COMING_SOON } from "../config";
import { useAuth } from "../context/AuthContext";
import { useChats } from "../context/ChatsContext";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useTheme } from "../theme";
import type { Chat, Conversation, Message } from "../types";
import {
  formatChat,
  userIdOf,
  userNameOf,
} from "../utils/chat";
import {
  formatDayLabel,
  formatDuration,
  messagePreview,
  sameMessageDay,
} from "../utils/format";

const firstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const isSameChat = (incoming: unknown, chatId: string) =>
  String(incoming || "") === chatId;

const localId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const REACTION_CHOICES = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { socket } = useSocket();
  const {
    conversations,
    setActiveChatId,
    markChatRead,
    updatePreview,
    upsertConversation,
    removeConversation,
  } = useChats();
  const params = useLocalSearchParams<{ chatId?: string }>();
  const chatId = String(firstParam(params.chatId) || "");

  const currentUserId = userIdOf(user);
  const currentUserName = user?.name || user?.username || "You";
  const contextConversation = conversations.find(
    (conversation) => conversation.id === chatId
  );

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [text, setText] = useState("");
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageMenuOpen, setMessageMenuOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteChatConfirmOpen, setDeleteChatConfirmOpen] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);
  const atBottom = useRef(true);

  const handleVoiceRecorded = useCallback(
    (file: PickedFile) => {
      setPickedFiles([file]);
      showToast("Voice message ready. Tap send.", "success");
    },
    [showToast]
  );

  const handleVoiceError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast]
  );

  const {
    isRecording,
    durationMillis,
    starting: startingRecording,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useVoiceRecorder({
    onRecorded: handleVoiceRecorded,
    onError: handleVoiceError,
  });

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  const activeConversation = conversation || contextConversation || null;

  const loadChat = useCallback(
    async (isRefresh = false) => {
      if (!chatId) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [chatResult, messageResult] = await Promise.allSettled([
          getChatByIdAPI(chatId),
          getChatMessagesAPI(chatId),
        ]);

        if (chatResult.status === "fulfilled") {
          const rawChat: Chat | undefined = chatResult.value.data?.chat;
          if (rawChat) {
            setConversation(
              formatChat(rawChat, currentUserId, currentUserName)
            );
            upsertConversation(rawChat);
          }
        }

        if (messageResult.status === "fulfilled") {
          const nextMessages = Array.isArray(messageResult.value.data?.messages)
            ? messageResult.value.data.messages
            : [];
          setMessages(nextMessages);
        }

        if (
          chatResult.status === "rejected" &&
          messageResult.status === "rejected"
        ) {
          throw chatResult.reason;
        }

        setLoadError("");
        markChatRead(chatId);
        markMessagesAsDeliveredAPI(chatId).catch(() => {});
        markMessagesAsReadAPI(chatId).catch(() => {});
      } catch (error) {
        setLoadError(
          getErrorMessage(error, "Unable to load this conversation.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      chatId,
      currentUserId,
      currentUserName,
      markChatRead,
      upsertConversation,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      if (!chatId) return;

      setActiveChatId(chatId);
      loadChat();

      return () => {
        setActiveChatId(null);
      };
    }, [chatId, loadChat, setActiveChatId])
  );

  useEffect(() => {
    if (!socket || !chatId) return;

    socket.emit("joinChat", chatId);

    const handleConnect = () => {
      socket.emit("joinChat", chatId);
    };

    const handleNewMessage = (payload: any) => {
      const incoming: Message | undefined = payload?.message;
      if (!incoming || !isSameChat(incoming.chat, chatId)) return;

      setMessages((previous) => {
        const existing = previous.find(
          (message) => message._id === incoming._id
        );

        if (existing) {
          return previous.map((message) =>
            message._id === incoming._id ? incoming : message
          );
        }

        return [...previous, incoming];
      });

      if (userIdOf(incoming.sender) !== currentUserId) {
        markChatRead(chatId);
        markMessagesAsReadAPI(chatId).catch(() => {});
      }
    };

    const handleDelivered = (payload: any) => {
      if (payload?.chatId && !isSameChat(payload.chatId, chatId)) return;
      const messageId = String(payload?.messageId || "");
      if (!messageId) return;

      setMessages((previous) =>
        previous.map((message) =>
          message._id === messageId
            ? { ...message, isDelivered: true }
            : message
        )
      );
    };

    const handleRead = (payload: any) => {
      if (payload?.chatId && !isSameChat(payload.chatId, chatId)) return;
      const ids = new Set(
        Array.isArray(payload?.messageIds)
          ? payload.messageIds.map(String)
          : []
      );

      setMessages((previous) =>
        previous.map((message) =>
          ids.has(message._id)
            ? { ...message, isRead: true, isDelivered: true }
            : message
        )
      );
    };

    const handleEdited = (payload: any) => {
      const edited: Message | undefined = payload?.message;
      if (!edited || !isSameChat(edited.chat, chatId)) return;

      setMessages((previous) =>
        previous.map((message) =>
          message._id === edited._id ? { ...message, ...edited } : message
        )
      );
    };

    const handleDeleted = (payload: any) => {
      if (payload?.chatId && !isSameChat(payload.chatId, chatId)) return;
      const messageId = String(payload?.messageId || "");
      if (!messageId) return;

      setMessages((previous) =>
        previous.map((message) =>
          message._id === messageId
            ? { ...message, isDeleted: true, text: "", files: [] }
            : message
        )
      );
    };

    const handleDeletedForUser = (payload: any) => {
      if (payload?.chatId && !isSameChat(payload.chatId, chatId)) return;
      const messageId = String(payload?.messageId || "");
      if (!messageId) return;

      setMessages((previous) =>
        previous.filter((message) => message._id !== messageId)
      );
    };

    const handleReaction = (payload: any) => {
      if (!isSameChat(payload?.chatId, chatId)) return;
      const messageId = String(payload?.messageId || "");
      if (!messageId) return;

      const reactions = Array.isArray(payload?.reactions)
        ? payload.reactions
        : [];

      setMessages((previous) =>
        previous.map((message) =>
          message._id === messageId ? { ...message, reactions } : message
        )
      );
    };

    const handleTyping = (payload: any) => {
      if (!isSameChat(payload?.chatId, chatId)) return;
      const name = String(payload?.userName || "").trim();
      if (!name || name === currentUserName) return;

      setTypingNames((previous) =>
        previous.includes(name) ? previous : [...previous, name]
      );
    };

    const handleStoppedTyping = (payload: any) => {
      if (!isSameChat(payload?.chatId, chatId)) return;
      const name = String(payload?.userName || "").trim();
      setTypingNames((previous) => previous.filter((item) => item !== name));
    };

    const handleTypingUsers = (payload: any) => {
      if (!isSameChat(payload?.chatId, chatId)) return;
      setTypingNames(
        Array.isArray(payload?.userNames)
          ? payload.userNames
              .filter(Boolean)
              .map(String)
              .filter((name: string) => name !== currentUserName)
          : []
      );
    };

    socket.on("connect", handleConnect);
    socket.on("newMessage", handleNewMessage);
    socket.on("messageDelivered", handleDelivered);
    socket.on("messagesRead", handleRead);
    socket.on("messageEdited", handleEdited);
    socket.on("messageDeleted", handleDeleted);
    socket.on("messageDeletedForUser", handleDeletedForUser);
    socket.on("messageReaction", handleReaction);
    socket.on("userTyping", handleTyping);
    socket.on("userStoppedTyping", handleStoppedTyping);
    socket.on("typingUsers", handleTypingUsers);

    return () => {
      socket.emit("leaveChat", chatId);
      socket.off("connect", handleConnect);
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDelivered", handleDelivered);
      socket.off("messagesRead", handleRead);
      socket.off("messageEdited", handleEdited);
      socket.off("messageDeleted", handleDeleted);
      socket.off("messageDeletedForUser", handleDeletedForUser);
      socket.off("messageReaction", handleReaction);
      socket.off("userTyping", handleTyping);
      socket.off("userStoppedTyping", handleStoppedTyping);
      socket.off("typingUsers", handleTypingUsers);
    };
  }, [socket, chatId, currentUserId, currentUserName, markChatRead]);

  useEffect(() => {
    if (messages.length === 0) return;

    const timer = setTimeout(() => {
      if (atBottom.current) {
        listRef.current?.scrollToEnd({ animated: false });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typingActive.current && socket && chatId) {
        socket.emit("stopTyping", chatId);
      }
    },
    [socket, chatId]
  );

  const stopTyping = useCallback(() => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }

    if (typingActive.current && socket && chatId) {
      socket.emit("stopTyping", chatId);
      typingActive.current = false;
    }
  }, [socket, chatId]);

  const handleTextChange = (value: string) => {
    setText(value);

    if (!socket || !chatId) return;

    if (!value.trim()) {
      stopTyping();
      return;
    }

    if (!typingActive.current) {
      typingActive.current = true;
      socket.emit("typing", chatId);
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (typingActive.current) {
        socket.emit("stopTyping", chatId);
        typingActive.current = false;
      }
    }, 1500);
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((previous) => `${previous}${emoji}`);
  };

  const toggleEmojiPicker = () => {
    const next = !emojiPickerOpen;

    if (next) {
      Keyboard.dismiss();
    }

    setEmojiPickerOpen(next);
  };

  const handleToggleReaction = async (message: Message, emoji: string) => {
    if (!message || message._id.startsWith("local-")) return;

    try {
      const response = await toggleMessageReactionAPI(message._id, emoji);
      const reactions = Array.isArray(response.data?.reactions)
        ? response.data.reactions
        : [];

      setMessages((previous) =>
        previous.map((item) =>
          item._id === message._id ? { ...item, reactions } : item
        )
      );
      setSelectedMessage((previous) =>
        previous && previous._id === message._id
          ? { ...previous, reactions }
          : previous
      );
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to update this reaction."),
        "error"
      );
    }
  };

  const handlePickImages = async () => {
    setAttachMenuOpen(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
      });

      if (result.canceled) return;

      const nextFiles: PickedFile[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}-${index + 1}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      }));

      setPickedFiles((previous) => [...previous, ...nextFiles].slice(0, 10));
    } catch (error) {
      showToast(getErrorMessage(error, "Unable to open your photos."), "error");
    }
  };

  const handlePickDocuments = async () => {
    setAttachMenuOpen(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const nextFiles: PickedFile[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name || "attachment",
        type: asset.mimeType || "application/octet-stream",
        size: asset.size,
      }));

      setPickedFiles((previous) => [...previous, ...nextFiles].slice(0, 10));
    } catch (error) {
      showToast(getErrorMessage(error, "Unable to open your files."), "error");
    }
  };

  const handleSend = async () => {
    const body = text.trim();

    if (!body && pickedFiles.length === 0) return;
    if (sending || !chatId) return;

    stopTyping();

    if (editingMessage) {
      setSending(true);
      try {
        const response = await editMessageAPI(editingMessage._id, body);
        const updated = response.data?.data;

        if (updated) {
          setMessages((previous) =>
            previous.map((message) =>
              message._id === updated._id
                ? { ...message, ...updated }
                : message
            )
          );
        }

        setEditingMessage(null);
        setText("");
        showToast("Message updated", "success");
      } catch (error) {
        showToast(
          getErrorMessage(error, "Unable to update this message."),
          "error"
        );
      } finally {
        setSending(false);
      }
      return;
    }

    const pendingId = localId();
    const replyMessageId = replyTo?._id || null;
    const audioFile = pickedFiles.find((file) =>
      file.type.startsWith("audio/")
    );
    const allAudio =
      pickedFiles.length > 0 &&
      pickedFiles.every((file) => file.type.startsWith("audio/"));
    const messageType = allAudio
      ? "audio"
      : pickedFiles.some((file) => file.type.startsWith("image/"))
        ? "image"
        : pickedFiles.length > 0
          ? "file"
          : "text";

    const optimistic: Message = {
      _id: pendingId,
      chat: chatId,
      sender: user || "",
      text: body,
      messageType,
      files: pickedFiles.map((file) => ({
        url: file.uri,
        name: file.name,
        mimeType: file.type,
        size: file.size || 0,
        duration: file.duration,
        waveform: file.waveform,
      })),
      replyTo: replyTo
        ? {
            _id: replyTo._id,
            text: replyTo.text,
            sender: replyTo.sender,
            messageType: replyTo.messageType,
            isDeleted: replyTo.isDeleted,
          }
        : null,
      pending: true,
      createdAt: new Date().toISOString(),
    };

    const filesToSend = pickedFiles;
    setMessages((previous) => [...previous, optimistic]);
    setText("");
    setPickedFiles([]);
    setReplyTo(null);
    setSending(true);

    try {
      const response = await sendMessageAPI(
        chatId,
        body,
        filesToSend,
        replyMessageId,
        audioFile
          ? {
              duration: audioFile.duration || 0,
              waveform: audioFile.waveform || [],
            }
          : undefined
      );
      const sent = response.data?.data;

      setMessages((previous) => {
        const withoutPending = previous.filter(
          (message) => message._id !== pendingId
        );

        if (sent && withoutPending.some((message) => message._id === sent._id)) {
          return withoutPending;
        }

        return sent ? [...withoutPending, sent] : withoutPending;
      });

      if (sent) {
        updatePreview(
          chatId,
          messagePreview(sent) || body,
          sent.createdAt,
          currentUserName
        );
      }
    } catch (error) {
      setMessages((previous) =>
        previous.map((message) =>
          message._id === pendingId
            ? { ...message, pending: false, failed: true }
            : message
        )
      );
      showToast(
        getErrorMessage(error, "Your message could not be sent."),
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setReplyTo(selectedMessage);
    setEditingMessage(null);
    setMessageMenuOpen(false);
  };

  const handleCopy = async () => {
    if (!selectedMessage?.text) return;
    await Clipboard.setStringAsync(selectedMessage.text);
    setMessageMenuOpen(false);
    showToast("Message copied", "success");
  };

  const handleEdit = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setText(selectedMessage.text);
    setPickedFiles([]);
    setReplyTo(null);
    setMessageMenuOpen(false);
  };

  const handleForward = () => {
    if (!selectedMessage) return;
    setForwardTarget(selectedMessage);
    setMessageMenuOpen(false);
  };

  const handleDeletePress = () => {
    if (!selectedMessage) return;
    setPendingDelete(selectedMessage);
    setMessageMenuOpen(false);
  };

  const handleDeleteMessage = async () => {
    if (!pendingDelete || deleting) return;

    setDeleting(true);

    try {
      if (pendingDelete._id.startsWith("local-")) {
        setMessages((previous) =>
          previous.filter((message) => message._id !== pendingDelete._id)
        );
      } else {
        const response = await deleteMessageAPI(pendingDelete._id);
        const deleteType = (response.data as any)?.deleteType;

        if (deleteType === "everyone") {
          setMessages((previous) =>
            previous.map((message) =>
              message._id === pendingDelete._id
                ? { ...message, isDeleted: true, text: "", files: [] }
                : message
            )
          );
        } else {
          setMessages((previous) =>
            previous.filter((message) => message._id !== pendingDelete._id)
          );
        }
      }

      setPendingDelete(null);
      showToast("Message deleted", "success");
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to delete this message."),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleForwardMessage = async (chatIds: string[]) => {
    if (!forwardTarget) return;

    try {
      if (forwardTarget._id.startsWith("local-")) {
        await Promise.all(
          chatIds.map((targetId) =>
            sendMessageAPI(targetId, forwardTarget.text)
          )
        );
      } else {
        await forwardMessageAPI(forwardTarget._id, chatIds);
      }

      setForwardTarget(null);
      showToast(
        chatIds.length === 1 ? "Message forwarded" : "Messages forwarded",
        "success"
      );
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to forward this message."),
        "error"
      );
      throw error;
    }
  };

  const handleClearChat = async () => {
    if (clearing) return;
    setClearing(true);

    try {
      await clearChatAPI(chatId);
      setMessages([]);
      setClearConfirmOpen(false);
      showToast("Chat cleared", "success");
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to clear this chat."),
        "error"
      );
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteChat = async () => {
    if (deletingChat) return;
    setDeletingChat(true);

    try {
      await deleteChatAPI(chatId);
      removeConversation(chatId);
      setDeleteChatConfirmOpen(false);
      router.back();
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to delete this chat."),
        "error"
      );
    } finally {
      setDeletingChat(false);
    }
  };

  const messageOptions: ActionSheetOption[] = (() => {
    if (!selectedMessage) return [];

    const options: ActionSheetOption[] = [
      {
        label: "Reply",
        icon: "arrow-undo-outline",
        onPress: handleReply,
      },
    ];

    if (selectedMessage.text && !selectedMessage.isDeleted) {
      options.push({
        label: "Copy text",
        icon: "copy-outline",
        onPress: handleCopy,
      });
      options.push({
        label: "Forward",
        icon: "arrow-redo-outline",
        onPress: handleForward,
      });
    }

    if (
      selectedMessage.text &&
      !selectedMessage.isDeleted &&
      !selectedMessage.pending &&
      !selectedMessage.failed &&
      userIdOf(selectedMessage.sender) === currentUserId
    ) {
      options.push({
        label: "Edit message",
        icon: "pencil-outline",
        onPress: handleEdit,
      });
    }

    const isLocalMessage = selectedMessage._id.startsWith("local-");

    options.push({
      label: isLocalMessage
        ? "Remove message"
        : userIdOf(selectedMessage.sender) === currentUserId
          ? "Delete for everyone"
          : "Delete for me",
      icon: "trash-outline",
      destructive: true,
      onPress: handleDeletePress,
    });

    return options;
  })();

  const headerOptions: ActionSheetOption[] = [
    {
      label: activeConversation?.isGroup ? "Group info" : "View profile",
      icon: "person-circle-outline",
      onPress: () => setProfileOpen(true),
    },
    {
      label: "Clear chat",
      icon: "sparkles-outline",
      onPress: () => setClearConfirmOpen(true),
    },
    {
      label: "Delete chat",
      icon: "trash-outline",
      destructive: true,
      onPress: () => setDeleteChatConfirmOpen(true),
    },
  ];

  const typingLabel =
    typingNames.length === 0
      ? ""
      : typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : "Several people are typing...";

  const reactionHeader = selectedMessage ? (
    <View style={styles.reactionPicker}>
      {REACTION_CHOICES.map((emoji) => {
        const active = (selectedMessage.reactions || []).some(
          (reaction) =>
            userIdOf(reaction.user) === currentUserId &&
            reaction.emoji === emoji
        );

        return (
          <Pressable
            key={emoji}
            onPress={() => {
              handleToggleReaction(selectedMessage, emoji);
              setMessageMenuOpen(false);
            }}
            style={({ pressed }) => [
              styles.reactionChoice,
              {
                backgroundColor: active
                  ? colors.primarySoft
                  : colors.surfaceAlt,
                borderColor: active ? colors.primary : colors.border,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Text style={styles.reactionChoiceEmoji}>{emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const subtitle = typingLabel
    ? typingLabel
    : activeConversation?.isGroup
      ? `${activeConversation.memberCount || activeConversation.participants.length} members`
      : activeConversation?.online
        ? "Online"
        : activeConversation?.subtitle || "Offline";

  const renderMessage = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const previous = index > 0 ? messages[index - 1] : null;
    const showDay =
      !previous || !sameMessageDay(previous.createdAt, item.createdAt);
    const isMine = userIdOf(item.sender) === currentUserId;

    return (
      <View>
        {showDay ? (
          <View style={styles.dayWrap}>
            <Text
              style={[
                styles.dayText,
                {
                  color: colors.textSoft,
                  backgroundColor: colors.surfaceAlt,
                },
              ]}
            >
              {formatDayLabel(item.createdAt)}
            </Text>
          </View>
        ) : null}

        <MessageBubble
          message={item}
          isMine={isMine}
          currentUserId={currentUserId}
          showSender={Boolean(activeConversation?.isGroup) && !isMine}
          onLongPress={() => {
            if (item.isDeleted || item.messageType === "system") return;
            setSelectedMessage(item);
            setMessageMenuOpen(true);
          }}
          onOpenMenu={() => {
            setSelectedMessage(item);
            setMessageMenuOpen(true);
          }}
          onToggleReaction={(emoji) => handleToggleReaction(item, emoji)}
        />
      </View>
    );
  };

  if (!chatId) {
    return (
      <Screen edges={["top", "left", "right", "bottom"]}>
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Conversation unavailable
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.retry, { color: colors.primary }]}>
              Go back
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={23} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => setProfileOpen(true)}
            accessibilityLabel={
              activeConversation?.isGroup ? "Group info" : "View profile"
            }
            style={({ pressed }) => [
              styles.headerIdentity,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Avatar
              name={activeConversation?.title}
              uri={activeConversation?.avatar}
              size={40}
              isGroup={activeConversation?.isGroup}
              online={activeConversation?.online}
              showOnline={!activeConversation?.isGroup}
            />

            <View style={styles.headerText}>
              <Text
                numberOfLines={1}
                style={[styles.headerTitle, { color: colors.text }]}
              >
                {activeConversation?.title || "Chat"}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.headerSubtitle,
                  { color: typingLabel ? colors.primary : colors.textMuted },
                ]}
              >
                {subtitle}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setInfoMessage(CALLS_COMING_SOON)}
            accessibilityLabel="Voice call coming soon"
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.6 : 0.55 },
            ]}
          >
            <Ionicons name="call-outline" size={21} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => setInfoMessage(CALLS_COMING_SOON)}
            accessibilityLabel="Video call coming soon"
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.6 : 0.55 },
            ]}
          >
            <Ionicons name="videocam-outline" size={23} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => setHeaderMenuOpen(true)}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </Pressable>
        </View>

        {loadError ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.accentSoft },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {loadError}
            </Text>
            <Pressable onPress={() => loadChat()}>
              <Text style={[styles.retry, { color: colors.primary }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onScroll={({ nativeEvent }) => {
            const distance =
              nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y;
            atBottom.current = distance < 140;
          }}
          scrollEventThrottle={120}
          refreshing={refreshing}
          onRefresh={() => loadChat(true)}
          ListEmptyComponent={
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyChat}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={29}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Start the conversation
                </Text>
                <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
                  Send a message, a photo, or a file to {activeConversation?.title || "this chat"}.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            typingNames.length > 0 ? (
              <View style={styles.typingRow}>
                <View
                  style={[
                    styles.typingBubble,
                    { backgroundColor: colors.bubbleTheirs },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: colors.textSoft }]} />
                  <View style={[styles.dot, { backgroundColor: colors.textSoft }]} />
                  <View style={[styles.dot, { backgroundColor: colors.textSoft }]} />
                </View>
              </View>
            ) : undefined
          }
        />

        <View
          style={[
            styles.composerWrap,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 9),
            },
          ]}
        >
          {editingMessage ? (
            <View
              style={[
                styles.contextBar,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <View style={styles.contextText}>
                <Text style={[styles.contextLabel, { color: colors.primary }]}>
                  Editing message
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.contextPreview, { color: colors.textMuted }]}
                >
                  {editingMessage.text}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditingMessage(null);
                  setText("");
                }}
                hitSlop={8}
              >
                <Ionicons name="close" size={19} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : replyTo ? (
            <View
              style={[
                styles.contextBar,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <View style={styles.contextText}>
                <Text style={[styles.contextLabel, { color: colors.primary }]}>
                  Replying to {userNameOf(replyTo.sender, "message")}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.contextPreview, { color: colors.textMuted }]}
                >
                  {replyTo.text || "Attachment"}
                </Text>
              </View>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Ionicons name="close" size={19} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {pickedFiles.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentRow}
            >
              {pickedFiles.map((file, index) => (
                <View
                  key={`${file.uri}-${index}`}
                  style={[
                    styles.attachmentChip,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      file.type.startsWith("image/")
                        ? "image-outline"
                        : file.type.startsWith("audio/")
                          ? "mic-outline"
                          : "document-text-outline"
                    }
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.attachmentName, { color: colors.text }]}
                  >
                    {file.type.startsWith("audio/") && file.duration
                      ? `Voice message · ${formatDuration(file.duration)}`
                      : file.name}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPickedFiles((previous) =>
                        previous.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {isRecording ? (
            <View
              style={[
                styles.recordingBar,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <View
                style={[styles.recordingDot, { backgroundColor: colors.danger }]}
              />
              <Text style={[styles.recordingText, { color: colors.text }]}>
                Recording {formatDuration(durationMillis / 1000)}
              </Text>
              <Pressable onPress={cancelRecording} hitSlop={8}>
                <Text
                  style={[styles.recordingCancel, { color: colors.danger }]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : null}

          {emojiPickerOpen ? (
            <EmojiPicker onSelect={handleEmojiSelect} />
          ) : null}

          <View style={styles.composerRow}>
            <Pressable
              onPress={() => setAttachMenuOpen(true)}
              disabled={isRecording}
              style={({ pressed }) => [
                styles.roundButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  opacity: isRecording ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </Pressable>

            <TextInput
              value={text}
              onChangeText={handleTextChange}
              onFocus={() => setEmojiPickerOpen(false)}
              placeholder={
                isRecording ? "Recording voice message..." : "Message..."
              }
              placeholderTextColor={colors.textSoft}
              selectionColor={colors.primary}
              editable={!isRecording}
              multiline
              maxLength={10000}
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            <Pressable
              onPress={toggleEmojiPicker}
              disabled={isRecording}
              accessibilityLabel="Emoji picker"
              style={({ pressed }) => [
                styles.roundButton,
                {
                  backgroundColor: emojiPickerOpen
                    ? colors.primarySoft
                    : colors.surfaceAlt,
                  opacity: isRecording ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name="happy-outline"
                size={23}
                color={emojiPickerOpen ? colors.primary : colors.textMuted}
              />
            </Pressable>

            {isRecording ? (
              <Pressable
                onPress={stopRecording}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: colors.danger,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Ionicons name="stop" size={19} color="#FFFFFF" />
              </Pressable>
            ) : text.trim() || pickedFiles.length > 0 ? (
              <Pressable
                onPress={handleSend}
                disabled={sending}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: colors.primaryDeep,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up" size={21} color="#FFFFFF" />
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={startRecording}
                disabled={startingRecording || sending}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: colors.surfaceAlt,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                {startingRecording ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name="mic-outline"
                    size={21}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={messageMenuOpen}
        title="Message actions"
        header={reactionHeader}
        options={messageOptions}
        onClose={() => setMessageMenuOpen(false)}
      />

      <ActionSheet
        visible={attachMenuOpen}
        title="Add to message"
        options={[
          {
            label: "Photo",
            icon: "image-outline",
            onPress: handlePickImages,
          },
          {
            label: "File",
            icon: "document-attach-outline",
            onPress: handlePickDocuments,
          },
        ]}
        onClose={() => setAttachMenuOpen(false)}
      />

      <ActionSheet
        visible={headerMenuOpen}
        title="Chat options"
        options={headerOptions}
        onClose={() => setHeaderMenuOpen(false)}
      />

      <ForwardModal
        visible={Boolean(forwardTarget)}
        conversations={conversations}
        excludeChatId={chatId}
        onClose={() => setForwardTarget(null)}
        onForward={handleForwardMessage}
      />

      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Delete message?"
        message={
          pendingDelete && userIdOf(pendingDelete.sender) === currentUserId
            ? "This message will be removed for everyone in this chat."
            : "This message will be removed from your view of this chat."
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDeleteMessage}
      />

      <ConfirmDialog
        visible={clearConfirmOpen}
        title="Clear this chat?"
        message="This removes the messages from your view. Other members keep their copy."
        confirmLabel="Clear chat"
        destructive
        loading={clearing}
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={handleClearChat}
      />

      <ConfirmDialog
        visible={deleteChatConfirmOpen}
        title="Delete this chat?"
        message="This removes the chat from your chat list. A new message will bring it back."
        confirmLabel="Delete chat"
        destructive
        loading={deletingChat}
        onCancel={() => setDeleteChatConfirmOpen(false)}
        onConfirm={handleDeleteChat}
      />

      <ProfileSheet
        visible={profileOpen}
        conversation={activeConversation}
        currentUserId={currentUserId}
        onClose={() => setProfileOpen(false)}
      />

      <InfoDialog
        visible={Boolean(infoMessage)}
        title="Calls"
        message={infoMessage}
        onClose={() => setInfoMessage("")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  header: {
    minHeight: 62,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 8,
  },
  headerButton: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reactionPicker: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
  },
  reactionChoice: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionChoiceEmoji: {
    fontSize: 22,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: "500",
  },
  errorBanner: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  retry: {
    fontSize: 13,
    fontWeight: "700",
  },
  messageList: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 14,
  },
  dayWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dayText: {
    fontSize: 10.5,
    fontWeight: "700",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 42,
    paddingBottom: 30,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyCopy: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  typingRow: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    alignItems: "flex-start",
  },
  typingBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recordingBar: {
    minHeight: 36,
    borderRadius: 11,
    paddingHorizontal: 11,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
  },
  recordingCancel: {
    fontSize: 12,
    fontWeight: "800",
  },
  composerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  contextBar: {
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contextText: {
    flex: 1,
    minWidth: 0,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  contextPreview: {
    marginTop: 2,
    fontSize: 11.5,
  },
  attachmentRow: {
    gap: 7,
    paddingBottom: 8,
  },
  attachmentChip: {
    maxWidth: 200,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attachmentName: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "600",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 124,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});

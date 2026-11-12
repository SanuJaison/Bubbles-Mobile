import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { chatWithAIFilesAPI, transcribeAudioAPI } from "../api/ai";
import { getErrorMessage } from "../api/client";
import { sendMessageAPI, type PickedFile } from "../api/messages";
import { ActionSheet, type ActionSheetOption } from "../components/ActionSheet";
import { ChatWallpaper } from "../components/ChatWallpaper";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ForwardModal } from "../components/ForwardModal";
import { LinkifiedText } from "../components/LinkifiedText";
import { Screen } from "../components/Screen";
import { WallpaperPicker } from "../components/WallpaperPicker";
import { useAuth } from "../context/AuthContext";
import { useChatPrefs } from "../context/ChatPrefsContext";
import { useChats } from "../context/ChatsContext";
import { useToast } from "../context/ToastContext";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { useTheme } from "../theme";
import type { AIHistoryAttachment, AIHistoryMessage } from "../types";
import { cleanAIText, makeLocalId } from "../utils/ai";
import { formatClockTime, formatDuration } from "../utils/format";
import { openExternalUrl } from "../utils/links";
import { KeyboardAwareView } from "../components/KeyboardAwareView";
import {
  clearAIHistory,
  loadAIHistory,
  saveAIHistory,
} from "../storage/aiStorage";

const bubbleAI = require("../../assets/bubble-ai.png");
const GREETING_ID = "bubbles-ai-greeting";
// The AI conversation stores its wallpaper under a reserved key so it can be
// themed like any other chat without colliding with a real chat id.
const AI_WALLPAPER_ID = "bubbles-ai";
const MAX_AI_FILES = 8;
const MAX_AI_FILE_BYTES = 25 * 1024 * 1024;

const suggestions = [
  "What is Bubbles?",
  "How do I create a group?",
  "What can Bubbles AI do?",
];

export default function AIChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations } = useChats();
  const { showToast } = useToast();
  const { wallpaperFor, setWallpaper, setWallpaperForAll, wallpapers } =
    useChatPrefs();
  const userId = user?._id || user?.id || "guest";
  const firstName = user?.name?.split(" ")[0] || "";

  const greeting = useMemo<AIHistoryMessage>(
    () => ({
      id: GREETING_ID,
      type: "ai",
      text: `Hi${firstName ? ` ${firstName}` : ""}! I'm Bubbles AI. Ask me anything about this app, or tell me what you want to do and I'll point you in the right direction.`,
      createdAt: new Date().toISOString(),
    }),
    [firstName]
  );

  const [messages, setMessages] = useState<AIHistoryMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<AIHistoryMessage | null>(null);
  const [selectedMessage, setSelectedMessage] =
    useState<AIHistoryMessage | null>(null);
  const [messageMenuOpen, setMessageMenuOpen] = useState(false);
  const [forwardTarget, setForwardTarget] =
    useState<AIHistoryMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AIHistoryMessage | null>(
    null
  );
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PickedFile[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const listRef = useRef<FlatList<AIHistoryMessage>>(null);
  const atBottom = useRef(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadedRef.current = false;

    loadAIHistory(userId).then((history) => {
      if (!active) return;
      setMessages(history.length > 0 ? history : [greeting]);
      loadedRef.current = true;
    });

    return () => {
      active = false;
    };
  }, [userId, greeting]);

  useEffect(() => {
    if (loadedRef.current) {
      saveAIHistory(userId, messages);
    }
  }, [messages, userId]);

  useEffect(() => {
    if (messages.length === 0) return;

    const timer = setTimeout(() => {
      if (atBottom.current) {
        listRef.current?.scrollToEnd({ animated: true });
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [messages, sending]);

  useEffect(
    () => () => {
      Speech.stop();
    },
    []
  );

  const speak = (message: AIHistoryMessage) => {
    if (speakingId === message.id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }

    Speech.stop();
    setSpeakingId(message.id);

    Speech.speak(cleanAIText(message.text), {
      rate: 0.98,
      pitch: 1,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const buildAttachmentMeta = (files: PickedFile[]): AIHistoryAttachment[] =>
    files.map((file) => ({
      kind: file.type?.startsWith("image/")
        ? "image"
        : file.type?.startsWith("video/")
          ? "video"
          : file.type?.startsWith("audio/")
            ? "audio"
            : "file",
      name: file.name,
      type: file.type,
      size: file.size,
    }));

  const addAttachments = (incoming: PickedFile[]) => {
    const tooBig = incoming.filter(
      (file) => (file.size || 0) > MAX_AI_FILE_BYTES
    );

    if (tooBig.length > 0) {
      showToast("Each file must be 25 MB or smaller.", "info");
    }

    const usable = incoming.filter(
      (file) => (file.size || 0) <= MAX_AI_FILE_BYTES
    );

    setAttachments((current) => {
      const next = [...current];

      for (const file of usable) {
        if (next.length >= MAX_AI_FILES) break;
        if (next.some((item) => item.uri === file.uri)) continue;
        next.push(file);
      }

      if (next.length < current.length + usable.length) {
        showToast(`You can attach up to ${MAX_AI_FILES} files at once.`, "info");
      }

      return next;
    });
  };

  const sendToAI = async ({
    body,
    files = [],
  }: {
    body: string;
    files?: PickedFile[];
  }) => {
    const cleanBody = body.trim();

    if ((!cleanBody && files.length === 0) || sending) return;

    const displayText = cleanBody || "I've attached a file.";

    const userMessage: AIHistoryMessage = {
      id: makeLocalId("ai-user"),
      type: "user",
      text: displayText,
      createdAt: new Date().toISOString(),
      replyToText: replyTo?.text,
      attachments: files.length > 0 ? buildAttachmentMeta(files) : undefined,
    };

    const previous = messages.filter(
      (message) => message.id !== GREETING_ID
    );

    const historyPayload = previous.slice(-18).map((message) => ({
      role: message.type === "ai" ? ("assistant" as const) : ("user" as const),
      content: message.text,
    }));

    const lastContent = replyTo
      ? `Replying to: "${cleanAIText(replyTo.text)}"\n\n${displayText}`
      : displayText;

    setMessages((current) => [...current, userMessage]);
    setText("");
    setReplyTo(null);
    setAttachments([]);
    setSending(true);
    atBottom.current = true;

    try {
      const response = await chatWithAIFilesAPI(
        [...historyPayload, { role: "user", content: lastContent }],
        files.map((file) => ({
          uri: file.uri,
          name: file.name,
          type: file.type,
        }))
      );

      const reply = cleanAIText(String(response.data?.reply || ""));
      if (!reply) {
        throw new Error("Bubbles AI returned an empty reply.");
      }

      const sources = Array.isArray(response.data?.sources)
        ? response.data.sources
            .filter(
              (source) =>
                source &&
                typeof source.title === "string" &&
                typeof source.url === "string"
            )
            .slice(0, 5)
        : [];

      const aiMessage: AIHistoryMessage = {
        id: makeLocalId("ai-reply"),
        type: "ai",
        text: reply,
        createdAt: new Date().toISOString(),
        sources,
        showSources: response.data?.showSources === true && sources.length > 0,
      };

      setMessages((current) => [...current, aiMessage]);
    } catch (error) {
      showToast(
        getErrorMessage(
          error,
          "Bubbles AI couldn't reply right now. Please try again."
        ),
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (override?: string) => {
    await sendToAI({
      body: String(override ?? text),
      files: override ? [] : attachments,
    });
  };

  const handlePickPhotos = async () => {
    setAttachMenuOpen(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_AI_FILES,
        quality: 0.85,
      });

      if (result.canceled) return;

      addAttachments(
        result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `photo-${Date.now()}-${index + 1}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        }))
      );
    } catch (error) {
      showToast(getErrorMessage(error, "Unable to open your photos."), "error");
    }
  };

  const handlePickFiles = async () => {
    setAttachMenuOpen(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      addAttachments(
        result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name || `file-${Date.now()}`,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        }))
      );
    } catch (error) {
      showToast(getErrorMessage(error, "Unable to open your files."), "error");
    }
  };

  const handleVoiceRecorded = async (file: PickedFile) => {
    setTranscribing(true);

    try {
      const response = await transcribeAudioAPI({
        uri: file.uri,
        name: file.name,
        type: file.type,
      });

      const transcript = String(response.data?.text || "").trim();

      if (!transcript) {
        throw new Error("No speech was detected in that recording.");
      }

      await sendToAI({ body: transcript });
    } catch (error) {
      showToast(
        getErrorMessage(error, "Could not transcribe that voice message."),
        "error"
      );
    } finally {
      setTranscribing(false);
    }
  };

  const {
    isRecording,
    durationMillis,
    starting: startingRecording,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useVoiceRecorder({
    onRecorded: handleVoiceRecorded,
    onError: (message) => showToast(message, "error"),
  });

  const handleCopy = async () => {
    if (!selectedMessage) return;
    await Clipboard.setStringAsync(selectedMessage.text);
    setMessageMenuOpen(false);
    showToast("Message copied", "success");
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setReplyTo(selectedMessage);
    setMessageMenuOpen(false);
  };

  const handleForward = () => {
    if (!selectedMessage) return;
    setForwardTarget(selectedMessage);
    setMessageMenuOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    if (speakingId === deleteTarget.id) {
      Speech.stop();
      setSpeakingId(null);
    }

    setMessages((current) =>
      current.filter((message) => message.id !== deleteTarget.id)
    );
    setDeleteTarget(null);
    showToast("Message removed from this device", "success");
  };

  const handleForwardAI = async (chatIds: string[]) => {
    if (!forwardTarget) return;

    try {
      const prefix =
        forwardTarget.type === "ai"
          ? "Forwarded from Bubbles AI:"
          : "Forwarded message:";

      await Promise.all(
        chatIds.map((chatId) =>
          sendMessageAPI(
            chatId,
            `${prefix}\n\n${cleanAIText(forwardTarget.text)}`
          )
        )
      );

      setForwardTarget(null);
      showToast("Forwarded to your chat", "success");
    } catch (error) {
      showToast(
        getErrorMessage(error, "Unable to forward this message."),
        "error"
      );
      throw error;
    }
  };

  const handleClear = async () => {
    Speech.stop();
    setSpeakingId(null);
    await clearAIHistory(userId);
    setMessages([greeting]);
    setClearConfirmOpen(false);
    showToast("AI chat cleared", "success");
  };

  const messageOptions: ActionSheetOption[] = (() => {
    if (!selectedMessage) return [];

    const options: ActionSheetOption[] = [
      {
        label: "Reply",
        icon: "arrow-undo-outline",
        onPress: handleReply,
      },
      {
        label: "Copy text",
        icon: "copy-outline",
        onPress: handleCopy,
      },
      {
        label: "Forward",
        icon: "arrow-redo-outline",
        onPress: handleForward,
      },
    ];

    if (selectedMessage.type === "ai") {
      options.push({
        label:
          speakingId === selectedMessage.id ? "Stop reading" : "Read aloud",
        icon:
          speakingId === selectedMessage.id
            ? "stop-circle-outline"
            : "volume-high-outline",
        onPress: () => speak(selectedMessage),
      });
    }

    options.push({
      label: "Delete",
      icon: "trash-outline",
      destructive: true,
      onPress: () => {
        setDeleteTarget(selectedMessage);
        setMessageMenuOpen(false);
      },
    });

    return options;
  })();

  const renderMessage = ({ item }: { item: AIHistoryMessage }) => {
    const isAI = item.type === "ai";
    const canAct = item.id !== GREETING_ID;
    const isSpeaking = speakingId === item.id;

    return (
      <View
        style={[
          styles.messageRow,
          isAI ? styles.messageRowAI : styles.messageRowUser,
        ]}
      >
        {isAI ? (
          <Image source={bubbleAI} style={styles.smallAvatar} contentFit="cover" />
        ) : null}

        <View style={styles.bubbleColumn}>
          {isAI ? (
            <Text style={[styles.sender, { color: colors.primary }]}>
              Bubbles AI
            </Text>
          ) : null}

          <View
            style={[
              styles.bubble,
              isAI
                ? {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderBottomLeftRadius: 6,
                  }
                : {
                    backgroundColor: colors.bubbleMine,
                    borderColor: colors.bubbleMine,
                    borderBottomRightRadius: 6,
                  },
            ]}
          >
            {item.replyToText ? (
              <View
                style={[
                  styles.replyBox,
                  {
                    backgroundColor: isAI
                      ? colors.surfaceAlt
                      : "rgba(255,255,255,0.13)",
                    borderLeftColor: isAI ? colors.primary : "#FFFFFF",
                  },
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[
                    styles.replyText,
                    {
                      color: isAI
                        ? colors.textMuted
                        : "rgba(255,255,255,0.82)",
                    },
                  ]}
                >
                  {item.replyToText}
                </Text>
              </View>
            ) : null}

            {item.attachments?.length ? (
              <View style={styles.bubbleAttachments}>
                {item.attachments.map((attachment, index) => (
                  <View
                    key={`${attachment.name}-${index}`}
                    style={[
                      styles.bubbleAttachment,
                      {
                        backgroundColor: isAI
                          ? colors.surfaceAlt
                          : "rgba(255,255,255,0.16)",
                        borderColor: isAI
                          ? colors.border
                          : "rgba(255,255,255,0.22)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        attachment.kind === "image"
                          ? "image-outline"
                          : attachment.kind === "audio"
                            ? "mic-outline"
                            : attachment.kind === "video"
                              ? "videocam-outline"
                              : "document-outline"
                      }
                      size={13}
                      color={isAI ? colors.primary : "#FFFFFF"}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.bubbleAttachmentName,
                        {
                          color: isAI
                            ? colors.text
                            : "rgba(255,255,255,0.92)",
                        },
                      ]}
                    >
                      {attachment.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <LinkifiedText
              text={item.text}
              style={[
                styles.messageText,
                {
                  color: isAI ? colors.text : colors.bubbleMineText,
                },
              ]}
              linkStyle={{
                color: isAI ? colors.primary : "#FFFFFF",
                textDecorationColor: isAI
                  ? colors.primary
                  : "rgba(255,255,255,0.7)",
              }}
            />

            {isAI && item.showSources && item.sources?.length ? (
              <View
                style={[
                  styles.sources,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.sourcesTitle, { color: colors.textMuted }]}>
                  Sources
                </Text>
                {item.sources.map((source, index) => (
                  <Pressable
                    key={`${source.url}-${index}`}
                    onPress={() => openExternalUrl(source.url)}
                    style={({ pressed }) => [
                      styles.sourceRow,
                      { opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    <Ionicons
                      name="link-outline"
                      size={13}
                      color={colors.primary}
                    />
                    <Text
                      numberOfLines={2}
                      style={[styles.sourceText, { color: colors.primary }]}
                    >
                      {source.title || source.url}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.messageMeta}>
              <Text
                style={[
                  styles.time,
                  {
                    color: isAI
                      ? colors.textSoft
                      : "rgba(255,255,255,0.66)",
                  },
                ]}
              >
                {formatClockTime(item.createdAt)}
              </Text>

              {isAI ? (
                <Pressable
                  onPress={() => speak(item)}
                  hitSlop={7}
                  style={({ pressed }) => [
                    styles.speakButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons
                    name={isSpeaking ? "stop" : "volume-high-outline"}
                    size={14}
                    color={isSpeaking ? colors.primary : colors.textSoft}
                  />
                </Pressable>
              ) : null}

              {canAct ? (
                <Pressable
                  onPress={() => {
                    setSelectedMessage(item);
                    setMessageMenuOpen(true);
                  }}
                  hitSlop={7}
                  style={({ pressed }) => [
                    styles.moreButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={15}
                    color={isAI ? colors.textSoft : "rgba(255,255,255,0.75)"}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <ChatWallpaper value={wallpaperFor(AI_WALLPAPER_ID)} />
      <KeyboardAwareView style={styles.flex}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Image source={bubbleAI} style={styles.headerAvatar} contentFit="cover" />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Bubbles AI
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Private to this device · Bubbles questions only
            </Text>
          </View>
          <Pressable
            onPress={() => setHeaderMenuOpen(true)}
            accessibilityLabel="Bubbles AI options"
            style={({ pressed }) => [
              styles.headerButton,
              {
                backgroundColor: colors.surfaceAlt,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onScroll={({ nativeEvent }) => {
            const distance =
              nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y;
            atBottom.current = distance < 140;
          }}
          scrollEventThrottle={120}
          ListFooterComponent={
            <>
              {sending ? (
                <View style={[styles.messageRow, styles.messageRowAI]}>
                  <Image
                    source={bubbleAI}
                    style={styles.smallAvatar}
                    contentFit="cover"
                  />
                  <View
                    style={[
                      styles.typingBubble,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text
                      style={[styles.typingText, { color: colors.textMuted }]}
                    >
                      Thinking about Bubbles...
                    </Text>
                  </View>
                </View>
              ) : null}

              {messages.length <= 1 ? (
                <View style={styles.suggestions}>
                  <Text
                    style={[styles.suggestionsTitle, { color: colors.textMuted }]}
                  >
                    Try asking
                  </Text>
                  {suggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => handleSend(suggestion)}
                      style={({ pressed }) => [
                        styles.suggestion,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.suggestionText,
                          { color: colors.text },
                        ]}
                      >
                        {suggestion}
                      </Text>
                      <Ionicons
                        name="arrow-up-outline"
                        size={14}
                        color={colors.primary}
                        style={styles.suggestionIcon}
                      />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.localNote, { color: colors.textSoft }]}>
                Bubbles AI only talks about this app. Your AI chat stays on this
                device.
              </Text>
            </>
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
          {replyTo ? (
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
                  Replying to {replyTo.type === "ai" ? "Bubbles AI" : "yourself"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.contextPreview, { color: colors.textMuted }]}
                >
                  {replyTo.text}
                </Text>
              </View>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Ionicons name="close" size={19} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {transcribing ? (
            <View
              style={[styles.recordingBar, { backgroundColor: colors.surfaceAlt }]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.recordingText, { color: colors.textMuted }]}>
                Transcribing your voice message...
              </Text>
            </View>
          ) : null}

          {isRecording ? (
            <View
              style={[styles.recordingBar, { backgroundColor: colors.surfaceAlt }]}
            >
              <View
                style={[styles.recordingDot, { backgroundColor: colors.danger }]}
              />
              <Text style={[styles.recordingText, { color: colors.text }]}>
                Recording {formatDuration(durationMillis / 1000)}
              </Text>
              <Pressable onPress={cancelRecording} hitSlop={8}>
                <Text style={[styles.recordingCancel, { color: colors.danger }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable onPress={stopRecording} hitSlop={8}>
                <Ionicons
                  name="checkmark-circle"
                  size={27}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          ) : (
            <>
              {attachments.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.attachmentStripScroll}
                  contentContainerStyle={styles.attachmentStrip}
                >
                  {attachments.map((file, index) => (
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
                          file.type?.startsWith("image/")
                            ? "image-outline"
                            : "document-outline"
                        }
                        size={13}
                        color={colors.primary}
                      />
                      <Text
                        numberOfLines={1}
                        style={[styles.attachmentName, { color: colors.text }]}
                      >
                        {file.name}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setAttachments((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        hitSlop={8}
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.composerRow}>
                <Pressable
                  onPress={() => setAttachMenuOpen(true)}
                  disabled={sending}
                  accessibilityLabel="Attach a file"
                  style={({ pressed }) => [
                    styles.attachButton,
                    {
                      backgroundColor: colors.surfaceAlt,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={22} color={colors.textMuted} />
                </Pressable>

                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Ask Bubbles AI..."
                  placeholderTextColor={colors.textSoft}
                  selectionColor={colors.primary}
                  multiline
                  maxLength={4000}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />

                {text.trim() || attachments.length > 0 ? (
                  <Pressable
                    onPress={() => handleSend()}
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
                    disabled={sending || startingRecording || transcribing}
                    accessibilityLabel="Record a voice message"
                    style={({ pressed }) => [
                      styles.sendButton,
                      {
                        backgroundColor: colors.surfaceAlt,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    {startingRecording ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name="mic-outline"
                        size={21}
                        color={colors.textMuted}
                      />
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAwareView>

      <ActionSheet
        visible={messageMenuOpen}
        title="AI message"
        options={messageOptions}
        onClose={() => setMessageMenuOpen(false)}
      />

      <ActionSheet
        visible={attachMenuOpen}
        title="Attach to your message"
        options={[
          {
            label: "Photo",
            icon: "image-outline",
            onPress: handlePickPhotos,
          },
          {
            label: "File",
            icon: "document-outline",
            onPress: handlePickFiles,
          },
        ]}
        onClose={() => setAttachMenuOpen(false)}
      />

      <ActionSheet
        visible={headerMenuOpen}
        title="Bubbles AI"
        options={[
          {
            label: "Chat wallpaper",
            icon: "color-palette-outline",
            onPress: () => setWallpaperOpen(true),
          },
          {
            label: "Clear conversation",
            icon: "trash-outline",
            destructive: true,
            onPress: () => setClearConfirmOpen(true),
          },
        ]}
        onClose={() => setHeaderMenuOpen(false)}
      />

      <WallpaperPicker
        visible={wallpaperOpen}
        title="Bubbles AI wallpaper"
        value={wallpaperFor(AI_WALLPAPER_ID)}
        allowReset={Boolean(wallpapers[AI_WALLPAPER_ID])}
        allowApplyToAll
        onClose={() => setWallpaperOpen(false)}
        onSelect={(next, scope) => {
          if (scope === "all") {
            setWallpaperForAll(next);
            showToast("Wallpaper applied to all chats", "success");
            return;
          }

          setWallpaper(AI_WALLPAPER_ID, next);
          showToast("Wallpaper updated", "success");
        }}
      />

      <ForwardModal
        visible={Boolean(forwardTarget)}
        conversations={conversations}
        title="Forward AI message"
        onClose={() => setForwardTarget(null)}
        onForward={handleForwardAI}
      />

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="Delete this message?"
        message="This removes the message from your Bubbles AI conversation on this device."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        visible={clearConfirmOpen}
        title="Clear AI chat?"
        message="This removes your Bubbles AI conversation from this device. Your regular chats are not affected."
        confirmLabel="Clear chat"
        destructive
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={handleClear}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    minHeight: 64,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 11,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 10.5,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
    gap: 8,
  },
  messageRowAI: {
    alignItems: "flex-start",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    marginTop: 18,
  },
  bubbleColumn: {
    maxWidth: "85%",
    minWidth: 78,
  },
  sender: {
    fontSize: 10.5,
    fontWeight: "800",
    marginLeft: 8,
    marginBottom: 4,
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  replyBox: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 7,
  },
  replyText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  sources: {
    marginTop: 9,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 5,
  },
  sourcesTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  sourceText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    textDecorationLine: "underline",
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    marginTop: 4,
  },
  time: {
    fontSize: 10,
    fontWeight: "500",
  },
  speakButton: {
    padding: 2,
  },
  moreButton: {
    padding: 2,
  },
  typingBubble: {
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  typingText: {
    fontSize: 11.5,
  },
  suggestions: {
    marginTop: 18,
    marginHorizontal: 6,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    paddingHorizontal: 2,
  },
  suggestion: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionIcon: {
    transform: [{ rotate: "45deg" }],
  },
  localNote: {
    marginTop: 20,
    marginHorizontal: 20,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
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
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
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
  attachButton: {
    width: 40,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentStrip: {
    gap: 7,
    paddingBottom: 8,
    paddingRight: 4,
    alignItems: "center",
  },
  attachmentStripScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 200,
    borderRadius: 999,
    borderWidth: 1,
    paddingLeft: 9,
    paddingRight: 7,
    paddingVertical: 6,
  },
  attachmentName: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "600",
  },
  bubbleAttachments: {
    gap: 5,
    marginBottom: 6,
  },
  bubbleAttachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  bubbleAttachmentName: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "600",
  },
  recordingBar: {
    minHeight: 44,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  recordingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  recordingCancel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
});

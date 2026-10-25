import type { Chat, Conversation, User } from "../types";
import { formatListTime } from "./format";

export const userIdOf = (value?: User | string | null) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
};

export const userNameOf = (value?: User | string | null, fallback = "") => {
  if (!value) return fallback;
  if (typeof value === "string") return fallback;
  return value.name || value.username || fallback;
};

export const formatChat = (
  chat: Chat,
  currentUserId: string,
  viewerName = "You"
): Conversation => {
  const participants = Array.isArray(chat.participants) ? chat.participants : [];
  const senderId = userIdOf(chat.lastMessageSender);
  const sender = participants.find((participant) => userIdOf(participant) === senderId);
  const senderName = senderId
    ? senderId === currentUserId
      ? "You"
      : sender?.name || ""
    : "";

  if (chat.isGroup) {
    return {
      id: String(chat._id),
      title: chat.groupName || "Group",
      subtitle: `${participants.length} members`,
      avatar: chat.groupAvatar || "",
      isGroup: true,
      participants,
      lastMessage: chat.lastMessage || "",
      lastMessageAt: chat.lastMessageAt || chat.updatedAt || chat.createdAt || null,
      lastMessageSenderName: senderName,
      unread: 0,
      memberCount: participants.length,
      online: false,
    };
  }

  const otherUser =
    participants.find((participant) => userIdOf(participant) !== currentUserId) ||
    participants[0];

  const online =
    otherUser?.onlineStatus === false ? false : Boolean(otherUser?.isOnline);

  return {
    id: String(chat._id),
    title: otherUser?.name || "Unknown User",
    subtitle: online
      ? "Online"
      : otherUser?.lastSeen
        ? `Last seen ${formatListTime(otherUser.lastSeen)}`
        : "Offline",
    avatar: otherUser?.profilePicture || "",
    isGroup: false,
    otherUserId: userIdOf(otherUser),
    participants,
    lastMessage: chat.lastMessage || "",
    lastMessageAt: chat.lastMessageAt || chat.updatedAt || chat.createdAt || null,
    lastMessageSenderName: senderId === currentUserId ? "You" : senderName,
    unread: 0,
    online,
    memberCount: 2,
  };
};

export const conversationPreview = (conversation: Conversation) => {
  if (!conversation.lastMessage) return "No messages yet";
  if (conversation.isGroup && conversation.lastMessageSenderName) {
    return `${conversation.lastMessageSenderName}: ${conversation.lastMessage}`;
  }
  return conversation.lastMessage;
};

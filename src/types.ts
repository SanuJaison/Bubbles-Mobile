export type User = {
  _id?: string;
  id?: string;
  name: string;
  username?: string;
  email?: string;
  bio?: string;
  profilePicture?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  onlineStatus?: boolean;
  profilePhotoVisibility?: "everyone" | "nobody";
  lastSeenVisibility?: "everyone" | "nobody";
  needsUsername?: boolean;
  createdAt?: string;
};

export type Attachment = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  duration?: number;
  waveform?: number[];
};

export type MessageReaction = {
  user: User | string;
  emoji: string;
  createdAt?: string;
};

export type ReplyPreview = {
  _id?: string;
  text?: string;
  sender?: User | string;
  messageType?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
};

export type Message = {
  _id: string;
  chat: string;
  sender: User | string;
  text: string;
  messageType: "text" | "image" | "file" | "audio" | "call" | "system";
  files?: Attachment[];
  reactions?: MessageReaction[];
  replyTo?: ReplyPreview | null;
  isDelivered?: boolean;
  isRead?: boolean;
  isDeleted?: boolean;
  isEdited?: boolean;
  isForwarded?: boolean;
  isPinned?: boolean;
  callInfo?: {
    callType?: "audio" | "video";
    status?: "completed" | "missed" | "declined" | "cancelled";
    duration?: number;
  };
  createdAt: string;
  updatedAt?: string;
  pending?: boolean;
  failed?: boolean;
};

export type Chat = {
  _id: string;
  participants: User[];
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupDescription?: string;
  groupAdmins?: string[];
  groupCreatedBy?: string;
  groupPermissions?: {
    sendMessages?: "all" | "admins";
    addMembers?: "all" | "admins";
    editInfo?: "all" | "admins";
  };
  lastMessage?: string;
  lastMessageSender?: User | string | null;
  lastMessageAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  avatar?: string;
  isGroup: boolean;
  otherUserId?: string;
  participants: User[];
  lastMessage: string;
  lastMessageAt: string | null;
  lastMessageSenderName: string;
  unread: number;
  online?: boolean;
  memberCount?: number;
  typing?: boolean;
};

export type AIHistoryMessage = {
  id: string;
  type: "user" | "ai";
  text: string;
  createdAt: string;
  sources?: { title: string; url: string }[];
  showSources?: boolean;
  replyToText?: string;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email?: string } | undefined;
  Main: undefined;
  Chat: { chatId: string; conversation?: Conversation };
  NewChat: undefined;
  Feedback: undefined;
};

export type MainTabParamList = {
  Chats: undefined;
  Calls: undefined;
  AI: undefined;
  Profile: undefined;
};

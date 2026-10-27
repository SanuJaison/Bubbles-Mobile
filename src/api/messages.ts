import api from "./client";
import type { Message, MessageReaction } from "../types";

export type PickedFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  duration?: number;
  waveform?: number[];
};

const buildMessageFormData = (
  chatId: string,
  text: string,
  files: PickedFile[] = [],
  replyTo?: string | null,
  audioMeta?: { duration: number; waveform?: number[] }
) => {
  const form = new FormData();
  form.append("chatId", chatId);
  form.append("text", text);

  if (replyTo) {
    form.append("replyTo", replyTo);
  }

  if (audioMeta) {
    form.append("duration", String(Math.max(0, audioMeta.duration || 0)));
    form.append("waveform", JSON.stringify(audioMeta.waveform || []));
  }

  files.forEach((file, index) => {
    const name = file.name || `attachment-${index + 1}`;
    const type = file.type || "application/octet-stream";

    if (typeof file.uri === "string" && file.uri.startsWith("blob:")) {
      // Web previews use blob URLs. React Native uses file:// or content://.
      form.append("files", {
        uri: file.uri,
        name,
        type,
      } as any);
      return;
    }

    form.append("files", {
      uri: file.uri,
      name,
      type,
    } as any);
  });

  return form;
};

export const getChatMessagesAPI = (chatId: string) =>
  api.get<{ messages: Message[] }>(`/messages/chat/${chatId}`);

export const sendMessageAPI = (
  chatId: string,
  text: string,
  files: PickedFile[] = [],
  replyTo?: string | null,
  audioMeta?: { duration: number; waveform?: number[] }
) => {
  const form = buildMessageFormData(
    chatId,
    text,
    files,
    replyTo,
    audioMeta
  );
  return api.post<{ data: Message }>("/messages", form);
};

export const markMessagesAsReadAPI = (chatId: string) =>
  api.patch(`/messages/read/${chatId}`);

export const markMessagesAsDeliveredAPI = (chatId: string) =>
  api.patch(`/messages/delivered/${chatId}`);

export const deleteMessageAPI = (messageId: string) =>
  api.delete(`/messages/${messageId}`);

export const editMessageAPI = (messageId: string, text: string) =>
  api.patch<{ data: Message }>(`/messages/${messageId}`, { text });

export const forwardMessageAPI = (messageId: string, chatIds: string[]) =>
  api.post("/messages/forward", { messageId, chatIds });

export const toggleMessageReactionAPI = (messageId: string, emoji: string) =>
  api.patch<{ reactions: MessageReaction[] }>(
    `/messages/${messageId}/reaction`,
    { emoji }
  );

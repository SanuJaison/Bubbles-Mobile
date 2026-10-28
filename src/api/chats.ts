import api from "./client";
import type { Chat } from "../types";

export const getMyChatsAPI = () =>
  api.get<{ chats: Chat[] }>("/chats");

export const getChatByIdAPI = (chatId: string) =>
  api.get<{ chat: Chat }>(`/chats/${chatId}`);

export const createOrGetChatAPI = (userId: string) =>
  api.post<{ chat: Chat }>("/chats", { userId });

export const createGroupAPI = (payload: {
  name: string;
  description?: string;
  participantIds: string[];
}) => api.post<{ chat: Chat }>("/chats/group", payload);

export const deleteChatAPI = (chatId: string) =>
  api.delete(`/chats/${chatId}`);

export const clearChatAPI = (chatId: string) =>
  api.delete(`/messages/chat/${chatId}`);

export const addGroupMembersAPI = (chatId: string, participantIds: string[]) =>
  api.post<{ chat: Chat }>(`/chats/${chatId}/members`, { participantIds });

export const leaveGroupAPI = (chatId: string) =>
  api.post(`/chats/${chatId}/leave`);

export const deleteGroupAPI = (chatId: string) =>
  api.delete(`/chats/${chatId}/group`);

export const reportChatAPI = (
  chatId: string,
  payload: { reason: string; details?: string }
) => api.post(`/chats/${chatId}/report`, payload);

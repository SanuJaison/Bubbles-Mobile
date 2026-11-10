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

export type GroupAvatarImage = {
  uri: string;
  name: string;
  type: string;
};

export const updateGroupAPI = (
  chatId: string,
  payload: {
    name?: string;
    description?: string;
    avatar?: GroupAvatarImage | null;
  }
) => {
  const form = new FormData();

  if (typeof payload.name === "string") {
    form.append("name", payload.name);
  }

  if (typeof payload.description === "string") {
    form.append("description", payload.description);
  }

  if (payload.avatar) {
    form.append("avatar", {
      uri: payload.avatar.uri,
      name: payload.avatar.name,
      type: payload.avatar.type,
    } as any);
  }

  return api.patch<{ chat: Chat }>(`/chats/${chatId}/group`, form);
};

export const removeGroupMemberAPI = (chatId: string, userId: string) =>
  api.delete<{ chat: Chat }>(`/chats/${chatId}/members/${userId}`);

export const setGroupAdminAPI = (
  chatId: string,
  userId: string,
  isAdmin: boolean
) =>
  api.patch<{ chat: Chat }>(`/chats/${chatId}/members/${userId}/admin`, {
    isAdmin,
  });

export const updateGroupPermissionsAPI = (
  chatId: string,
  payload: {
    sendMessages?: "all" | "admins";
    addMembers?: "all" | "admins";
    editInfo?: "all" | "admins";
  }
) => api.patch<{ chat: Chat }>(`/chats/${chatId}/permissions`, payload);

export const leaveGroupAPI = (chatId: string) =>
  api.post(`/chats/${chatId}/leave`);

export const deleteGroupAPI = (chatId: string) =>
  api.delete(`/chats/${chatId}/group`);

export const reportChatAPI = (
  chatId: string,
  payload: { reason: string; details?: string }
) => api.post(`/chats/${chatId}/report`, payload);

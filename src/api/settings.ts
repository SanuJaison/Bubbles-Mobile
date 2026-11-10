import api from "./client";
import type { User } from "../types";

export type Visibility = "everyone" | "contacts" | "nobody";

export type UserSettings = {
  enterToSend: boolean;
  messageNotifications: boolean;
  notificationSound: boolean;
  readReceipts: boolean;
  onlineStatus: boolean;
  profilePhotoVisibility: Visibility;
  lastSeenVisibility: Visibility;
};

export const updateUserSettingsAPI = (updates: Partial<UserSettings>) =>
  api.patch<{ user: User }>("/users/settings", updates);

export const changePasswordAPI = (newPassword: string) =>
  api.patch<{ token: string }>("/users/password", { newPassword });

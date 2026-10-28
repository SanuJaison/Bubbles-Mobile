import api from "./client";
import type { User } from "../types";

export const loginAPI = (identifier: string, password: string) =>
  api.post<{ token: string; user: User }>("/users/login", {
    identifier,
    password,
  });

export const registerAPI = (payload: {
  name: string;
  username: string;
  email: string;
  password: string;
}) => api.post("/users/register", payload);

export const getProfileAPI = () =>
  api.get<{ user: User }>("/users/profile");

export type ProfileImage = {
  uri: string;
  name: string;
  type: string;
};

export const updateProfileAPI = (payload: {
  name: string;
  username: string;
  bio?: string;
  profilePicture?: ProfileImage | null;
}) => {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("username", payload.username);
  form.append("bio", payload.bio || "");

  if (payload.profilePicture) {
    form.append("profilePicture", {
      uri: payload.profilePicture.uri,
      name: payload.profilePicture.name,
      type: payload.profilePicture.type,
    } as any);
  }

  return api.patch<{ user: User }>("/users/profile", form);
};

export const getAllUsersAPI = () => api.get<{ users: User[] }>("/users/all");

export const toggleBlockUserAPI = (userId: string) =>
  api.patch<{ blocked: boolean; user: User }>(`/users/block/${userId}`);

export const reportUserAPI = (
  userId: string,
  payload: { reason: string; details?: string; chatId?: string }
) => api.post(`/users/report/${userId}`, payload);

export const recordDeviceAPI = (deviceId: string) =>
  api.post("/users/device", { deviceId });

export const forgotPasswordAPI = (email: string) =>
  api.post("/users/forgot-password", { email });

export const resendVerificationAPI = (email: string) =>
  api.post("/users/resend-verification", { email });

export const verifyEmailAPI = (token: string) =>
  api.post("/users/verify-email", { token });

export const submitFeedbackAPI = (payload: {
  name?: string;
  email?: string;
  category: "suggestion" | "bug" | "feature" | "other";
  message: string;
  page?: string;
  source?: "web" | "android" | "windows";
}) => api.post("/feedback", payload);

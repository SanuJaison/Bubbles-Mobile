import { create } from "axios";
import { API_URL } from "../config";

let authToken: string | null = null;

export const setApiToken = (token: string | null) => {
  authToken = token;
};

const api = create({
  baseURL: API_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const getErrorMessage = (
  error: any,
  fallback = "Something went wrong. Please try again."
) => {
  const responseMessage = error?.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  if (error?.code === "ECONNABORTED") {
    return "The request took too long. Check your connection and try again.";
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export const getStatusCode = (error: any) =>
  Number(error?.response?.status) || 0;

export default api;

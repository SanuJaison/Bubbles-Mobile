import api from "./client";

export type CallStatus = "completed" | "missed" | "declined" | "cancelled";

export type LogCallPayload = {
  chatId: string;
  callType: "audio" | "video";
  status: CallStatus;
  duration: number;
};

/**
 * Writes the call-history bubble into the chat. Only the caller does this, so
 * a finished call never produces two log messages.
 */
export const logCallAPI = (payload: LogCallPayload) =>
  api.post("/messages/call-log", payload);

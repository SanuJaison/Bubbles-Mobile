import type { Message } from "../types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const asDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sameDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

export const formatClockTime = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "";
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
};

export const formatListTime = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "";

  const now = new Date();
  if (sameDay(date, now)) return formatClockTime(value);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";

  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays >= 0 && diffDays < 7) return WEEKDAYS[date.getDay()];

  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

export const formatDayLabel = (value?: string | null) => {
  const date = asDate(value);
  if (!date) return "";

  const now = new Date();
  if (sameDay(date, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";

  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${
    MONTHS[date.getMonth()]
  } ${date.getFullYear()}`;
};

export const sameMessageDay = (first?: string | null, second?: string | null) => {
  const firstDate = asDate(first);
  const secondDate = asDate(second);
  if (!firstDate || !secondDate) return false;
  return sameDay(firstDate, secondDate);
};

export const getInitials = (name?: string) => {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const formatFileSize = (bytes?: number) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDuration = (seconds?: number) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remaining = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
};

export const messagePreview = (message?: Message | null) => {
  if (!message) return "";
  if (message.isDeleted) return "This message was deleted";

  const text = String(message.text || "").trim();
  if (text) return text;

  if (message.messageType === "image") return "Photo";
  if (message.messageType === "audio") return "Voice message";
  if (message.messageType === "file") return "File";
  if (message.messageType === "call") {
    return message.callInfo?.callType === "video" ? "Video call" : "Voice call";
  }
  if (message.messageType === "system") return text || "Chat updated";

  return "";
};

export const truncate = (value: string, length = 80) => {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
};

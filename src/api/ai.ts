import api from "./client";

export type AIMessagePayload = {
  role: "user" | "assistant";
  content: string;
};

export const chatWithAIAPI = (messages: AIMessagePayload[]) =>
  api.post<{
    reply: string;
    sources?: { title: string; url: string }[];
    showSources?: boolean;
    usedWebSearch?: boolean;
  }>("/ai/chat", { messages });

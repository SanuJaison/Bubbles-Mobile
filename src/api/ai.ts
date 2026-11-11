import api from "./client";

export type AIMessagePayload = {
  role: "user" | "assistant";
  content: string;
};

export type AIFile = {
  uri: string;
  name: string;
  type: string;
};

export type AIReply = {
  reply: string;
  sources?: { title: string; url: string }[];
  showSources?: boolean;
  usedWebSearch?: boolean;
};

const appendFiles = (form: FormData, files: AIFile[], field = "files") => {
  files.forEach((file, index) => {
    form.append(field, {
      uri: file.uri,
      name: file.name || `attachment-${index + 1}`,
      type: file.type || "application/octet-stream",
    } as any);
  });
};

export const chatWithAIAPI = (messages: AIMessagePayload[]) =>
  api.post<AIReply>("/ai/chat", { messages });

export const chatWithAIFilesAPI = (
  messages: AIMessagePayload[],
  files: AIFile[] = []
) => {
  if (files.length === 0) {
    return chatWithAIAPI(messages);
  }

  const form = new FormData();
  form.append("messages", JSON.stringify(messages));
  appendFiles(form, files);

  return api.post<AIReply>("/ai/chat", form);
};

export const transcribeAudioAPI = (file: AIFile) => {
  const form = new FormData();
  appendFiles(form, [file], "file");

  return api.post<{ text: string }>("/ai/transcribe", form);
};

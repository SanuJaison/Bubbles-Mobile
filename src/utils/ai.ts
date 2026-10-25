export const cleanAIText = (value: string) =>
  String(value || "")
    .replace(/【[^】]*】/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*[-*+•–—][ \t]+/gm, "")
    .replace(/^[ \t]*\d+[.)][ \t]+/gm, "")
    .replace(/\*(\S(?:[^*\n]*?\S)?)\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const makeLocalId = (prefix = "local") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

import { Linking } from "react-native";

const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/i;

const BARE_DOMAIN =
  /^((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|app|dev|co|ai|me|xyz|info|biz|edu|gov|us|uk|in|de|fr|jp|br|au|ca|nl|se|no|es|it|ru|ch|tv|ly|gg|so|to|site|online|store|shop|link|tech|cloud|page|blog|wiki|news|live|pro|club|space|website|fun|world|today|life|email|social|network|media|design|studio|agency|solutions|systems|services|company|group|team|digital|global|zone|one|run|fit|art|photography|gallery|games|gaming|money|finance|bank|insurance|law|legal|doctor|health|care|clinic|hospital|school|university|academy|education|training|courses|learn|study|travel|tours|hotel|restaurant|cafe|food|recipes|fashion|beauty|fitness|sports|music|movies|books)(?:\/[^\s<]*)?)$/i;

const SPLIT_PATTERN =
  /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|(?:https?:\/\/|www\.)[^\s<]+)/gi;

export type TextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; label: string };

const trimTrailingPunctuation = (value: string) => {
  const match = value.match(/[.,!?;:)\]}'">]+$/);
  if (!match) return { url: value, trailing: "" };
  return {
    url: value.slice(0, -match[0].length),
    trailing: match[0],
  };
};

const normalizeUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  return `https://${value}`;
};

const isBareDomainLink = (value: string, text: string, index: number) => {
  if (!BARE_DOMAIN.test(value)) return false;

  const before = index > 0 ? text[index - 1] : "";
  const after = text[index + value.length] || "";

  if (before === "@" || before === "/" || before === ".") return false;
  if (after === "@") return false;

  return true;
};

export const splitTextWithLinks = (text: string): TextPart[] => {
  const value = String(text || "");
  if (!value) return [];

  const parts: TextPart[] = [];
  let cursor = 0;

  const pushText = (chunk: string) => {
    if (chunk) parts.push({ type: "text", value: chunk });
  };

  const matches: { start: number; end: number; label: string; url: string }[] =
    [];

  for (const match of value.matchAll(SPLIT_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const markdown = raw.match(MARKDOWN_LINK);

    if (markdown) {
      matches.push({
        start,
        end: start + raw.length,
        label: markdown[1],
        url: markdown[2],
      });
      continue;
    }

    const { url, trailing } = trimTrailingPunctuation(raw);
    const normalized = normalizeUrl(url);

    matches.push({
      start,
      end: start + url.length,
      label: trailing ? `${url}${trailing}` : url,
      url: normalized,
    });

    if (trailing) {
      // Keep punctuation outside the clickable area.
      matches[matches.length - 1].label = url;
      matches[matches.length - 1].end = start + url.length;
      matches.push({
        start: start + url.length,
        end: start + raw.length,
        label: trailing,
        url: "",
      });
    }
  }

  // Bare domains without a protocol. This second pass is deliberately
  // conservative so email addresses and URL paths are not turned into links.
  const barePattern =
    /\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|app|dev|co|ai|me|xyz|info|biz|edu|gov|us|uk|in|de|fr|jp|br|au|ca|nl|se|no|es|it|ru|ch|tv|ly|gg|so|to|site|online|store|shop|link|tech|cloud|page|blog|wiki|news|live|pro|club|space|website|fun|world|today|life|email|social|network|media|design|studio|agency|solutions|systems|services|company|group|team|digital|global|zone|one|run|fit|art|photography|gallery|games|gaming|money|finance|bank|insurance|law|legal|doctor|health|care|clinic|hospital|school|university|academy|education|training|courses|learn|study|travel|tours|hotel|restaurant|cafe|food|recipes|fashion|beauty|fitness|sports|music|movies|books)(?:\/[^\s<]*)?)\b/gi;

  for (const match of value.matchAll(barePattern)) {
    const raw = match[0];
    const start = match.index ?? 0;

    if (matches.some((entry) => start < entry.end && start + raw.length > entry.start)) {
      continue;
    }

    if (!isBareDomainLink(raw, value, start)) continue;

    const { url, trailing } = trimTrailingPunctuation(raw);
    matches.push({
      start,
      end: start + url.length,
      label: url,
      url: normalizeUrl(url),
    });

    if (trailing) {
      matches.push({
        start: start + url.length,
        end: start + raw.length,
        label: trailing,
        url: "",
      });
    }
  }

  matches.sort((first, second) => first.start - second.start);

  for (const match of matches) {
    if (match.start < cursor) continue;
    pushText(value.slice(cursor, match.start));

    if (match.url) {
      parts.push({ type: "link", value: match.url, label: match.label });
    } else {
      pushText(match.label);
    }

    cursor = match.end;
  }

  pushText(value.slice(cursor));
  return parts;
};

export const openExternalUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } catch {
    // A broken or unsupported link should never crash the chat.
  }
};

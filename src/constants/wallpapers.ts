export type WallpaperPreset = {
  id: string;
  name: string;
  /** Three stops, painted diagonally like the website presets. */
  colors: readonly [string, string, string];
  darkColors: readonly [string, string, string];
};

/**
 * The same six scenes the website offers, translated from CSS gradients into
 * three-stop linear gradients that React Native can paint natively.
 */
export const WALLPAPERS: WallpaperPreset[] = [
  {
    id: "aurora",
    name: "Aurora",
    colors: ["#e9dcff", "#f3ecff", "#fbe9f6"],
    darkColors: ["#0d0a1c", "#0c0a17", "#130b18"],
  },
  {
    id: "bubbles",
    name: "Bubbles",
    colors: ["#dbeafe", "#e9d5ff", "#cffafe"],
    darkColors: ["#080a14", "#0c0b1e", "#061418"],
  },
  {
    id: "blush",
    name: "Blush",
    colors: ["#ffe0e9", "#ffd0e0", "#ffdac6"],
    darkColors: ["#240f1a", "#2c1120", "#2a150e"],
  },
  {
    id: "lavender",
    name: "Lavender",
    colors: ["#ece4ff", "#dcd6ff", "#d7e0ff"],
    darkColors: ["#150f2b", "#141235", "#0f1430"],
  },
  {
    id: "dusk",
    name: "Dusk",
    colors: ["#4c1d95", "#6d28d9", "#a21caf"],
    darkColors: ["#170c2e", "#22103f", "#331347"],
  },
  {
    id: "midnight",
    name: "Midnight",
    colors: ["#0b1224", "#131a3a", "#1e1b4b"],
    darkColors: ["#04060d", "#0a0f24", "#100f2e"],
  },
];

export const DEFAULT_WALLPAPER_ID = "aurora";

export const presetValue = (id: string) => `preset:${id}`;

export const DEFAULT_WALLPAPER_VALUE = presetValue(DEFAULT_WALLPAPER_ID);

export const findWallpaper = (value?: string | null) => {
  if (!value) return null;

  const id = value.startsWith("preset:") ? value.slice(7) : "";

  if (!id) return null;

  return WALLPAPERS.find((item) => item.id === id) || null;
};

/** True when the stored value points at a photo instead of a preset. */
export const isCustomWallpaper = (value?: string | null) =>
  Boolean(value && !value.startsWith("preset:"));

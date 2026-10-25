import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "system" | "light" | "dark";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSoft: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  warning: string;
  input: string;
  bubbleMine: string;
  bubbleMineText: string;
  bubbleTheirs: string;
  bubbleTheirsText: string;
  bubbleSystem: string;
  overlay: string;
  tabBar: string;
  white: string;
  black: string;
};

const darkColors: ThemeColors = {
  background: "#090610",
  surface: "#120D1D",
  surfaceAlt: "#191226",
  elevated: "#211832",
  border: "#2A203D",
  borderStrong: "#3B2C54",
  text: "#F8F5FF",
  textMuted: "#A79FC2",
  textSoft: "#7D7398",
  primary: "#A855F7",
  primaryDeep: "#7C3AED",
  primarySoft: "#2A1A44",
  accent: "#F472B6",
  accentSoft: "#3A1830",
  success: "#34D399",
  danger: "#F87171",
  warning: "#FBBF24",
  input: "#171022",
  bubbleMine: "#7C3AED",
  bubbleMineText: "#FFFFFF",
  bubbleTheirs: "#1D152D",
  bubbleTheirsText: "#F8F5FF",
  bubbleSystem: "#241B38",
  overlay: "rgba(4, 2, 9, 0.78)",
  tabBar: "#0F0A18",
  white: "#FFFFFF",
  black: "#000000",
};

const lightColors: ThemeColors = {
  background: "#F8F5FF",
  surface: "#FFFFFF",
  surfaceAlt: "#F1EBFA",
  elevated: "#FFFFFF",
  border: "#E5DDF2",
  borderStrong: "#D4C7E8",
  text: "#21172F",
  textMuted: "#6F6485",
  textSoft: "#978CAB",
  primary: "#7C3AED",
  primaryDeep: "#6D28D9",
  primarySoft: "#EDE4FF",
  accent: "#DB2777",
  accentSoft: "#FCE7F3",
  success: "#059669",
  danger: "#DC2626",
  warning: "#D97706",
  input: "#F5F0FC",
  bubbleMine: "#7C3AED",
  bubbleMineText: "#FFFFFF",
  bubbleTheirs: "#FFFFFF",
  bubbleTheirsText: "#21172F",
  bubbleSystem: "#EDE4FF",
  overlay: "rgba(25, 15, 40, 0.48)",
  tabBar: "#FFFFFF",
  white: "#FFFFFF",
  black: "#000000",
};

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: "light" | "dark";
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "bubbles_theme_mode";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {});
  }, []);

  const scheme: "light" | "dark" =
    mode === "system" ? (systemScheme === "light" ? "light" : "dark") : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      isDark: scheme === "dark",
      colors: scheme === "dark" ? darkColors : lightColors,
      setMode,
    }),
    [mode, scheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
};

export const brandGradient = ["#7C3AED", "#A855F7", "#EC4899"] as const;
export const bubbleGradient = ["#7C3AED", "#A855F7"] as const;
export const subtleGradient = ["#241537", "#120D1D"] as const;

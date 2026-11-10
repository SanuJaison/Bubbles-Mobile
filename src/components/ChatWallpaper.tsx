import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { findWallpaper, isCustomWallpaper } from "../constants/wallpapers";
import { useTheme } from "../theme";

type ChatWallpaperProps = {
  value?: string | null;
};

/**
 * Paints the conversation background. Presets are native gradients; custom
 * photos get a scrim so message bubbles keep their contrast in both themes.
 */
export const ChatWallpaper = ({ value }: ChatWallpaperProps) => {
  const { isDark } = useTheme();

  if (isCustomWallpaper(value)) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: String(value) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(6, 4, 12, 0.62)"
                : "rgba(255, 255, 255, 0.62)",
            },
          ]}
        />
      </View>
    );
  }

  const preset = findWallpaper(value);

  if (!preset) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  return (
    <LinearGradient
      pointerEvents="none"
      colors={isDark ? [...preset.darkColors] : [...preset.colors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
};

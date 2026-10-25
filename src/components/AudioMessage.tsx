import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import type { Attachment } from "../types";
import { formatDuration } from "../utils/format";

const DEFAULT_BARS = [
  0.35, 0.6, 0.45, 0.8, 0.55, 0.95, 0.4, 0.7, 0.5, 0.85, 0.6, 0.35,
  0.75, 0.5, 0.9, 0.45, 0.65, 0.8, 0.4, 0.6, 0.5, 0.7, 0.35, 0.55,
];

type AudioMessageProps = {
  file: Attachment;
  isMine: boolean;
};

export const AudioMessage = ({ file, isMine }: AudioMessageProps) => {
  const { colors } = useTheme();
  const player = useAudioPlayer(file.url, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || file.duration || 0;
  const progress =
    duration > 0 ? Math.min(1, Math.max(0, status.currentTime / duration)) : 0;
  const bars =
    file.waveform && file.waveform.length > 0
      ? file.waveform
          .slice(0, 28)
          .map((value) =>
            Math.max(0.15, Math.min(1, value > 1 ? value / 100 : value))
          )
      : DEFAULT_BARS;

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (
      status.didJustFinish ||
      (duration > 0 && status.currentTime >= duration - 0.05)
    ) {
      await player.seekTo(0);
    }

    player.play();
  };

  return (
    <Pressable
      onPress={togglePlayback}
      accessibilityRole="button"
      accessibilityLabel={
        status.playing ? "Pause voice message" : "Play voice message"
      }
      style={[
        styles.row,
        {
          backgroundColor: isMine
            ? "rgba(255,255,255,0.12)"
            : colors.surfaceAlt,
        },
      ]}
    >
      <View
        style={[
          styles.playCircle,
          {
            backgroundColor: isMine
              ? "rgba(255,255,255,0.2)"
              : colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={15}
          color={isMine ? "#FFFFFF" : colors.primary}
        />
      </View>

      <View style={styles.middle}>
        <View style={styles.waveform}>
          {bars.map((bar, index) => {
            const active = index / bars.length <= progress;
            return (
              <View
                key={`${index}-${bar}`}
                style={[
                  styles.bar,
                  {
                    height: 5 + bar * 15,
                    backgroundColor: isMine ? "#FFFFFF" : colors.primary,
                    opacity: active ? 1 : 0.32,
                  },
                ]}
              />
            );
          })}
        </View>
        <View
          style={[
            styles.track,
            {
              backgroundColor: isMine
                ? "rgba(255,255,255,0.25)"
                : colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.trackFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: isMine ? "#FFFFFF" : colors.primary,
              },
            ]}
          />
        </View>
      </View>

      <Text
        style={[
          styles.time,
          { color: isMine ? "rgba(255,255,255,0.78)" : colors.textMuted },
        ]}
      >
        {formatDuration(
          duration > 0 ? Math.max(0, duration - status.currentTime) : file.duration
        )}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minWidth: 220,
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: {
    flex: 1,
    gap: 4,
  },
  waveform: {
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    overflow: "hidden",
  },
  bar: {
    width: 2.5,
    borderRadius: 2,
  },
  track: {
    height: 2,
    borderRadius: 2,
    overflow: "hidden",
  },
  trackFill: {
    height: 2,
    borderRadius: 2,
  },
  time: {
    minWidth: 30,
    textAlign: "right",
    fontSize: 10.5,
    fontWeight: "700",
  },
});

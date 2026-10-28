import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import type { Attachment } from "../types";
import { formatDuration, formatFileSize } from "../utils/format";

type VideoMessageProps = {
  file: Attachment;
  isMine: boolean;
};

const VideoPlayerModal = ({
  file,
  onClose,
}: {
  file: Attachment;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();

  // The player is created only while the modal is mounted, so leaving the
  // viewer releases the decoder instead of keeping every clip loaded.
  const player = useVideoPlayer({ uri: file.url }, (instance) => {
    instance.loop = false;
    instance.play();
  });

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.playerOverlay}>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityLabel="Close video"
          style={[styles.playerClose, { top: insets.top + 10 }]}
        >
          <Ionicons name="close" size={25} color="#FFFFFF" />
        </Pressable>

        <VideoView
          player={player}
          style={styles.player}
          contentFit="contain"
          nativeControls
        />

        <View
          style={[
            styles.playerFooter,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Text numberOfLines={1} style={styles.playerName}>
            {file.name}
          </Text>
          {file.size > 0 ? (
            <Text style={styles.playerSize}>{formatFileSize(file.size)}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export const VideoMessage = ({ file, isMine }: VideoMessageProps) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const duration = Number(file.duration || 0);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={`Play video ${file.name}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isMine ? "rgba(0,0,0,0.32)" : colors.surfaceAlt,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.preview}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>

          {duration > 0 ? (
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name="videocam-outline"
            size={15}
            color={isMine ? "#FFFFFF" : colors.primary}
          />
          <Text
            numberOfLines={1}
            style={[styles.fileName, { color: isMine ? "#FFFFFF" : colors.text }]}
          >
            {file.name}
          </Text>
        </View>
      </Pressable>

      {open ? (
        <VideoPlayerModal file={file} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 224,
    maxWidth: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
  },
  preview: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  playCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  durationPill: {
    position: "absolute",
    right: 8,
    bottom: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  durationText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  fileName: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    fontWeight: "600",
  },
  playerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
  },
  playerClose: {
    position: "absolute",
    right: 14,
    zIndex: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  player: {
    width: "100%",
    height: "68%",
  },
  playerFooter: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 0,
    gap: 3,
  },
  playerName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  playerSize: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.7)",
  },
});

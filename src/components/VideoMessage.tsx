import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import type { Attachment } from "../types";
import { formatDuration, formatFileSize } from "../utils/format";

type VideoMessageProps = {
  file: Attachment;
  isMine: boolean;
};

// Generating a thumbnail costs a decode, so keep the result for the session.
// The file itself lives in the cache directory, which survives re-renders.
const thumbnailCache = new Map<string, string>();

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
  const [thumbnail, setThumbnail] = useState<string | null>(
    thumbnailCache.get(file.url) || null
  );
  const duration = Number(file.duration || 0);

  useEffect(() => {
    if (thumbnail) return;

    let active = true;

    VideoThumbnails.getThumbnailAsync(file.url, {
      time: 400,
      quality: 0.7,
    })
      .then((result) => {
        if (!result?.uri) return;
        thumbnailCache.set(file.url, result.uri);
        if (active) setThumbnail(result.uri);
      })
      .catch(() => {
        // A remote or unsupported clip just keeps the placeholder.
      });

    return () => {
      active = false;
    };
  }, [file.url, thumbnail]);

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
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={160}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name="videocam-outline"
                size={30}
                color="rgba(255,255,255,0.65)"
              />
            </View>
          )}

          <View style={styles.scrim} />

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
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0712",
  },
  placeholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 14, 32, 0.9)",
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  playCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
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

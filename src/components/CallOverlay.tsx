import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "./Avatar";
import { useCall } from "../context/CallContext";
import { brandGradient, useTheme } from "../theme";
import { formatDuration } from "../utils/format";

type WebRTCModule = typeof import("react-native-webrtc");

let rtcModule: WebRTCModule | null = null;
let rtcLoaded = false;

const loadWebRTC = (): WebRTCModule | null => {
  if (rtcLoaded) return rtcModule;
  rtcLoaded = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rtcModule = require("react-native-webrtc") as WebRTCModule;
  } catch {
    rtcModule = null;
  }

  return rtcModule;
};

const RTCVideo = ({
  stream,
  mirror = false,
  style,
}: {
  stream: any;
  mirror?: boolean;
  style?: object;
}) => {
  const module = loadWebRTC();
  const RTCView = module?.RTCView;

  if (!stream || !RTCView) {
    return <View style={[style, { backgroundColor: "#0B0712" }]} />;
  }

  return (
    <RTCView
      streamURL={stream.toURL()}
      style={style}
      objectFit="cover"
      mirror={mirror}
      zOrder={mirror ? 1 : 0}
    />
  );
};

const ControlButton = ({
  icon,
  label,
  onPress,
  background,
  color = "#FFFFFF",
  size = 60,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  background: string;
  color?: string;
  size?: number;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityLabel={label}
    style={({ pressed }) => [
      styles.control,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        opacity: pressed ? 0.75 : 1,
      },
    ]}
  >
    <Ionicons name={icon} size={size * 0.42} color={color} />
  </Pressable>
);

export const CallOverlay = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    call,
    localStream,
    remoteStream,
    micMuted,
    cameraOff,
    remoteMuted,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useCall();

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!call?.startedAt) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [call?.startedAt]);

  if (!call) return null;

  const isVideo = call.type === "video";
  const isIncomingRinging =
    call.direction === "incoming" && call.status === "ringing";
  const isOutgoingRinging =
    call.direction === "outgoing" && call.status === "ringing";
  const isActive = call.status === "active";
  const elapsed = call.startedAt
    ? Math.max(0, Math.round((now - call.startedAt) / 1000))
    : 0;

  const statusLabel = isIncomingRinging
    ? `Incoming ${isVideo ? "video" : "voice"} call`
    : isOutgoingRinging
      ? "Calling..."
      : isActive
        ? formatDuration(elapsed)
        : "Connecting...";

  const showRemoteVideo = isVideo && isActive && Boolean(remoteStream);

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Back should not drop a live call; use the red button instead.
      }}
    >
      <View style={styles.root}>
        {showRemoteVideo ? (
          <RTCVideo stream={remoteStream} style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient
            colors={[...brandGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View
          style={[
            styles.topBar,
            { paddingTop: Math.max(insets.top, 18) + 10 },
          ]}
        >
          <View style={styles.identity}>
            <Avatar
              name={call.remoteUser.name}
              uri={call.remoteUser.profilePicture}
              size={44}
            />
            <View style={styles.identityText}>
              <Text numberOfLines={1} style={styles.name}>
                {call.remoteUser.name}
              </Text>
              <Text numberOfLines={1} style={styles.status}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {remoteMuted ? (
            <View style={styles.remoteMuted}>
              <Ionicons name="mic-off" size={15} color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        {!showRemoteVideo ? (
          <View style={styles.center}>
            <View style={styles.avatarRing}>
              <Avatar
                name={call.remoteUser.name}
                uri={call.remoteUser.profilePicture}
                size={128}
              />
            </View>

            {call.status === "connecting" ? (
              <ActivityIndicator
                color="rgba(255,255,255,0.85)"
                style={styles.spinner}
              />
            ) : null}
          </View>
        ) : null}

        {isVideo && !showRemoteVideo && call.status !== "ringing" ? (
          <View style={styles.videoHint}>
            <Ionicons
              name={cameraOff ? "videocam-off" : "videocam"}
              size={15}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.videoHintText}>
              {remoteStream ? "Starting video..." : "Waiting for video..."}
            </Text>
          </View>
        ) : null}

        {isVideo && localStream && !cameraOff && call.status !== "ringing" ? (
          <View
            style={[
              styles.selfView,
              { top: Math.max(insets.top, 18) + 84 },
            ]}
          >
            <RTCVideo
              stream={localStream}
              mirror
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.controls,
            { paddingBottom: Math.max(insets.bottom, 22) + 16 },
          ]}
        >
          {isIncomingRinging ? (
            <View style={styles.answerRow}>
              <View style={styles.answerItem}>
                <ControlButton
                  icon="close"
                  label="Decline call"
                  onPress={rejectCall}
                  background={colors.danger}
                />
                <Text style={styles.controlLabel}>Decline</Text>
              </View>

              <View style={styles.answerItem}>
                <ControlButton
                  icon={isVideo ? "videocam" : "call"}
                  label="Accept call"
                  onPress={() => {
                    acceptCall().catch(() => {});
                  }}
                  background={colors.success}
                />
                <Text style={styles.controlLabel}>Accept</Text>
              </View>
            </View>
          ) : (
            <>
              {isActive || call.status === "connecting" ? (
                <View style={styles.toggleRow}>
                  <View style={styles.answerItem}>
                    <ControlButton
                      icon={micMuted ? "mic-off" : "mic"}
                      label={micMuted ? "Unmute" : "Mute"}
                      onPress={toggleMic}
                      background={
                        micMuted
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.18)"
                      }
                      color={micMuted ? "#1A1024" : "#FFFFFF"}
                      size={54}
                    />
                    <Text style={styles.controlLabel}>
                      {micMuted ? "Unmute" : "Mute"}
                    </Text>
                  </View>

                  {isVideo ? (
                    <View style={styles.answerItem}>
                      <ControlButton
                        icon={cameraOff ? "videocam-off" : "videocam"}
                        label={cameraOff ? "Turn camera on" : "Turn camera off"}
                        onPress={toggleCamera}
                        background={
                          cameraOff
                            ? "rgba(255,255,255,0.95)"
                            : "rgba(255,255,255,0.18)"
                        }
                        color={cameraOff ? "#1A1024" : "#FFFFFF"}
                        size={54}
                      />
                      <Text style={styles.controlLabel}>
                        {cameraOff ? "Camera on" : "Camera off"}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.endItem}>
                <ControlButton
                  icon="call"
                  label="End call"
                  onPress={() => endCall()}
                  background={colors.danger}
                  size={64}
                  color="#FFFFFF"
                />
                <Text style={styles.controlLabel}>
                  {isOutgoingRinging ? "Cancel" : "End call"}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#120D1D",
  },
  topBar: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  status: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12.5,
    fontWeight: "600",
  },
  remoteMuted: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    padding: 6,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  spinner: {
    marginTop: 20,
  },
  videoHint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 210,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  videoHintText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  selfView: {
    position: "absolute",
    right: 16,
    width: 104,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "#0B0712",
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 26,
    alignItems: "center",
    gap: 18,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    maxWidth: 340,
  },
  answerItem: {
    alignItems: "center",
    gap: 9,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 26,
  },
  endItem: {
    alignItems: "center",
    gap: 9,
  },
  control: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11.5,
    fontWeight: "700",
  },
});

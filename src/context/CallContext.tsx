import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Vibration } from "react-native";
import type { MediaStream as RNMediaStream } from "react-native-webrtc";
import { logCallAPI, type CallStatus } from "../api/calls";
import { userIdOf } from "../utils/chat";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import { useToast } from "./ToastContext";

// Public STUN covers most home networks. Carrier-grade NATs would also need a
// TURN relay, which the backend does not run yet.
const ICE_SERVERS = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const RING_TIMEOUT_MS = 60000;
const HISTORY_LIMIT = 100;

export type CallType = "audio" | "video";

export type CallPerson = {
  id: string;
  name: string;
  username?: string;
  profilePicture?: string;
};

export type ActiveCall = {
  id: string;
  type: CallType;
  direction: "outgoing" | "incoming";
  status: "ringing" | "connecting" | "active";
  remoteUser: CallPerson;
  chatId: string;
  startedAt: number | null;
};

export type CallHistoryEntry = {
  id: string;
  chatId: string;
  remoteUser: CallPerson;
  type: CallType;
  direction: "outgoing" | "incoming";
  status: CallStatus;
  duration: number;
  at: string;
};

export type StartCallInput = {
  userId: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  chatId: string;
  type?: CallType;
};

type CallContextValue = {
  call: ActiveCall | null;
  localStream: RNMediaStream | null;
  remoteStream: RNMediaStream | null;
  micMuted: boolean;
  cameraOff: boolean;
  remoteMuted: boolean;
  connectionState: string;
  supported: boolean;
  history: CallHistoryEntry[];
  startCall: (input: StartCallInput) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: (options?: { notifyRemote?: boolean; status?: CallStatus }) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  clearHistory: () => Promise<void>;
};

type WebRTCModule = typeof import("react-native-webrtc");

// react-native-webrtc ships native code that Expo Go does not include. Loading
// it lazily keeps the rest of the app usable there; calls simply report that
// they need the installed APK.
let rtcModule: WebRTCModule | null = null;
let rtcLoaded = false;

const loadWebRTC = (): WebRTCModule | null => {
  if (rtcLoaded) return rtcModule;
  rtcLoaded = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rtcModule = require("react-native-webrtc") as WebRTCModule;
    rtcModule?.registerGlobals?.();
  } catch {
    rtcModule = null;
  }

  return rtcModule;
};

const describeMediaError = (error: any, type: CallType) => {
  const isVideo = type === "video";

  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return isVideo
        ? "Camera and microphone permission was denied. Allow both in your device settings."
        : "Microphone permission was denied. Allow it in your device settings.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return isVideo
        ? "No camera or microphone was found on this device."
        : "No microphone was found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return isVideo
        ? "The camera or microphone is already in use by another app."
        : "The microphone is already in use by another app.";
    default:
      return isVideo
        ? "Could not start the camera or microphone."
        : "Could not start the microphone.";
  }
};

const storageKey = (userId?: string | null) =>
  `bubblesCallHistory:${userId || "guest"}`;

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const currentUserId = userIdOf(user);

  const rtc = loadWebRTC();
  const supported = Boolean(rtc?.mediaDevices?.getUserMedia);

  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<RNMediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<RNMediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [connectionState, setConnectionState] = useState("new");
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);

  const callRef = useRef<ActiveCall | null>(null);
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<RNMediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<any[]>([]);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizedRef = useRef(false);
  const historyLoadedFor = useRef("");

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  // History is per account, so switching accounts never leaks old calls.
  useEffect(() => {
    let active = true;

    if (historyLoadedFor.current === currentUserId) return;

    AsyncStorage.getItem(storageKey(currentUserId))
      .then((raw) => {
        if (!active) return;

        if (!raw) {
          setHistory([]);
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          setHistory(Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : []);
        } catch {
          setHistory([]);
        }
      })
      .catch(() => {
        if (active) setHistory([]);
      })
      .finally(() => {
        if (!active) return;
        historyLoadedFor.current = currentUserId;
      });

    return () => {
      active = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (historyLoadedFor.current !== currentUserId) return;

    AsyncStorage.setItem(
      storageKey(currentUserId),
      JSON.stringify(history.slice(0, HISTORY_LIMIT))
    ).catch(() => {});
  }, [history, currentUserId]);

  const stopRing = useCallback(() => {
    Vibration.cancel();

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopRing();

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    const pc = pcRef.current;

    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;

      try {
        pc.close();
      } catch {
        // Already closed.
      }
    }

    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    callIdRef.current = null;
    remoteUserIdRef.current = null;
    finalizedRef.current = false;

    setLocalStream(null);
    setRemoteStream(null);
    setMicMuted(false);
    setCameraOff(false);
    setRemoteMuted(false);
    setConnectionState("new");
    setCall(null);
  }, [stopRing]);

  // Records the call once, no matter which side ends it. Local history is
  // written for both directions; the server bubble is only written by the
  // caller, exactly like the website.
  const finalize = useCallback(
    (status: CallStatus) => {
      const activeCall = callRef.current;

      if (!activeCall || finalizedRef.current) return;

      finalizedRef.current = true;

      const duration = activeCall.startedAt
        ? Math.max(0, Math.round((Date.now() - activeCall.startedAt) / 1000))
        : 0;

      const entry: CallHistoryEntry = {
        id: activeCall.id,
        chatId: activeCall.chatId,
        remoteUser: activeCall.remoteUser,
        type: activeCall.type,
        direction: activeCall.direction,
        status,
        duration,
        at: new Date().toISOString(),
      };

      setHistory((previous) =>
        [entry, ...previous.filter((item) => item.id !== entry.id)].slice(
          0,
          HISTORY_LIMIT
        )
      );

      if (activeCall.direction === "outgoing" && activeCall.chatId) {
        logCallAPI({
          chatId: activeCall.chatId,
          callType: activeCall.type,
          status,
          duration,
        }).catch(() => {
          // The call already ended; a missing history bubble is not fatal.
        });
      }
    },
    []
  );

  const getLocalMedia = useCallback(async (type: CallType) => {
    const module = loadWebRTC();

    if (!module?.mediaDevices?.getUserMedia) {
      throw new Error("unsupported");
    }

    const wantsVideo = type === "video";

    try {
      const stream = await module.mediaDevices.getUserMedia({
        audio: true,
        video: wantsVideo
          ? {
              width: 1280,
              height: 720,
              frameRate: 30,
              facingMode: "user",
            }
          : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraOff(wantsVideo && stream.getVideoTracks().length === 0);

      return stream;
    } catch (error) {
      if (!wantsVideo) throw error;

      // A blocked or busy camera should not kill the call: continue with
      // audio so the conversation still works.
      const audioOnly = await module.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      localStreamRef.current = audioOnly;
      setLocalStream(audioOnly);
      setCameraOff(true);
      showToast("Camera unavailable — continuing with audio only.", "info");

      return audioOnly;
    }
  }, [showToast]);

  const createPeerConnection = useCallback(
    (remoteUserId: string, callId: string) => {
      const module = loadWebRTC();

      if (!module) throw new Error("unsupported");

      const pc = new module.RTCPeerConnection(ICE_SERVERS);

      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          socket?.emit("call:ice", {
            callId,
            toUserId: remoteUserId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event: any) => {
        const [stream] = event.streams || [];

        if (stream) setRemoteStream(stream);
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);

        if (pc.connectionState === "failed") {
          showToast("Call connection lost", "error");
          finalize(callRef.current?.startedAt ? "completed" : "missed");
          cleanup();
        }
      };

      pcRef.current = pc;

      return pc;
    },
    [socket, showToast, finalize, cleanup]
  );

  const endCall = useCallback(
    ({ notifyRemote = true, status }: { notifyRemote?: boolean; status?: CallStatus } = {}) => {
      const activeCall = callRef.current;
      const callId = callIdRef.current || activeCall?.id;

      if (activeCall) {
        const finalStatus =
          status ||
          (activeCall.startedAt
            ? "completed"
            : activeCall.direction === "outgoing"
              ? "cancelled"
              : "declined");

        finalize(finalStatus);
      }

      if (notifyRemote && socket && callId && remoteUserIdRef.current) {
        socket.emit("call:end", {
          callId,
          toUserId: remoteUserIdRef.current,
        });
      }

      cleanup();
    },
    [socket, finalize, cleanup]
  );

  const startCall = useCallback(
    async ({
      userId,
      name,
      username,
      profilePicture,
      chatId,
      type = "audio",
    }: StartCallInput) => {
      if (!supported) {
        showToast(
          "Calling needs the installed Bubbles app — it is not available in Expo Go.",
          "error"
        );
        return;
      }

      if (!socket?.connected) {
        showToast("Still connecting — try again in a second", "error");
        return;
      }

      if (!userId) {
        showToast("This contact can't be called", "error");
        return;
      }

      if (!chatId) {
        showToast("Can't start a call here", "error");
        return;
      }

      if (callRef.current) {
        showToast("You're already in a call", "error");
        return;
      }

      const callId = `${currentUserId || "me"}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      callIdRef.current = callId;
      remoteUserIdRef.current = String(userId);
      finalizedRef.current = false;

      setCall({
        id: callId,
        type: type === "video" ? "video" : "audio",
        direction: "outgoing",
        status: "ringing",
        remoteUser: {
          id: String(userId),
          name: name || "Unknown",
          username: username || "",
          profilePicture: profilePicture || "",
        },
        chatId,
        startedAt: null,
      });

      try {
        const stream = await getLocalMedia(type);
        const pc = createPeerConnection(String(userId), callId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      } catch (error) {
        showToast(describeMediaError(error, type), "error");
        cleanup();
        return;
      }

      socket.emit("call:start", {
        toUserId: String(userId),
        chatId,
        callType: type === "video" ? "video" : "audio",
        callId,
      });

      ringTimeoutRef.current = setTimeout(() => {
        showToast("No answer", "info");
        endCall({ status: "missed" });
      }, RING_TIMEOUT_MS);
    },
    [
      supported,
      socket,
      currentUserId,
      showToast,
      getLocalMedia,
      createPeerConnection,
      cleanup,
      endCall,
    ]
  );

  const acceptCall = useCallback(async () => {
    const activeCall = callRef.current;

    if (!activeCall || activeCall.direction !== "incoming") return;

    if (!socket?.connected) {
      showToast("Still connecting — try again in a second", "error");
      return;
    }

    stopRing();
    setCall((previous) =>
      previous ? { ...previous, status: "connecting" } : previous
    );

    const remoteId = activeCall.remoteUser.id;
    const callId = activeCall.id;

    try {
      const stream = await getLocalMedia(activeCall.type);
      const pc = createPeerConnection(remoteId, callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (error) {
      showToast(describeMediaError(error, activeCall.type), "error");
      socket.emit("call:reject", { callId, toUserId: remoteId });
      finalize("declined");
      cleanup();
      return;
    }

    socket.emit("call:accept", { callId, toUserId: remoteId });
  }, [
    socket,
    showToast,
    stopRing,
    getLocalMedia,
    createPeerConnection,
    finalize,
    cleanup,
  ]);

  const rejectCall = useCallback(() => {
    const activeCall = callRef.current;

    if (!activeCall) return;

    stopRing();

    if (socket) {
      socket.emit("call:reject", {
        callId: activeCall.id,
        toUserId: activeCall.remoteUser.id,
      });
    }

    finalize(activeCall.startedAt ? "completed" : "declined");
    cleanup();
  }, [socket, stopRing, finalize, cleanup]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];

    if (!track) return;

    track.enabled = !track.enabled;
    const mutedNow = !track.enabled;
    setMicMuted(mutedNow);

    const activeCall = callRef.current;
    const callId = callIdRef.current;

    if (!socket || !activeCall || !callId) return;

    socket.emit("call:mute", {
      callId,
      toUserId: activeCall.remoteUser.id,
      muted: mutedNow,
    });
  }, [socket]);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks?.()[0];

    if (!track) return;

    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(storageKey(currentUserId)).catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    if (!socket) return;

    const flushCandidates = async (pc: any) => {
      for (const candidate of pendingCandidatesRef.current) {
        try {
          const module = loadWebRTC();
          await pc.addIceCandidate(new module!.RTCIceCandidate(candidate));
        } catch {
          // A candidate can fail if the connection moved on.
        }
      }

      pendingCandidatesRef.current = [];
    };

    const handleIncoming = ({
      callId,
      fromUserId,
      fromName,
      fromUsername,
      fromProfilePicture,
      callType,
      chatId,
    }: any) => {
      if (!callId || !fromUserId) return;

      // Expo Go cannot answer — decline so the caller is not left ringing.
      if (!supported) {
        socket.emit("call:reject", {
          callId,
          toUserId: String(fromUserId),
        });
        return;
      }

      // Already busy — decline so the caller is not left ringing.
      if (callRef.current) {
        socket.emit("call:reject", {
          callId,
          toUserId: String(fromUserId),
        });
        return;
      }

      callIdRef.current = callId;
      remoteUserIdRef.current = String(fromUserId);
      finalizedRef.current = false;

      setCall({
        id: callId,
        type: callType === "video" ? "video" : "audio",
        direction: "incoming",
        status: "ringing",
        remoteUser: {
          id: String(fromUserId),
          name: fromName || "Unknown",
          username: fromUsername || "",
          profilePicture: fromProfilePicture || "",
        },
        chatId: chatId || "",
        startedAt: null,
      });

      Vibration.vibrate([0, 700, 900], true);

      ringTimeoutRef.current = setTimeout(() => {
        if (callRef.current?.id !== callId) return;

        showToast("Missed call", "info");
        finalize("missed");
        cleanup();
      }, RING_TIMEOUT_MS);
    };

    const handleAccepted = async ({ callId }: any) => {
      if (callId !== callIdRef.current) return;

      stopRing();

      const pc = pcRef.current;
      if (!pc) return;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call:offer", {
          callId,
          toUserId: remoteUserIdRef.current,
          sdp: pc.localDescription,
        });
      } catch {
        showToast("Could not start the call", "error");
        endCall();
      }
    };

    const handleOffer = async ({ callId, sdp }: any) => {
      if (callId !== callIdRef.current || !sdp) return;

      const pc = pcRef.current;
      if (!pc) return;

      const module = loadWebRTC();
      if (!module) return;

      try {
        await pc.setRemoteDescription(
          new module.RTCSessionDescription(sdp)
        );
        await flushCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("call:answer", {
          callId,
          toUserId: remoteUserIdRef.current,
          sdp: pc.localDescription,
        });

        stopRing();
        setCall((previous) =>
          previous
            ? { ...previous, status: "active", startedAt: Date.now() }
            : previous
        );
      } catch {
        showToast("Could not connect the call", "error");
        endCall();
      }
    };

    const handleAnswer = async ({ callId, sdp }: any) => {
      if (callId !== callIdRef.current || !sdp) return;

      const pc = pcRef.current;
      if (!pc) return;

      const module = loadWebRTC();
      if (!module) return;

      try {
        await pc.setRemoteDescription(
          new module.RTCSessionDescription(sdp)
        );
        await flushCandidates(pc);

        stopRing();

        setCall((previous) =>
          previous
            ? { ...previous, status: "active", startedAt: Date.now() }
            : previous
        );
      } catch {
        showToast("Could not connect the call", "error");
        endCall();
      }
    };

    const handleIce = async ({ callId, candidate }: any) => {
      if (callId !== callIdRef.current || !candidate) return;

      const pc = pcRef.current;
      if (!pc) return;

      if (!pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        const module = loadWebRTC();
        await pc.addIceCandidate(new module!.RTCIceCandidate(candidate));
      } catch {
        // Ignore late or duplicate candidates.
      }
    };

    const handleRemoteMuted = ({ callId, muted }: any) => {
      if (callId !== callIdRef.current) return;
      setRemoteMuted(Boolean(muted));
    };

    const handleRejected = ({ callId }: any) => {
      if (callId !== callIdRef.current) return;

      showToast("Call declined", "info");
      finalize("declined");
      cleanup();
    };

    const handleEnded = ({ callId }: any) => {
      if (callId !== callIdRef.current) return;

      const activeCall = callRef.current;

      if (activeCall && !activeCall.startedAt) {
        showToast("Call ended before it connected", "info");
      }

      finalize(activeCall?.startedAt ? "completed" : "missed");
      cleanup();
    };

    const handleFailed = ({ callId, reason }: any) => {
      if (callId !== callIdRef.current) return;

      const messages: Record<string, string> = {
        offline: "They're offline right now",
        busy: "They're on another call",
        blocked: "This contact can't be called",
        "not-member": "You can't call this contact",
        error: "Call failed",
      };

      showToast(messages[reason] || "Call failed", "error");
      finalize("cancelled");
      cleanup();
    };

    const handleDisconnect = () => {
      const activeCall = callRef.current;

      if (activeCall) {
        finalize(activeCall.startedAt ? "completed" : "cancelled");
      }

      cleanup();
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:accepted", handleAccepted);
    socket.on("call:offer", handleOffer);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice", handleIce);
    socket.on("call:muted", handleRemoteMuted);
    socket.on("call:rejected", handleRejected);
    socket.on("call:ended", handleEnded);
    socket.on("call:handled", handleEnded);
    socket.on("call:failed", handleFailed);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:accepted", handleAccepted);
      socket.off("call:offer", handleOffer);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice", handleIce);
      socket.off("call:muted", handleRemoteMuted);
      socket.off("call:rejected", handleRejected);
      socket.off("call:ended", handleEnded);
      socket.off("call:handled", handleEnded);
      socket.off("call:failed", handleFailed);
      socket.off("disconnect", handleDisconnect);
    };
  }, [
    socket,
    supported,
    showToast,
    stopRing,
    endCall,
    finalize,
    cleanup,
  ]);

  // Never leave the microphone on if the provider unmounts mid-call.
  useEffect(() => () => cleanup(), [cleanup]);

  const value = useMemo<CallContextValue>(
    () => ({
      call,
      localStream,
      remoteStream,
      micMuted,
      cameraOff,
      remoteMuted,
      connectionState,
      supported,
      history,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMic,
      toggleCamera,
      clearHistory,
    }),
    [
      call,
      localStream,
      remoteStream,
      micMuted,
      cameraOff,
      remoteMuted,
      connectionState,
      supported,
      history,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMic,
      toggleCamera,
      clearHistory,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const value = useContext(CallContext);

  if (!value) {
    throw new Error("useCall must be used inside CallProvider");
  }

  return value;
};

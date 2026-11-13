import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { useAuth } from "./AuthContext";

const SocketContext = createContext<{
  socket: Socket | null;
  connected: boolean;
} | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // A signed-out user has no socket; the previous effect's cleanup already
    // disconnected it and reset the state.
    if (!token) return;

    const nextSocket = io(SOCKET_URL, {
      auth: { token },
      // Start with HTTP polling and upgrade to WebSocket. Starting with
      // WebSocket only (the previous setting) meant that a network that blocks
      // WebSockets never connected at all, so no message ever arrived live.
      transports: ["polling", "websocket"],
      tryAllTransports: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    const handleConnect = () => {
      setConnected(true);
      setSocket(nextSocket);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleConnectError = () => {
      setConnected(false);
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.on("connect_error", handleConnectError);

    // The socket may already be connected by the time this effect runs.
    if (nextSocket.connected) {
      handleConnect();
    }

    return () => {
      nextSocket.off("connect", handleConnect);
      nextSocket.off("disconnect", handleDisconnect);
      nextSocket.off("connect_error", handleConnectError);
      nextSocket.emit("goOffline");
      nextSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const value = useContext(SocketContext);
  if (!value) throw new Error("useSocket must be used inside SocketProvider");
  return value;
};

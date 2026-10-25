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

const SocketContext = createContext<{ socket: Socket | null } | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const nextSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    const handleConnect = () => {
      console.log("Bubbles socket connected:", nextSocket.id);
      setSocket(nextSocket);
    };

    const handleConnectError = (error: Error) => {
      console.log("Bubbles socket error:", error.message);
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("connect_error", handleConnectError);

    return () => {
      nextSocket.off("connect", handleConnect);
      nextSocket.off("connect_error", handleConnectError);
      nextSocket.emit("goOffline");
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  const value = useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const value = useContext(SocketContext);
  if (!value) throw new Error("useSocket must be used inside SocketProvider");
  return value;
};

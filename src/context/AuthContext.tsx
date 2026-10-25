import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProfileAPI, recordDeviceAPI } from "../api/auth";
import { getStatusCode, setApiToken } from "../api/client";
import {
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
  saveStoredUser,
} from "../storage/authStorage";
import type { User } from "../types";
import { getDeviceId } from "../utils/device";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  refreshProfile: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const trackDevice = () => {
  getDeviceId()
    .then((deviceId) => recordDeviceAPI(deviceId))
    .catch(() => {});
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const stored = await loadStoredAuth();

      if (!active) return;

      if (!stored.token) {
        setLoading(false);
        return;
      }

      setApiToken(stored.token);

      try {
        const response = await getProfileAPI();
        if (!active) return;

        const nextUser = response.data?.user || stored.user;
        if (!nextUser) {
          throw new Error("Profile unavailable");
        }

        setToken(stored.token);
        setUser(nextUser);
        await saveStoredUser(nextUser);
        trackDevice();
      } catch (error) {
        if (!active) return;

        const status = getStatusCode(error);
        if (status === 401 || status === 403) {
          await clearStoredAuth();
          setApiToken(null);
          setToken(null);
          setUser(null);
        } else if (stored.user) {
          // Keep the last known profile when the server is temporarily
          // unreachable. The token will be checked again on the next launch.
          setToken(stored.token);
          setUser(stored.user);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (nextToken: string, nextUser: User) => {
    setApiToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    await saveStoredAuth(nextToken, nextUser);
    trackDevice();
  }, []);

  const logout = useCallback(async () => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    await clearStoredAuth();
  }, []);

  const updateUser = useCallback(async (nextUser: User) => {
    setUser(nextUser);
    await saveStoredUser(nextUser);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await getProfileAPI();
      const nextUser = response.data?.user;
      if (nextUser) {
        setUser(nextUser);
        await saveStoredUser(nextUser);
        return nextUser;
      }
    } catch {
      // The caller decides how to show the error.
    }
    return null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      updateUser,
      refreshProfile,
    }),
    [user, token, loading, login, logout, updateUser, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
};

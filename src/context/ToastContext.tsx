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
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

type ToastType = "info" | "success" | "error";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ id: Date.now(), message, type });
    timeoutRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  const backgroundColor =
    toast?.type === "error"
      ? colors.danger
      : toast?.type === "success"
        ? colors.success
        : colors.primaryDeep;

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {toast ? (
          <View
            pointerEvents="none"
            style={[
              styles.toast,
              {
                backgroundColor,
                bottom: Math.max(insets.bottom + 86, 100),
              },
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
};

import type { ComponentRef, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type KeyboardAwareViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Keeps its content above the on-screen keyboard.
 *
 * Expo apps draw edge-to-edge on Android, so the window no longer resizes for
 * the IME and React Native's `KeyboardAvoidingView` cannot compute a reliable
 * offset there. Instead we measure where this view ends on screen and pad it by
 * the exact overlap with the keyboard's top edge. Because the padding comes
 * from real coordinates it also stays correct on devices that still resize the
 * window (the overlap is then already zero, so nothing is added twice).
 */
export const KeyboardAwareView = ({
  children,
  style,
}: KeyboardAwareViewProps) => {
  const viewRef = useRef<ComponentRef<typeof View>>(null);
  const bottomRef = useRef(0);
  const [bottom, setBottom] = useState(0);

  useEffect(() => {
    const applyKeyboardTop = (keyboardTop: number) => {
      viewRef.current?.measureInWindow((_x, y, _width, height) => {
        // The measured height excludes any padding we already applied, so add
        // it back to get the view's true, unpadded bottom edge.
        const baseBottom = y + height + bottomRef.current;
        const next = Math.max(0, Math.round(baseBottom - keyboardTop));

        if (next === bottomRef.current) return;

        bottomRef.current = next;
        setBottom(next);
      });
    };

    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      const keyboardTop = event.endCoordinates?.screenY;
      if (typeof keyboardTop === "number" && keyboardTop > 0) {
        applyKeyboardTop(keyboardTop);
      }
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      if (bottomRef.current === 0) return;
      bottomRef.current = 0;
      setBottom(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View
      ref={viewRef}
      style={[styles.flex, style, bottom > 0 ? { paddingBottom: bottom } : null]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

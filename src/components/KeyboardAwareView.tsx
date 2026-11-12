import type { ComponentRef, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
 *
 * The measurement is repeated on every layout change while the keyboard is
 * open. That matters on tab screens: the tab bar hides when the keyboard
 * appears, the view grows by the tab bar's height, and a single measurement
 * taken before that shift leaves the composer under the keyboard.
 */
export const KeyboardAwareView = ({
  children,
  style,
}: KeyboardAwareViewProps) => {
  const viewRef = useRef<ComponentRef<typeof View>>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const bottomRef = useRef(0);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bottom, setBottom] = useState(0);

  const apply = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;

    if (keyboardTop === null) return;

    viewRef.current?.measureInWindow((_x, y, _width, height) => {
      // `measureInWindow` reports the view's frame including any padding we
      // applied, so the bottom edge is just y + height.
      const next = Math.max(0, Math.round(y + height - keyboardTop));

      if (next === bottomRef.current) return;

      bottomRef.current = next;
      setBottom(next);
    });
  }, []);

  const clearSettle = () => {
    if (settleRef.current) {
      clearTimeout(settleRef.current);
      settleRef.current = null;
    }
  };

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      const keyboardTop = event.endCoordinates?.screenY;

      if (typeof keyboardTop !== "number" || keyboardTop <= 0) return;

      keyboardTopRef.current = keyboardTop;
      apply();

      // Android announces the keyboard before the window has finished
      // resizing, so measure once more after the layout settles.
      clearSettle();
      settleRef.current = setTimeout(() => {
        settleRef.current = null;
        apply();
      }, 140);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTopRef.current = null;
      clearSettle();

      if (bottomRef.current === 0) return;

      bottomRef.current = 0;
      setBottom(0);
    });

    return () => {
      show.remove();
      hide.remove();
      clearSettle();
    };
  }, [apply]);

  return (
    <View
      ref={viewRef}
      onLayout={apply}
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

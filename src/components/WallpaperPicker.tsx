import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Directory, File, Paths } from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionSheet } from "./ActionSheet";
import {
  DEFAULT_WALLPAPER_VALUE,
  WALLPAPERS,
  isCustomWallpaper,
  presetValue,
} from "../constants/wallpapers";
import { useTheme } from "../theme";

export type WallpaperScope = "chat" | "all";

type WallpaperPickerProps = {
  visible: boolean;
  title?: string;
  value?: string;
  /** Shows the reset row when the chat has its own wallpaper. */
  allowReset?: boolean;
  /** Lets the user choose between this chat and every chat. */
  allowApplyToAll?: boolean;
  onClose: () => void;
  onSelect: (value: string, scope: WallpaperScope) => void;
};

/**
 * Copies the picked photo into the app's own storage. Image-picker URIs live
 * in the cache and can be wiped by Android, which would silently lose the
 * wallpaper.
 */
const persistImage = async (uri: string) => {
  const folder = new Directory(Paths.document, "wallpapers");
  if (!folder.exists) {
    folder.create({ intermediates: true, idempotent: true });
  }

  const extension = (uri.split(".").pop() || "jpg").split("?")[0].slice(0, 5);
  const target = new File(folder, `wall-${Date.now()}.${extension}`);

  await new File(uri).copy(target, { overwrite: true });

  return target.uri;
};

export const WallpaperPicker = ({
  visible,
  title = "Chat wallpaper",
  value,
  allowReset = false,
  allowApplyToAll = false,
  onClose,
  onSelect,
}: WallpaperPickerProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ value: string } | null>(null);

  const close = () => {
    onClose();
  };

  /**
   * A wallpaper can belong to one chat or to every chat. Rather than a toggle
   * buried in the sheet, the choice is asked for right after the wallpaper is
   * picked, which is the moment the user actually has to decide.
   */
  const choose = (value: string) => {
    if (!allowApplyToAll) {
      onSelect(value, "chat");
      close();
      return;
    }

    setPending({ value });
    close();
  };

  const applyScope = (scope: WallpaperScope) => {
    const next = pending?.value;

    setPending(null);

    if (next === undefined) return;

    onSelect(next, scope);
  };

  const pickPhoto = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      let stored = asset.uri;

      try {
        stored = await persistImage(asset.uri);
      } catch {
        // If copying fails, the picker URI still shows the wallpaper for this
        // session instead of silently doing nothing.
      }

      choose(stored);
    } finally {
      setBusy(false);
    }
  };

  const activeValue = value || DEFAULT_WALLPAPER_VALUE;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={close}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            <View style={styles.head}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Pressable onPress={close} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <View style={styles.grid}>
                {WALLPAPERS.map((preset) => {
                  const active = activeValue === presetValue(preset.id);

                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => choose(presetValue(preset.id))}
                      style={({ pressed }) => [
                        styles.tile,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={
                          isDark ? [...preset.darkColors] : [...preset.colors]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.swatch}
                      />

                      <View style={styles.tileFooter}>
                        <Text
                          numberOfLines={1}
                          style={[styles.tileName, { color: colors.text }]}
                        >
                          {preset.name}
                        </Text>
                        {active ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={colors.primary}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={pickPhoto}
                disabled={busy}
                style={({ pressed }) => [
                  styles.actionRow,
                  {
                    backgroundColor: colors.primarySoft,
                    opacity: pressed || busy ? 0.7 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                )}
                <Text style={[styles.actionText, { color: colors.primary }]}>
                  Choose a photo
                </Text>
              </Pressable>

              {isCustomWallpaper(value) ? (
                <View
                  style={[
                    styles.currentRow,
                    { borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color={colors.success}
                  />
                  <Text style={[styles.currentText, { color: colors.textMuted }]}>
                    Using your photo
                  </Text>
                </View>
              ) : null}

              {allowReset ? (
                <Pressable
                  onPress={() => choose("")}
                  style={({ pressed }) => [
                    styles.actionRow,
                    {
                      backgroundColor: colors.surfaceAlt,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={19}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.actionText, { color: colors.textMuted }]}>
                    Use the default wallpaper
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Outside the picker's Modal: React Native does not render a hidden
          Modal's children, so a nested sheet would never appear. */}
      <ActionSheet
        visible={pending !== null}
        title="Apply this wallpaper to"
        options={[
          {
            label: "This chat only",
            icon: "chatbubble-outline",
            onPress: () => applyScope("chat"),
          },
          {
            label: "Every chat",
            icon: "albums-outline",
            onPress: () => applyScope("all"),
          },
        ]}
        onClose={() => setPending(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "86%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  scopeRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginBottom: 12,
  },
  scopeOption: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  scroll: {
    paddingBottom: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "47.5%",
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  swatch: {
    height: 84,
    width: "100%",
  },
  tileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  tileName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
  },
  actionRow: {
    marginTop: 10,
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  currentRow: {
    marginTop: 10,
    minHeight: 38,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

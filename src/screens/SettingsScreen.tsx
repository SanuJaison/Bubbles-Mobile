import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toggleBlockUserAPI } from "../api/auth";
import { getErrorMessage } from "../api/client";
import {
  changePasswordAPI,
  updateUserSettingsAPI,
  type UserSettings,
  type Visibility,
} from "../api/settings";
import { ActionSheet, type ActionSheetOption } from "../components/ActionSheet";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { WallpaperPicker } from "../components/WallpaperPicker";
import { useAuth } from "../context/AuthContext";
import { useChatPrefs } from "../context/ChatPrefsContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";
import type { User } from "../types";
import { userIdOf } from "../utils/chat";

type VisibilityField = "profilePhotoVisibility" | "lastSeenVisibility";

const visibilityOptions: { value: Visibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "My contacts" },
  { value: "nobody", label: "Nobody" },
];

const visibilityLabel = (value?: Visibility) =>
  visibilityOptions.find((option) => option.value === value)?.label ||
  "Everyone";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {title}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

const ToggleRow = ({
  icon,
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.rowHint, { color: colors.textMuted }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.borderStrong}
      />
    </View>
  );
};

const LinkRow = ({
  icon,
  label,
  value,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceAlt : "transparent" },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: destructive ? colors.accentSoft : colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={destructive ? colors.danger : colors.primary}
        />
      </View>
      <Text
        style={[
          styles.rowLabel,
          styles.rowLabelFlex,
          { color: destructive ? colors.danger : colors.text },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[styles.rowValue, { color: colors.textSoft }]}>{value}</Text>
      ) : null}
      <Ionicons
        name="chevron-forward"
        size={17}
        color={destructive ? colors.danger : colors.textSoft}
      />
    </Pressable>
  );
};

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser, updateToken } = useAuth();
  const { showToast } = useToast();
  const { defaultWallpaper, setDefaultWallpaper } = useChatPrefs();

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [visibilityField, setVisibilityField] = useState<VisibilityField | null>(
    null
  );
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const patchSettings = async (updates: Partial<UserSettings>) => {
    const key = Object.keys(updates)[0] || "settings";
    if (savingKey) return;

    setSavingKey(key);

    try {
      const response = await updateUserSettingsAPI(updates);

      if (response.data?.user) {
        await updateUser(response.data.user);
      }
    } catch (error) {
      showToast(getErrorMessage(error, "Unable to save that setting."), "error");
    } finally {
      setSavingKey(null);
    }
  };

  const unblock = async (blockedUser: User | string) => {
    const id = userIdOf(blockedUser);

    if (!id || unblocking) return;

    setUnblocking(id);

    try {
      const response = await toggleBlockUserAPI(id);

      if (response.data?.user) {
        await updateUser(response.data.user);
      }

      showToast("User unblocked", "success");
    } catch (error) {
      showToast(getErrorMessage(error, "Unable to unblock this user."), "error");
    } finally {
      setUnblocking(null);
    }
  };

  const blockedUsers = user?.blockedUsers || [];

  const visibilitySheetOptions: ActionSheetOption[] = visibilityOptions.map(
    (option) => ({
      label:
        user?.[visibilityField || "profilePhotoVisibility"] === option.value
          ? `${option.label} ✓`
          : option.label,
      icon:
        option.value === "everyone"
          ? "globe-outline"
          : option.value === "contacts"
            ? "people-outline"
            : "lock-closed-outline",
      onPress: () => {
        if (!visibilityField) return;
        patchSettings({ [visibilityField]: option.value });
      },
    })
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: colors.surfaceAlt,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Privacy">
          <LinkRow
            icon="image-outline"
            label="Profile photo"
            value={visibilityLabel(user?.profilePhotoVisibility)}
            onPress={() => setVisibilityField("profilePhotoVisibility")}
          />
          <Divider />
          <LinkRow
            icon="time-outline"
            label="Last seen"
            value={visibilityLabel(user?.lastSeenVisibility)}
            onPress={() => setVisibilityField("lastSeenVisibility")}
          />
          <Divider />
          <ToggleRow
            icon="radio-outline"
            label="Show when I'm online"
            hint="Turn off to always appear offline"
            value={user?.onlineStatus !== false}
            disabled={savingKey === "onlineStatus"}
            onChange={(next) => patchSettings({ onlineStatus: next })}
          />
          <Divider />
          <ToggleRow
            icon="checkmark-done-outline"
            label="Read receipts"
            hint="Share blue ticks when you read messages"
            value={user?.readReceipts !== false}
            disabled={savingKey === "readReceipts"}
            onChange={(next) => patchSettings({ readReceipts: next })}
          />
        </Section>

        <Section title="Notifications">
          <ToggleRow
            icon="notifications-outline"
            label="Message notifications"
            value={user?.messageNotifications !== false}
            disabled={savingKey === "messageNotifications"}
            onChange={(next) => patchSettings({ messageNotifications: next })}
          />
          <Divider />
          <ToggleRow
            icon="volume-high-outline"
            label="Notification sound"
            value={user?.notificationSound !== false}
            disabled={savingKey === "notificationSound"}
            onChange={(next) => patchSettings({ notificationSound: next })}
          />
        </Section>

        <Section title="Chats">
          <ToggleRow
            icon="return-down-forward-outline"
            label="Enter to send"
            hint="When off, Enter adds a new line"
            value={user?.enterToSend !== false}
            disabled={savingKey === "enterToSend"}
            onChange={(next) => patchSettings({ enterToSend: next })}
          />
          <Divider />
          <LinkRow
            icon="color-palette-outline"
            label="Default chat wallpaper"
            value={
              defaultWallpaper.startsWith("preset:")
                ? defaultWallpaper.replace("preset:", "")
                : "Your photo"
            }
            onPress={() => setWallpaperOpen(true)}
          />
        </Section>

        <Section title="Security">
          <LinkRow
            icon="key-outline"
            label="Change password"
            onPress={() => setPasswordOpen(true)}
          />
        </Section>

        <Section title="Blocked users">
          {blockedUsers.length === 0 ? (
            <Text style={[styles.emptyBlocked, { color: colors.textMuted }]}>
              You haven&apos;t blocked anyone.
            </Text>
          ) : (
            blockedUsers.map((blockedUser, index) => {
              const id = userIdOf(blockedUser);
              const name =
                typeof blockedUser === "string"
                  ? "Blocked user"
                  : blockedUser.name || blockedUser.username || "Blocked user";

              return (
                <View key={id || `blocked-${index}`}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.rowIcon,
                        { backgroundColor: colors.accentSoft },
                      ]}
                    >
                      <Ionicons
                        name="ban-outline"
                        size={19}
                        color={colors.danger}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.rowLabel, styles.rowLabelFlex, { color: colors.text }]}
                    >
                      {name}
                    </Text>
                    <Pressable
                      onPress={() => unblock(blockedUser)}
                      disabled={unblocking === id}
                      style={({ pressed }) => [
                        styles.unblockButton,
                        {
                          backgroundColor: colors.primarySoft,
                          opacity: pressed || unblocking === id ? 0.7 : 1,
                        },
                      ]}
                    >
                      {unblocking === id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text
                          style={[
                            styles.unblockText,
                            { color: colors.primary },
                          ]}
                        >
                          Unblock
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </Section>

        <Text style={[styles.footer, { color: colors.textSoft }]}>
          Settings sync with your Bubbles account.
        </Text>
      </ScrollView>

      <ActionSheet
        visible={Boolean(visibilityField)}
        title={
          visibilityField === "lastSeenVisibility"
            ? "Who can see my last seen?"
            : "Who can see my profile photo?"
        }
        options={visibilitySheetOptions}
        onClose={() => setVisibilityField(null)}
      />

      <WallpaperPicker
        visible={wallpaperOpen}
        title="Default chat wallpaper"
        value={defaultWallpaper}
        onClose={() => setWallpaperOpen(false)}
        onSelect={(next) => {
          setDefaultWallpaper(next);
          showToast("Default wallpaper updated", "success");
        }}
      />

      <PasswordModal
        visible={passwordOpen}
        bottomInset={insets.bottom}
        onClose={() => setPasswordOpen(false)}
        onSaved={async (token) => {
          if (token) await updateToken(token);
          setPasswordOpen(false);
          showToast("Password updated", "success");
        }}
      />
    </Screen>
  );
}

const PasswordModal = ({
  visible,
  bottomInset,
  onClose,
  onSaved,
}: {
  visible: boolean;
  bottomInset: number;
  onClose: () => void;
  onSaved: (token?: string) => Promise<void> | void;
}) => {
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirm("");
    setError("");
    setSaving(false);
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (saving) return;

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const response = await changePasswordAPI(password);
      reset();
      await onSaved(response.data?.token);
    } catch (changeError) {
      setError(
        getErrorMessage(changeError, "Unable to change your password.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.passwordOverlay}
      >
        <View
          style={[
            styles.passwordCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginBottom: bottomInset,
            },
          ]}
        >
          <Text style={[styles.passwordTitle, { color: colors.text }]}>
            Change password
          </Text>
          <Text style={[styles.passwordCopy, { color: colors.textMuted }]}>
            You&apos;ll stay signed in on this device. Other sessions will be
            signed out.
          </Text>

          <View style={styles.passwordFields}>
            <TextField
              label="New password"
              icon="lock-closed-outline"
              secure
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="At least 8 characters"
            />
            <TextField
              label="Confirm new password"
              icon="lock-closed-outline"
              secure
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Repeat the password"
            />
            {error ? (
              <Text style={[styles.passwordError, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={styles.passwordActions}>
            <Pressable
              onPress={close}
              disabled={saving}
              style={({ pressed }) => [
                styles.passwordButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.passwordButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={saving}
              style={({ pressed }) => [
                styles.passwordButton,
                {
                  backgroundColor: colors.primaryDeep,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.passwordButtonText, { color: "#FFFFFF" }]}>
                  Update password
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  section: {
    marginTop: 18,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 6,
  },
  row: {
    minHeight: 58,
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowLabelFlex: {
    flex: 1,
    minWidth: 0,
  },
  rowHint: {
    marginTop: 2,
    fontSize: 11,
  },
  rowValue: {
    fontSize: 11.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  emptyBlocked: {
    paddingHorizontal: 12,
    paddingVertical: 18,
    fontSize: 12.5,
  },
  unblockButton: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    minWidth: 78,
    alignItems: "center",
  },
  unblockText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  footer: {
    marginTop: 26,
    fontSize: 11,
    textAlign: "center",
  },
  passwordOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(9, 6, 16, 0.62)",
  },
  passwordCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  passwordTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  passwordCopy: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
  },
  passwordFields: {
    marginTop: 18,
    gap: 12,
  },
  passwordError: {
    fontSize: 12,
  },
  passwordActions: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },
  passwordButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

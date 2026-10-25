import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar } from "../components/Avatar";
import { BrandMark } from "../components/BrandMark";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Screen } from "../components/Screen";
import { APP_VERSION, DOWNLOAD_URL, PRIVACY_URL, TERMS_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme, type ThemeMode } from "../theme";
import { openExternalUrl } from "../utils/links";

const themeOptions: {
  value: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "system", label: "System", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

const Row = ({
  icon,
  label,
  value,
  onPress,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
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

export default function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);

    const nextUser = await refreshProfile();
    setRefreshing(false);

    if (nextUser) {
      showToast("Profile updated", "success");
    } else {
      showToast("Unable to refresh your profile right now.", "error");
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Your account, preferences, and Bubbles
            </Text>
          </View>
          <BrandMark size={38} />
        </View>

        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Avatar
            name={user?.name}
            uri={user?.profilePicture}
            size={84}
            online={user?.isOnline}
            showOnline
          />

          <Text style={[styles.name, { color: colors.text }]}>
            {user?.name || "Bubbles user"}
          </Text>
          {user?.username ? (
            <Text style={[styles.handle, { color: colors.primary }]}>
              @{user.username}
            </Text>
          ) : null}
          {user?.email ? (
            <Text style={[styles.email, { color: colors.textMuted }]}>
              {user.email}
            </Text>
          ) : null}
          {user?.bio ? (
            <Text style={[styles.bio, { color: colors.textMuted }]}>
              {user.bio}
            </Text>
          ) : null}

          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            style={({ pressed }) => [
              styles.refreshButton,
              {
                backgroundColor: colors.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={16} color={colors.primary} />
            )}
            <Text style={[styles.refreshText, { color: colors.primary }]}>
              Refresh profile
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Appearance
          </Text>
          <View
            style={[
              styles.themeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {themeOptions.map((option) => {
              const active = mode === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      backgroundColor: active
                        ? colors.primarySoft
                        : pressed
                          ? colors.surfaceAlt
                          : "transparent",
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={19}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: active ? colors.primary : colors.textMuted },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Bubbles
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Row
              icon="create-outline"
              label="Edit profile"
              onPress={() => router.push("/edit-profile")}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row
              icon="chatbox-ellipses-outline"
              label="Send feedback"
              onPress={() => router.push("/feedback")}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => openExternalUrl(PRIVACY_URL)}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => openExternalUrl(TERMS_URL)}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row
              icon="desktop-outline"
              label="Download for Windows"
              onPress={() => openExternalUrl(DOWNLOAD_URL)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Account
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Row
              icon="log-out-outline"
              label="Sign out"
              onPress={() => setLogoutOpen(true)}
              destructive
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: colors.textSoft }]}>
            Bubbles {APP_VERSION}
          </Text>
          <Text style={[styles.footerText, { color: colors.textSoft }]}>
            Made for calmer conversations.
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={logoutOpen}
        title="Sign out of Bubbles?"
        message="You will need your password to sign back in."
        confirmLabel="Sign out"
        destructive
        loading={loggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  title: {
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11.5,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
  },
  name: {
    marginTop: 13,
    fontSize: 21,
    fontWeight: "800",
  },
  handle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  email: {
    marginTop: 5,
    fontSize: 12.5,
  },
  bio: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  refreshButton: {
    marginTop: 16,
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginTop: 22,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  themeCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 6,
    flexDirection: "row",
    gap: 6,
  },
  themeOption: {
    flex: 1,
    minHeight: 58,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  themeLabel: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 6,
  },
  row: {
    minHeight: 54,
    borderRadius: 13,
    paddingHorizontal: 8,
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
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 11.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
    gap: 4,
  },
  version: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  footerText: {
    fontSize: 10.5,
  },
});

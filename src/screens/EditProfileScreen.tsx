import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { updateProfileAPI, type ProfileImage } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { Avatar } from "../components/Avatar";
import { GradientButton } from "../components/GradientButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../theme";

const USERNAME_PATTERN = /^[a-z0-9._]{3,32}$/;

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [pickedImage, setPickedImage] = useState<ProfileImage | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      setPickedImage({
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
    } catch (pickError) {
      showToast(
        getErrorMessage(pickError, "Unable to open your photos."),
        "error"
      );
    }
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanBio = bio.trim();

    if (cleanName.length < 2) {
      setError("Your name needs at least 2 characters.");
      return;
    }

    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setError(
        "Username must be 3 to 32 characters using letters, numbers, dots, or underscores."
      );
      return;
    }

    if (cleanBio.length > 500) {
      setError("Bio must be 500 characters or fewer.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const response = await updateProfileAPI({
        name: cleanName,
        username: cleanUsername,
        bio: cleanBio,
        profilePicture: pickedImage,
      });

      const nextUser = response.data?.user;
      if (!nextUser) {
        throw new Error("The server did not return your updated profile.");
      }

      await updateUser(nextUser);
      showToast("Profile updated", "success");
      router.back();
    } catch (saveError) {
      setError(
        getErrorMessage(saveError, "Unable to update your profile right now.")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.back,
                {
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                Edit profile
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                How people see you in Bubbles
              </Text>
            </View>
          </View>

          <View style={styles.avatarBlock}>
            <Avatar
              name={name || user?.name}
              uri={pickedImage?.uri || user?.profilePicture}
              size={104}
            />
            <Pressable
              onPress={handlePickImage}
              style={({ pressed }) => [
                styles.photoButton,
                {
                  backgroundColor: colors.primarySoft,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={[styles.photoText, { color: colors.primary }]}>
                Change photo
              </Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <TextField
              label="Name"
              icon="happy-outline"
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) setError("");
              }}
              placeholder="Your name"
              autoCapitalize="words"
              autoComplete="name"
              maxLength={80}
            />

            <TextField
              label="Username"
              icon="at-outline"
              value={username}
              onChangeText={(value) => {
                setUsername(value.toLowerCase());
                if (error) setError("");
              }}
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              maxLength={32}
            />

            <TextField
              label="Bio"
              icon="document-text-outline"
              value={bio}
              onChangeText={(value) => {
                setBio(value);
                if (error) setError("");
              }}
              placeholder="A little about you"
              multiline
              maxLength={500}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}

            <GradientButton
              label="Save changes"
              onPress={handleSave}
              loading={saving}
              icon="checkmark-circle-outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 18,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11.5,
  },
  avatarBlock: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  photoButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  photoText: {
    fontSize: 12,
    fontWeight: "700",
  },
  form: {
    marginTop: 14,
    gap: 15,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
});

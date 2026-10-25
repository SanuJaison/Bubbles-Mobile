import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { getInitials } from "../utils/format";

type AvatarProps = {
  name?: string;
  uri?: string;
  size?: number;
  isGroup?: boolean;
  online?: boolean;
  showOnline?: boolean;
};

export const Avatar = ({
  name,
  uri,
  size = 48,
  isGroup = false,
  online = false,
  showOnline = false,
}: AvatarProps) => {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const showImage = Boolean(uri) && failedUri !== uri;
  const radius = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: isGroup ? colors.primarySoft : colors.surfaceAlt,
          },
        ]}
      >
        {showImage ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: radius }}
            contentFit="cover"
            transition={180}
            onError={() => setFailedUri(uri || null)}
          />
        ) : isGroup ? (
          <Ionicons
            name="people"
            size={size * 0.42}
            color={colors.primary}
          />
        ) : (
          <Text
            style={[
              styles.initials,
              { color: colors.primary, fontSize: size * 0.33 },
            ]}
          >
            {getInitials(name)}
          </Text>
        )}
      </View>

      {showOnline && online ? (
        <View
          style={[
            styles.dot,
            {
              width: Math.max(10, size * 0.24),
              height: Math.max(10, size * 0.24),
              borderRadius: Math.max(5, size * 0.12),
              backgroundColor: colors.success,
              borderColor: colors.background,
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});

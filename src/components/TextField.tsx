import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useTheme } from "../theme";

type TextFieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  secure?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
};

export const TextField = ({
  label,
  icon,
  error,
  secure = false,
  rightIcon,
  onRightIconPress,
  style,
  multiline,
  ...props
}: TextFieldProps) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  const showEye = secure;
  const iconName = showEye
    ? hidden
      ? "eye-outline"
      : "eye-off-outline"
    : rightIcon;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.input,
            borderColor: error
              ? colors.danger
              : focused
                ? colors.primary
                : colors.border,
          },
          multiline && styles.multilineWrap,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? colors.primary : colors.textSoft}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          {...props}
          multiline={multiline}
          secureTextEntry={showEye ? hidden : false}
          placeholderTextColor={colors.textSoft}
          selectionColor={colors.primary}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              color: colors.text,
              minHeight: multiline ? 108 : undefined,
              textAlignVertical: multiline ? "top" : "center",
            },
            style,
          ]}
        />

        {iconName ? (
          <Pressable
            onPress={
              showEye ? () => setHidden((current) => !current) : onRightIconPress
            }
            hitSlop={10}
            style={styles.rightIcon}
          >
            <Ionicons name={iconName} size={19} color={colors.textSoft} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 2,
  },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  multilineWrap: {
    alignItems: "flex-start",
  },
  leftIcon: {
    marginLeft: 15,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "500",
  },
  rightIcon: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    fontSize: 12,
    marginLeft: 2,
  },
});

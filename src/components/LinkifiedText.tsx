import { Text, type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "../theme";
import { openExternalUrl, splitTextWithLinks } from "../utils/links";

type LinkifiedTextProps = {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: "head" | "middle" | "tail" | "clip";
};

export const LinkifiedText = ({
  text,
  style,
  linkStyle,
  numberOfLines,
  ellipsizeMode,
}: LinkifiedTextProps) => {
  const { colors } = useTheme();
  const parts = splitTextWithLinks(text);

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {parts.map((part, index) =>
        part.type === "link" ? (
          <Text
            key={`${part.value}-${index}`}
            onPress={() => openExternalUrl(part.value)}
            style={[
              {
                color: colors.primary,
                textDecorationLine: "underline",
              },
              linkStyle,
            ]}
          >
            {part.label}
          </Text>
        ) : (
          <Text key={`text-${index}`}>{part.value}</Text>
        )
      )}
    </Text>
  );
};

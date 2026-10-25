import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const logo = require("../../assets/bubbles-logo.png");

export const BrandMark = ({ size = 64 }: { size?: number }) => (
  <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }]}>
    <Image
      source={logo}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      contentFit="cover"
      transition={200}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "#120D1D",
  },
});

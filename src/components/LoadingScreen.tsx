import { useEffect, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

const logo = require("../../assets/bubbles-logo.png");

/**
 * Branded fallback shown while the stored session is being restored. The
 * native splash uses the same background colour, so the hand-off is seamless
 * and the user never sees a blank screen.
 */
export const LoadingScreen = ({ label = "Loading Bubbles" }: { label?: string }) => {
  const [pulse] = useState(() => new Animated.Value(0));
  const [dot] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const dotLoop = Animated.loop(
      Animated.timing(dot, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    dotLoop.start();

    return () => {
      pulseLoop.stop();
      dotLoop.stop();
    };
  }, [pulse, dot]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.04],
  });

  const glow = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.glow, { opacity: glow, transform: [{ scale }] }]}
      />
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
        <Image source={logo} style={styles.logo} />
      </Animated.View>

      <Text style={styles.word}>Bubbles</Text>

      <View style={styles.dots}>
        {[0, 1, 2].map((index) => {
          const opacity = dot.interpolate({
            inputRange: [
              index / 3,
              (index + 0.5) / 3,
              (index + 1) / 3,
              1,
            ],
            outputRange: [0.2, 1, 0.2, 0.2],
          });

          return (
            <Animated.View key={index} style={[styles.dot, { opacity }]} />
          );
        })}
      </View>

      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#010107",
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#A855F7",
    opacity: 0.3,
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#120D1D",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  word: {
    marginTop: 22,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: "#F5F3FF",
  },
  dots: {
    flexDirection: "row",
    gap: 7,
    marginTop: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#A855F7",
  },
  label: {
    marginTop: 14,
    fontSize: 13,
    color: "#9C93B8",
  },
});

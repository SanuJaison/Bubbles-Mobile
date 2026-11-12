import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { useTheme } from "../../../theme";

const bubbleAI = require("../../../../assets/bubble-ai.png");

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "700",
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={size}
              color={typeof color === "string" ? color : colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: "Calls",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "call" : "call-outline"}
              size={size}
              color={typeof color === "string" ? color : colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "Bubbles AI",
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={bubbleAI}
              style={{
                width: size,
                height: size,
                borderRadius: size * 0.3,
                opacity: focused ? 1 : 0.55,
              }}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={typeof color === "string" ? color : colors.primary}
            />
          ),
        }}
      />
    </Tabs>
  );
}

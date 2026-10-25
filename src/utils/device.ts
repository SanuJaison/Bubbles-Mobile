import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_KEY = "bubbles_mobile_device_id";

export const getDeviceId = async () => {
  const stored = await AsyncStorage.getItem(DEVICE_KEY);
  if (stored) return stored;

  const generated = `android-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;

  await AsyncStorage.setItem(DEVICE_KEY, generated);
  return generated;
};

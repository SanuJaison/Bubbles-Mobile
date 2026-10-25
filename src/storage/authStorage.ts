import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { User } from "../types";

const TOKEN_KEY = "bubbles_mobile_token";
const USER_KEY = "bubbles_mobile_user";

const secureGet = async (key: string) => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
};

const secureSet = async (key: string, value: string) => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
};

const secureDelete = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore. The AsyncStorage copy is cleared below.
  }
  await AsyncStorage.removeItem(key);
};

export const loadStoredAuth = async (): Promise<{
  token: string | null;
  user: User | null;
}> => {
  const [token, rawUser] = await Promise.all([
    secureGet(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ]);

  let user: User | null = null;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as User;
    } catch {
      user = null;
    }
  }

  return { token, user };
};

export const saveStoredAuth = async (token: string, user: User) => {
  await Promise.all([
    secureSet(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
};

export const saveStoredUser = async (user: User) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredAuth = async () => {
  await Promise.all([secureDelete(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
};

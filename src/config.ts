const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const fallbackApi = "https://bubbles-backend-bx2c.onrender.com/api";
const fallbackSocket = "https://bubbles-backend-bx2c.onrender.com";

export const API_URL = trimTrailingSlashes(
  process.env.EXPO_PUBLIC_API_URL || fallbackApi
);

export const SOCKET_URL = trimTrailingSlashes(
  process.env.EXPO_PUBLIC_SOCKET_URL || fallbackSocket
);

export const APP_NAME = "Bubbles";
export const APP_VERSION = "1.0.0";
export const WEB_URL = "https://bubbles-zeta-nine.vercel.app";
export const FEEDBACK_URL = `${WEB_URL}/feedback`;
export const PRIVACY_URL = `${WEB_URL}/privacy`;
export const TERMS_URL = `${WEB_URL}/terms`;
export const DOWNLOAD_URL = "https://github.com/SanuJaison/Bubbles/releases/latest";
export const CALLS_COMING_SOON = "Calls are coming soon on Android.";

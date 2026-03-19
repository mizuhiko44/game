import { Platform } from "react-native";

export function isWebPlatform() {
  return Platform.OS === "web";
}

export function isWideLayout(width: number) {
  return width >= 960;
}

export function resolvePlatformLabel() {
  if (Platform.OS === "web") return "WEB";
  if (Platform.OS === "ios") return "iOS";
  if (Platform.OS === "android") return "Android";
  return String(Platform.OS).toUpperCase();
}

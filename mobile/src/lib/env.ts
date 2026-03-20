export type MobileAppEnv = "local" | "staging" | "production";
export type MobileAuthMode = "mvp_header" | "jwt_transition" | "jwt_required";

const DEFAULT_API_BASE_URL = "http://localhost:3000";

function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  if (typeof globalThis !== "undefined" && "location" in globalThis) {
    const location = (globalThis as { location?: { origin?: string; hostname?: string } }).location;
    if (location?.origin) {
      const isLocalHost = ["localhost", "127.0.0.1"].includes(location.hostname ?? "");
      return isLocalHost ? DEFAULT_API_BASE_URL : location.origin;
    }
  }

  return DEFAULT_API_BASE_URL;
}

export const APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ?? "local") as MobileAppEnv;
export const AUTH_MODE = (process.env.EXPO_PUBLIC_AUTH_MODE ?? "mvp_header") as MobileAuthMode;
export const API_BASE_URL = resolveApiBaseUrl();
export const SESSION_STORAGE_PREFIX = `prediction_game_${APP_ENV}`;

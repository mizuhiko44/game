import { Platform } from "react-native";
import { SESSION_STORAGE_PREFIX } from "./env";

const NICKNAME_KEY = `${SESSION_STORAGE_PREFIX}_saved_nickname`;
const AUTH_SESSION_KEY = `${SESSION_STORAGE_PREFIX}_auth_session`;
const MEMORY_STORE_KEY = "__prediction_game_memory_store__";

type MemoryStore = Record<string, string>;

function getMemoryStore(): MemoryStore {
  const storeHost = globalThis as typeof globalThis & { [MEMORY_STORE_KEY]?: MemoryStore };
  if (!storeHost[MEMORY_STORE_KEY]) {
    storeHost[MEMORY_STORE_KEY] = {};
  }
  return storeHost[MEMORY_STORE_KEY] as MemoryStore;
}

function getWebStorage(kind: "localStorage" | "sessionStorage") {
  if (Platform.OS !== "web") return undefined;
  if (typeof globalThis !== "undefined" && kind in globalThis) {
    return (globalThis as typeof globalThis & { localStorage?: Storage; sessionStorage?: Storage })[kind];
  }
  return undefined;
}

function readMemory(key: string) {
  return getMemoryStore()[key] ?? null;
}

function writeMemory(key: string, value: string) {
  getMemoryStore()[key] = value;
}

function removeMemory(key: string) {
  delete getMemoryStore()[key];
}

async function persistPlainValue(key: string, value: string) {
  const localStorage = getWebStorage("localStorage");
  if (localStorage) {
    localStorage.setItem(key, value);
    return;
  }

  writeMemory(key, value);
}

async function getPlainValue(key: string) {
  const localStorage = getWebStorage("localStorage");
  if (localStorage) {
    return localStorage.getItem(key);
  }

  return readMemory(key);
}

async function removePlainValue(key: string) {
  const localStorage = getWebStorage("localStorage");
  if (localStorage) {
    localStorage.removeItem(key);
    return;
  }

  removeMemory(key);
}

function isCookieBackedWebSession() {
  return Platform.OS === "web";
}

async function persistAuthValue(value: string) {
  if (isCookieBackedWebSession()) {
    writeMemory(AUTH_SESSION_KEY, value);
    return;
  }

  const sessionStorage = getWebStorage("sessionStorage");
  if (sessionStorage) {
    sessionStorage.setItem(AUTH_SESSION_KEY, value);
    return;
  }

  writeMemory(AUTH_SESSION_KEY, value);
}

async function getPersistedAuthValue() {
  if (isCookieBackedWebSession()) {
    return readMemory(AUTH_SESSION_KEY);
  }

  const sessionStorage = getWebStorage("sessionStorage");
  if (sessionStorage) {
    return sessionStorage.getItem(AUTH_SESSION_KEY);
  }

  return readMemory(AUTH_SESSION_KEY);
}

async function removePersistedAuthValue() {
  if (isCookieBackedWebSession()) {
    removeMemory(AUTH_SESSION_KEY);
    return;
  }

  const sessionStorage = getWebStorage("sessionStorage");
  if (sessionStorage) {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  removeMemory(AUTH_SESSION_KEY);
}

export async function saveNickname(nickname: string) {
  await persistPlainValue(NICKNAME_KEY, nickname);
}

export async function getSavedNickname() {
  return getPlainValue(NICKNAME_KEY);
}

export async function clearSavedNickname() {
  await removePlainValue(NICKNAME_KEY);
}

export type AuthSessionDraft = {
  accessToken?: string | null;
  refreshToken?: string | null;
  userId?: string | null;
  nickname?: string | null;
  role?: string | null;
  expiresAt?: string | null;
  refreshExpiresAt?: string | null;
};

export async function saveAuthSession(session: AuthSessionDraft) {
  const serialized = JSON.stringify({
    ...session,
    refreshToken: isCookieBackedWebSession() ? null : session.refreshToken ?? null,
  });

  await persistAuthValue(serialized);
}

export async function getAuthSession(): Promise<AuthSessionDraft | null> {
  const serialized = await getPersistedAuthValue();
  if (!serialized) return null;

  try {
    return JSON.parse(serialized) as AuthSessionDraft;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  await removePersistedAuthValue();
}

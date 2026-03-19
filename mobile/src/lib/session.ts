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

function getLocalStorage() {
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    return (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
  }
  return undefined;
}

export async function saveNickname(nickname: string) {
  const localStorage = getLocalStorage();
  if (localStorage) {
    localStorage.setItem(NICKNAME_KEY, nickname);
    return;
  }

  getMemoryStore()[NICKNAME_KEY] = nickname;
}

export async function getSavedNickname() {
  const localStorage = getLocalStorage();
  if (localStorage) {
    return localStorage.getItem(NICKNAME_KEY);
  }

  return getMemoryStore()[NICKNAME_KEY] ?? null;
}

export async function clearSavedNickname() {
  const localStorage = getLocalStorage();
  if (localStorage) {
    localStorage.removeItem(NICKNAME_KEY);
    return;
  }

  delete getMemoryStore()[NICKNAME_KEY];
}


export type AuthSessionDraft = {
  accessToken?: string | null;
  refreshToken?: string | null;
  userId?: string | null;
  nickname?: string | null;
};

export async function saveAuthSession(session: AuthSessionDraft) {
  const localStorage = getLocalStorage();
  const serialized = JSON.stringify(session);
  if (localStorage) {
    localStorage.setItem(AUTH_SESSION_KEY, serialized);
    return;
  }

  getMemoryStore()[AUTH_SESSION_KEY] = serialized;
}

export async function getAuthSession(): Promise<AuthSessionDraft | null> {
  const localStorage = getLocalStorage();
  const serialized = localStorage ? localStorage.getItem(AUTH_SESSION_KEY) : getMemoryStore()[AUTH_SESSION_KEY] ?? null;
  if (!serialized) return null;

  try {
    return JSON.parse(serialized) as AuthSessionDraft;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  const localStorage = getLocalStorage();
  if (localStorage) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  delete getMemoryStore()[AUTH_SESSION_KEY];
}

const NICKNAME_KEY = "prediction_game_saved_nickname";
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

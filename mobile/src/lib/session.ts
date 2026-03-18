import AsyncStorage from "@react-native-async-storage/async-storage";

const NICKNAME_KEY = "prediction_game_saved_nickname";

export async function saveNickname(nickname: string) {
  await AsyncStorage.setItem(NICKNAME_KEY, nickname);
}

export async function getSavedNickname() {
  return AsyncStorage.getItem(NICKNAME_KEY);
}

export async function clearSavedNickname() {
  await AsyncStorage.removeItem(NICKNAME_KEY);
}

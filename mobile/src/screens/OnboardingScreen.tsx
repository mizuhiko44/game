import { useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { ApiError, apiRequest } from "../lib/api";
import { saveAuthSession, saveNickname } from "../lib/session";
import { AuthSessionResponse, User } from "../lib/types";

const INPUT_STYLE = { color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 } as const;

function persistAuth(response: AuthSessionResponse) {
  return saveAuthSession({
    accessToken: response.auth.accessToken,
    refreshToken: response.auth.refreshToken,
    userId: response.user.id,
    nickname: response.user.nickname,
    role: response.user.role,
    expiresAt: response.auth.expiresAt,
    refreshExpiresAt: response.auth.refreshExpiresAt,
  });
}

export function OnboardingScreen({ onDone }: { onDone: (user: User) => void }) {
  const [nickname, setNickname] = useState("Tetsu");
  const [regionCode, setRegionCode] = useState("kanagawa");
  const [avatarType, setAvatarType] = useState("cat");
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    try {
      setError("");
      setMessage("");

      if (!needsRegistration) {
        const payload = await apiRequest<AuthSessionResponse>("/api/users/login", {
          method: "POST",
          body: { nickname },
        });
        await saveNickname(payload.user.nickname);
        await persistAuth(payload);
        onDone(payload.user);
        return;
      }

      const payload = await apiRequest<AuthSessionResponse>("/api/users/onboarding", {
        method: "POST",
        body: { nickname, regionCode, avatarType },
      });
      await saveNickname(payload.user.nickname);
      await persistAuth(payload);
      onDone(payload.user);
    } catch (e) {
      const apiError = e as ApiError;
      if (apiError.status === 404 && !needsRegistration) {
        setNeedsRegistration(true);
        setMessage("新規メンバーとして登録してください。");
        return;
      }
      setError((e as Error).message);
    }
  };

  return (
    <ScreenTemplate title="Onboarding / Login">
      <Text style={{ color: "#AAB4D4" }}>登録済みなら nickname でログイン、新規なら登録情報を入力してください。</Text>
      <TextInput value={nickname} onChangeText={setNickname} placeholder="nickname" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
      {needsRegistration && (
        <>
          <TextInput value={regionCode} onChangeText={setRegionCode} placeholder="regionCode" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
          <TextInput value={avatarType} onChangeText={setAvatarType} placeholder="avatarType (cat / rabbit / fox など)" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
        </>
      )}
      <Pressable onPress={submit} style={{ backgroundColor: "#5BA7FF", padding: 12, borderRadius: 8 }}>
        <Text style={{ color: "#0B1020", fontWeight: "700", textAlign: "center" }}>{needsRegistration ? "新規登録して開始" : "ログイン / 開始"}</Text>
      </Pressable>
      {!needsRegistration && (
        <Pressable onPress={() => { setNeedsRegistration(true); setError(""); setMessage("新規メンバー登録モードに切り替えました。"); }} style={{ paddingVertical: 6 }}>
          <Text style={{ color: "#5BA7FF", textAlign: "center" }}>新規メンバーとして登録する</Text>
        </Pressable>
      )}
      {!!message && <Text style={{ color: "#AAB4D4" }}>{message}</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
    </ScreenTemplate>
  );
}

import { useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { User } from "../lib/types";

const INPUT_STYLE = { color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 } as const;

export function OnboardingScreen({ onDone }: { onDone: (user: User) => void }) {
  const [nickname, setNickname] = useState("Tetsu");
  const [regionCode, setRegionCode] = useState("kanagawa");
  const [avatarType, setAvatarType] = useState("cat");
  const [error, setError] = useState("");

  const submit = async () => {
    try {
      setError("");
      const user = await apiRequest<User>("/api/users/onboarding", {
        method: "POST",
        body: { nickname, regionCode, avatarType },
      });
      onDone(user);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ScreenTemplate title="Onboarding">
      <Text style={{ color: "#AAB4D4" }}>同じ nickname は登録できません。</Text>
      <TextInput value={nickname} onChangeText={setNickname} placeholder="nickname" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
      <TextInput value={regionCode} onChangeText={setRegionCode} placeholder="regionCode" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
      <TextInput value={avatarType} onChangeText={setAvatarType} placeholder="avatarType (cat / rabbit / fox など)" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
      <Pressable onPress={submit} style={{ backgroundColor: "#5BA7FF", padding: 12, borderRadius: 8 }}>
        <Text style={{ color: "#0B1020", fontWeight: "700", textAlign: "center" }}>登録して開始</Text>
      </Pressable>
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
    </ScreenTemplate>
  );
}

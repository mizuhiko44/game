import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { AvatarPayload } from "../lib/types";

export function AvatarScreen({ userId }: { userId?: string }) {
  const [payload, setPayload] = useState<AvatarPayload | null>(null);
  const [msg, setMsg] = useState("");

  const fetchAvatar = async () => {
    if (!userId) return;
    const data = await apiRequest<AvatarPayload>("/api/avatar", { userId });
    setPayload(data);
  };

  useEffect(() => {
    fetchAvatar().catch(() => setPayload(null));
  }, [userId]);

  const levelUp = async () => {
    if (!userId) return;
    try {
      await apiRequest("/api/avatar/level-up", {
        method: "POST",
        userId,
        body: { itemId: "itm_exp_small", quantity: 1 },
      });
      await fetchAvatar();
      setMsg("レベルアップ実行しました");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <ScreenTemplate title="Avatar">
      {payload && (
        <>
          <Text style={{ color: "#F4F7FF" }}>type: {payload.avatar.avatarType}</Text>
          <Text style={{ color: "#F4F7FF" }}>level: {payload.avatar.level}</Text>
          <Text style={{ color: "#F4F7FF" }}>exp: {payload.avatar.exp}</Text>
          <Text style={{ color: "#F4F7FF" }}>items: {payload.items.map((i) => `${i.item.name} x${i.quantity}`).join(", ") || "none"}</Text>
        </>
      )}
      <Pressable onPress={levelUp} style={{ backgroundColor: "#5BA7FF", padding: 12, borderRadius: 8 }}>
        <Text style={{ color: "#0B1020", fontWeight: "700", textAlign: "center" }}>expアイテムを1個使う</Text>
      </Pressable>
      {!!msg && <Text style={{ color: "#AAB4D4" }}>{msg}</Text>}
    </ScreenTemplate>
  );
}

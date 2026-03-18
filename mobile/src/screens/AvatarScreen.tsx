import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { AvatarPayload } from "../lib/types";

const EXP_ITEM_ID = "itm_exp_small";
const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 12, padding: 16, gap: 8 } as const;

function getAvatarFace(avatarType?: string) {
  switch ((avatarType ?? "").toLowerCase()) {
    case "cat":
      return { face: "ฅ^•ﻌ•^ฅ", label: "Cat Hero" };
    case "rabbit":
      return { face: "(/・ω・)/", label: "Rabbit Idol" };
    case "fox":
      return { face: "^ↀᴥↀ^", label: "Fox Mystic" };
    case "dog":
      return { face: "U・ᴥ・U", label: "Dog Ranger" };
    default:
      return { face: "( •̀ ω •́ )✧", label: "Original Avatar" };
  }
}

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

  const expItemQuantity = useMemo(() => {
    const row = payload?.items.find((i) => i.item.id === EXP_ITEM_ID);
    return row?.quantity ?? 0;
  }, [payload]);

  const avatarVisual = useMemo(() => getAvatarFace(payload?.avatar.avatarType), [payload?.avatar.avatarType]);

  const levelUp = async () => {
    if (!userId) return;
    if (expItemQuantity < 1) {
      setMsg("育成アイテムが不足しています（報酬獲得後に再実行してください）");
      return;
    }

    try {
      await apiRequest("/api/avatar/level-up", {
        method: "POST",
        userId,
        body: { itemId: EXP_ITEM_ID, quantity: 1 },
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
          <View style={{ ...CARD_STYLE, alignItems: "center" }}>
            <Text style={{ color: "#F7D774", fontSize: 18, fontWeight: "700" }}>{avatarVisual.label}</Text>
            <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: "#233054", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#5BA7FF" }}>
              <Text style={{ color: "#F4F7FF", fontSize: 42 }}>{avatarVisual.face}</Text>
            </View>
            <Text style={{ color: "#AAB4D4" }}>2D character preview</Text>
          </View>

          <View style={CARD_STYLE}>
            <Text style={{ color: "#F4F7FF" }}>type: {payload.avatar.avatarType}</Text>
            <Text style={{ color: "#F4F7FF" }}>level: {payload.avatar.level}</Text>
            <Text style={{ color: "#F4F7FF" }}>exp: {payload.avatar.exp}</Text>
            <Text style={{ color: "#F4F7FF" }}>exp item qty: {expItemQuantity}</Text>
            <Text style={{ color: "#F4F7FF" }}>items: {payload.items.map((i) => `${i.item.name} x${i.quantity}`).join(", ") || "none"}</Text>
          </View>
        </>
      )}
      <Pressable
        onPress={levelUp}
        disabled={expItemQuantity < 1}
        style={{ backgroundColor: expItemQuantity < 1 ? "#4C5A80" : "#5BA7FF", padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: "#0B1020", fontWeight: "700", textAlign: "center" }}>expアイテムを1個使う</Text>
      </Pressable>
      {!!msg && <Text style={{ color: "#AAB4D4" }}>{msg}</Text>}
    </ScreenTemplate>
  );
}

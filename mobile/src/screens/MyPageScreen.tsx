import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { MyPagePayload } from "../lib/types";

const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 10, padding: 12, gap: 6 } as const;

export function MyPageScreen({ userId }: { userId?: string }) {
  const [me, setMe] = useState<MyPagePayload | null>(null);

  useEffect(() => {
    if (!userId) return;
    apiRequest<MyPagePayload>("/api/me", { userId }).then(setMe).catch(() => setMe(null));
  }, [userId]);

  return (
    <ScreenTemplate title="MyPage">
      {me ? (
        <View style={CARD_STYLE}>
          <Text style={{ color: "#F4F7FF" }}>nickname: {me.nickname}</Text>
          <Text style={{ color: "#F4F7FF" }}>points: {me.totalPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>totalVotes: {me.totalVotes}</Text>
          <Text style={{ color: "#F4F7FF" }}>hitRate: {me.hitRate}</Text>
          <Text style={{ color: "#F4F7FF" }}>avatarLevel: {me.avatarLevel}</Text>
          <Text style={{ color: "#8fe6a4", fontWeight: "700" }}>current winning streak: {me.winningStreak}</Text>
          <Text style={{ color: "#F7D774", fontWeight: "700" }}>best winning streak record: {me.bestWinningStreak}</Text>
        </View>
      ) : (
        <Text style={{ color: "#AAB4D4" }}>データなし</Text>
      )}
    </ScreenTemplate>
  );
}

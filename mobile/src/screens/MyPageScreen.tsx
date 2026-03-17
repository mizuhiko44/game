import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";

export function MyPageScreen({ userId }: { userId?: string }) {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    apiRequest("/api/me", { userId }).then(setMe).catch(() => setMe(null));
  }, [userId]);

  return (
    <ScreenTemplate title="MyPage">
      {me ? (
        <>
          <Text style={{ color: "#F4F7FF" }}>nickname: {me.nickname}</Text>
          <Text style={{ color: "#F4F7FF" }}>points: {me.totalPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>totalVotes: {me.totalVotes}</Text>
          <Text style={{ color: "#F4F7FF" }}>hitRate: {me.hitRate}</Text>
          <Text style={{ color: "#F4F7FF" }}>avatarLevel: {me.avatarLevel}</Text>
        </>
      ) : (
        <Text style={{ color: "#AAB4D4" }}>データなし</Text>
      )}
    </ScreenTemplate>
  );
}
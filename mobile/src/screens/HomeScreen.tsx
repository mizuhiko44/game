import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { HomePayload } from "../lib/types";

export function HomeScreen({ userId }: { userId?: string }) {
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    apiRequest("/api/home", { userId }).then(setPayload).catch((e) => setError((e as Error).message));
  }, [userId]);

  return (
    <ScreenTemplate title="Home">
      {!userId && <Text style={{ color: "#AAB4D4" }}>Onboarding でユーザー作成後に表示されます。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {payload && (
        <>
          <Text style={{ color: "#F4F7FF" }}>Nickname: {payload.userSummary.nickname}</Text>
          <Text style={{ color: "#F4F7FF" }}>Points: {payload.userSummary.totalPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>Recommended: {payload.recommendedEvents.length}</Text>
          <Text style={{ color: "#F4F7FF", marginTop: 12, fontWeight: "700" }}>Result notifications</Text>
          {payload.recentNotifications.length === 0 && <Text style={{ color: "#AAB4D4" }}>まだ通知はありません。</Text>}
          {payload.recentNotifications.map((notice) => (
            <View
              key={notice.id}
              style={{
                backgroundColor: notice.kind === "result_win" ? "#17301E" : "#2B1E1E",
                borderRadius: 12,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>{notice.message}</Text>
              <Text style={{ color: "#AAB4D4" }}>
                あなたの選択: {notice.selectedOptionLabel}
                {notice.winningOptionLabel ? ` / 的中結果: ${notice.winningOptionLabel}` : ""}
              </Text>
              <Text style={{ color: "#AAB4D4" }}>settledAt: {new Date(notice.settledAt).toLocaleString()}</Text>
            </View>
          ))}
        </>
      )}
    </ScreenTemplate>
  );
}

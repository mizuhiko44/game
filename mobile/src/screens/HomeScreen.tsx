import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";

export function HomeScreen({ userId }: { userId?: string }) {
  const [payload, setPayload] = useState<any>(null);
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
        </>
      )}
    </ScreenTemplate>
  );
}
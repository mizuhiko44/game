import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { VoteHistoryItem } from "../lib/types";

export function ResultDetailScreen({ userId, resultId }: { userId?: string; resultId?: string }) {
  const [rows, setRows] = useState<VoteHistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId || !resultId) return;
    apiRequest<VoteHistoryItem[]>("/results", { userId })
      .then(setRows)
      .catch((reason) => setError((reason as Error).message));
  }, [resultId, userId]);

  const result = useMemo(() => rows.find((row) => row.id === resultId), [resultId, rows]);

  return (
    <ScreenTemplate title="ResultDetail">
      {!resultId && <Text style={{ color: "#AAB4D4" }}>ResultListから結果を選択してください。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {!!resultId && !error && !result && <Text style={{ color: "#AAB4D4" }}>指定された結果を取得できませんでした。</Text>}
      {result && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#F4F7FF" }}>event: {result.event.title}</Text>
          <Text style={{ color: "#F4F7FF" }}>my option: {result.option.label}</Text>
          <Text style={{ color: "#F4F7FF" }}>status: {result.status}</Text>
          <Text style={{ color: "#F4F7FF" }}>bet: {result.inputBetPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>reward: {result.rewardPoints}</Text>
        </View>
      )}
    </ScreenTemplate>
  );
}

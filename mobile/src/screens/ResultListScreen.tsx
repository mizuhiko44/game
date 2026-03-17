import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { VoteHistoryItem } from "../lib/types";

export function ResultListScreen({ userId }: { userId?: string }) {
  const [rows, setRows] = useState<VoteHistoryItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    apiRequest<VoteHistoryItem[]>("/api/results", { userId }).then(setRows).catch(() => setRows([]));
  }, [userId]);

  return (
    <ScreenTemplate title="ResultList">
      {rows.map((row) => (
        <Text key={row.id} style={{ color: "#F4F7FF" }}>
          {row.event.title} / {row.status} / reward:{row.rewardPoints}
        </Text>
      ))}
      {!rows.length && <Text style={{ color: "#AAB4D4" }}>結果なし</Text>}
    </ScreenTemplate>
  );
}

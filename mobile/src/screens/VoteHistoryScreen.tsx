import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { VoteHistoryItem } from "../lib/types";

export function VoteHistoryScreen({ userId }: { userId?: string }) {
  const [rows, setRows] = useState<VoteHistoryItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    apiRequest<VoteHistoryItem[]>("/api/votes/history", { userId }).then(setRows).catch(() => setRows([]));
  }, [userId]);

  return (
    <ScreenTemplate title="VoteHistory">
      {rows.map((row) => (
        <Text key={row.id} style={{ color: "#F4F7FF" }}>
          {row.event.title} / {row.option.label} / bet:{row.inputBetPoints} / {row.status}
        </Text>
      ))}
      {!rows.length && <Text style={{ color: "#AAB4D4" }}>履歴なし</Text>}
    </ScreenTemplate>
  );
}

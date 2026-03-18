import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { VoteHistoryItem } from "../lib/types";

export function ResultListScreen({ userId, onSelectResult }: { userId?: string; onSelectResult?: (row: VoteHistoryItem) => void }) {
  const [rows, setRows] = useState<VoteHistoryItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    apiRequest<VoteHistoryItem[]>("/results", { userId }).then(setRows).catch(() => setRows([]));
  }, [userId]);

  return (
    <ScreenTemplate title="ResultList">
      {rows.map((row) => (
        <Pressable key={row.id} onPress={() => onSelectResult?.(row)} style={{ paddingVertical: 6 }}>
          <Text style={{ color: "#F4F7FF" }}>
            {row.event.title} / {row.status} / reward:{row.rewardPoints}
          </Text>
        </Pressable>
      ))}
      {!rows.length && <Text style={{ color: "#AAB4D4" }}>結果なし</Text>}
    </ScreenTemplate>
  );
}

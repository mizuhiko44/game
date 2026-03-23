import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { VoteHistoryItem } from "../lib/types";

const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 10, padding: 12, gap: 6 } as const;

export function ResultListScreen({ userId, onSelectResult }: { userId?: string; onSelectResult?: (resultId: string) => void }) {
  const [rows, setRows] = useState<VoteHistoryItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    apiRequest<VoteHistoryItem[]>("/results", { userId }).then(setRows).catch(() => setRows([]));
  }, [userId]);

  return (
    <ScreenTemplate title="Result">
      {rows.map((row) => (
        <Pressable key={row.id} onPress={() => onSelectResult?.(row.id)}>
          <View style={CARD_STYLE}>
            <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>{row.event.title}</Text>
            <Text style={{ color: "#F4F7FF" }}>my option: {row.option.label}</Text>
            <Text style={{ color: "#F4F7FF" }}>winning option: {row.event.result?.winningOption?.label ?? "未確定"}</Text>
            <Text style={{ color: row.status === "won" ? "#8fe6a4" : "#ff8f8f", fontWeight: "700" }}>result: {row.status}</Text>
            <Text style={{ color: "#F4F7FF" }}>bet: {row.inputBetPoints} / reward: {row.rewardPoints}</Text>
          </View>
        </Pressable>
      ))}
      {!rows.length && <Text style={{ color: "#AAB4D4" }}>個人の投票結果はまだありません。</Text>}
    </ScreenTemplate>
  );
}

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem } from "../lib/types";

const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 10, padding: 12, gap: 6 } as const;

export function VoteHistoryScreen({ userId }: { userId?: string }) {
  const [rows, setRows] = useState<EventItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    apiRequest<EventItem[]>("/events?status=closed", { userId }).then(setRows).catch(() => setRows([]));
  }, [userId]);

  return (
    <ScreenTemplate title="History">
      {rows.map((row) => (
        <View key={row.id} style={CARD_STYLE}>
          <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>{row.title}</Text>
          <Text style={{ color: "#F4F7FF" }}>winning option: {row.result?.winningOption?.label ?? "未確定"}</Text>
          <Text style={{ color: "#F4F7FF" }}>participants: {row.participantCount ?? 0}</Text>
          <Text style={{ color: "#F4F7FF" }}>resultAt: {row.resultAt ?? "-"}</Text>
          <Text style={{ color: "#F4F7FF" }}>my vote: {row.myVote?.optionLabel ?? "未参加"}</Text>
          <Text style={{ color: row.myVote?.status === "won" ? "#8fe6a4" : row.myVote?.status === "lost" ? "#ff8f8f" : "#AAB4D4" }}>
            my result: {row.myVote?.status ?? "-"}
          </Text>
        </View>
      ))}
      {!rows.length && <Text style={{ color: "#AAB4D4" }}>クローズ済みイベントはまだありません。</Text>}
    </ScreenTemplate>
  );
}

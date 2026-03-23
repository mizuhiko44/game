import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventDetailPayload } from "../lib/types";
import { useAppState } from "../state/AppState";
import { colors } from "../theme/colors";

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function EventDetailScreen({ userId, eventId }: { userId?: string; eventId?: string }) {
  const [detail, setDetail] = useState<EventDetailPayload | null>(null);
  const [error, setError] = useState("");
  const { selectEvent } = useAppState();

  useEffect(() => {
    if (!userId || !eventId) return;
    apiRequest<EventDetailPayload>(`/events/${eventId}`, { userId })
      .then(setDetail)
      .catch((e) => setError((e as Error).message));
  }, [userId, eventId]);

  const popularityText = useMemo(() => {
    if (!detail) return "";
    return detail.popularity.map((p) => `${p.optionId}:${p._count}`).join(", ") || "no votes";
  }, [detail]);

  const canVote = detail?.status === "open" && !detail.alreadyVoted;

  return (
    <ScreenTemplate title="EventDetail">
      {!eventId && <Text style={{ color: colors.subText }}>EventListからイベントを選択してください。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {detail && (
        <View style={{ gap: 14 }}>
          <View style={{ backgroundColor: "#141D34", borderRadius: 16, borderWidth: 1, borderColor: "#22304F", padding: 18, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>{detail.title}</Text>
                <Text style={{ color: colors.subText }}>{detail.description ?? "説明なし"}</Text>
              </View>
              <Pressable
                onPress={() => { if (eventId) selectEvent(eventId, "Vote"); }}
                disabled={!canVote}
                style={{
                  backgroundColor: canVote ? colors.accent : "#2B3554",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: canVote ? colors.bg : colors.subText, fontWeight: "700" }}>{canVote ? "Vote" : detail.alreadyVoted ? "投票済み" : "受付終了"}</Text>
              </Pressable>
            </View>

            <Text style={{ color: colors.subText }}>type: {detail.eventType}</Text>
            <Text style={{ color: colors.subText }}>status: {detail.status}</Text>
            <Text style={{ color: colors.subText }}>minBet: {detail.minBetPoints}</Text>
            <Text style={{ color: colors.subText }}>voteEndAt: {formatDateTime(detail.voteEndAt)}</Text>
            <Text style={{ color: colors.subText }}>resultAt: {formatDateTime(detail.resultAt)}</Text>
            <Text style={{ color: colors.subText }}>alreadyVoted: {String(detail.alreadyVoted)}</Text>
          </View>

          <View style={{ backgroundColor: "#141D34", borderRadius: 16, borderWidth: 1, borderColor: "#22304F", padding: 18, gap: 8 }}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>選択肢</Text>
            {detail.options?.map((option) => (
              <View key={option.id} style={{ borderWidth: 1, borderColor: "#2B3554", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>{option.label}</Text>
                <Text style={{ color: colors.subText }}>optionId: {option.id}</Text>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: "#141D34", borderRadius: 16, borderWidth: 1, borderColor: "#22304F", padding: 18, gap: 8 }}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>Popularity</Text>
            <Text style={{ color: colors.subText }}>{popularityText}</Text>
            {canVote && (
              <Pressable onPress={() => { if (eventId) selectEvent(eventId, "Vote"); }} style={{ marginTop: 6, alignSelf: "flex-start" }}>
                <Text style={{ color: colors.accent, fontWeight: "700" }}>このイベントに投票する →</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </ScreenTemplate>
  );
}

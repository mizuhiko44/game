import { useEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventDetailPayload } from "../lib/types";

export function EventDetailScreen({ userId, eventId }: { userId?: string; eventId?: string }) {
  const [detail, setDetail] = useState<EventDetailPayload | null>(null);
  const [error, setError] = useState("");

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

  return (
    <ScreenTemplate title="EventDetail">
      {!eventId && <Text style={{ color: "#AAB4D4" }}>EventListからイベントを選択してください。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {detail && (
        <>
          <Text style={{ color: "#F4F7FF" }}>title: {detail.title}</Text>
          <Text style={{ color: "#F4F7FF" }}>type: {detail.eventType}</Text>
          <Text style={{ color: "#F4F7FF" }}>status: {detail.status}</Text>
          <Text style={{ color: "#F4F7FF" }}>minBet: {detail.minBetPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>alreadyVoted: {String(detail.alreadyVoted)}</Text>
          <Text style={{ color: "#F4F7FF" }}>options: {detail.options?.map((o) => o.label).join(", ")}</Text>
          <Text style={{ color: "#AAB4D4" }}>popularity: {popularityText}</Text>
        </>
      )}
    </ScreenTemplate>
  );
}

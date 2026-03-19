import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem, EventParticipantsPayload } from "../lib/types";

function formatRemaining(targetAt?: string, nowMs = Date.now()) {
  if (!targetAt) return "-";

  const diffMs = new Date(targetAt).getTime() - nowMs;
  if (diffMs <= 0) return "0m";

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function EventListScreen({ userId, onSelectEvent }: { userId?: string; onSelectEvent?: (eventId: string) => void }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | undefined>();
  const [participantsByEvent, setParticipantsByEvent] = useState<Record<string, EventParticipantsPayload>>({});
  const [loadingEventId, setLoadingEventId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (!userId) return;
    apiRequest<EventItem[]>("/events?status=open", { userId })
      .then(setEvents)
      .catch((e) => setError((e as Error).message));
  }, [userId]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.voteEndAt).getTime() - new Date(b.voteEndAt).getTime()),
    [events]
  );

  const toggleParticipants = async (eventId: string) => {
    if (!userId) return;
    if (expandedEventId === eventId) {
      setExpandedEventId(undefined);
      return;
    }

    setExpandedEventId(eventId);
    if (participantsByEvent[eventId]) return;

    try {
      setLoadingEventId(eventId);
      const payload = await apiRequest<EventParticipantsPayload>(`/events/${eventId}/participants`, { userId });
      setParticipantsByEvent((prev) => ({ ...prev, [eventId]: payload }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingEventId(undefined);
    }
  };

  return (
    <ScreenTemplate title="EventList">
      {!userId && <Text style={{ color: "#AAB4D4" }}>x-user-id が必要です。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {!sortedEvents.length && userId && <Text style={{ color: "#AAB4D4" }}>表示できる open イベントはありません。</Text>}
      {sortedEvents.map((event) => {
        const participants = participantsByEvent[event.id];
        const expanded = expandedEventId === event.id;
        const voteDeadlinePassed = new Date(event.voteEndAt).getTime() <= nowMs;
        const resultTimePassed = event.resultAt ? new Date(event.resultAt).getTime() <= nowMs : false;

        return (
          <View key={event.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#2B3554", gap: 8 }}>
            <Pressable onPress={() => onSelectEvent?.(event.id)}>
              <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>
                [{event.eventType}] {event.title}
              </Text>
              <Text style={{ color: "#AAB4D4" }}>min:{event.minBetPoints} / joined:{event.participantCount ?? 0}</Text>
              <Text style={{ color: voteDeadlinePassed ? "#ffb366" : "#8fe6a4" }}>
                {voteDeadlinePassed ? "投票締切を過ぎています" : `投票締切まで: ${formatRemaining(event.voteEndAt, nowMs)}`}
              </Text>
              <Text style={{ color: resultTimePassed ? "#ffb366" : "#AAB4D4" }}>
                結果反映まで: {formatRemaining(event.resultAt, nowMs)}
              </Text>
            </Pressable>

            <Pressable onPress={() => toggleParticipants(event.id)}>
              <Text style={{ color: "#5BA7FF" }}>{expanded ? "参加メンバーを閉じる" : "参加メンバーを表示"}</Text>
            </Pressable>

            {expanded && loadingEventId === event.id && <Text style={{ color: "#AAB4D4" }}>参加メンバーを取得中...</Text>}
            {expanded && loadingEventId !== event.id && participants && (
              <View style={{ gap: 6, backgroundColor: "#141D34", borderRadius: 8, padding: 10 }}>
                <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>参加者 {participants.participantCount}人</Text>
                {!participants.participants.length && <Text style={{ color: "#AAB4D4" }}>まだ参加者はいません。</Text>}
                {participants.participants.map((row) => (
                  <Text key={row.voteId} style={{ color: "#F4F7FF" }}>
                    {row.user.nickname} ({row.user.regionCode}) / {row.option.label}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScreenTemplate>
  );
}

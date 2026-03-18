import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem, EventParticipantsPayload } from "../lib/types";

export function EventListScreen({ userId, onSelectEvent }: { userId?: string; onSelectEvent?: (eventId: string) => void }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | undefined>();
  const [participantsByEvent, setParticipantsByEvent] = useState<Record<string, EventParticipantsPayload>>({});
  const [loadingEventId, setLoadingEventId] = useState<string | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    apiRequest<EventItem[]>("/events?status=open", { userId })
      .then(setEvents)
      .catch((e) => setError((e as Error).message));
  }, [userId]);

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
      {!events.length && userId && <Text style={{ color: "#AAB4D4" }}>表示できる open イベントはありません。</Text>}
      {events.map((event) => {
        const participants = participantsByEvent[event.id];
        const expanded = expandedEventId === event.id;

        return (
          <View key={event.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#2B3554", gap: 8 }}>
            <Pressable onPress={() => onSelectEvent?.(event.id)}>
              <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>
                [{event.eventType}] {event.title}
              </Text>
              <Text style={{ color: "#AAB4D4" }}>min:{event.minBetPoints} / joined:{event.participantCount ?? 0}</Text>
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

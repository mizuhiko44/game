import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem } from "../lib/types";

export function EventListScreen({ userId, onSelectEvent }: { userId?: string; onSelectEvent?: (eventId: string) => void }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    apiRequest<EventItem[]>("/events?status=open", { userId })
      .then(setEvents)
      .catch((e) => setError((e as Error).message));
  }, [userId]);

  return (
    <ScreenTemplate title="EventList">
      {!userId && <Text style={{ color: "#AAB4D4" }}>x-user-id が必要です。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {events.map((event) => (
        <Pressable key={event.id} onPress={() => onSelectEvent?.(event.id)} style={{ paddingVertical: 6 }}>
          <Text style={{ color: "#F4F7FF" }}>
            [{event.eventType}] {event.title} / min:{event.minBetPoints}
          </Text>
        </Pressable>
      ))}
    </ScreenTemplate>
  );
}

import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem } from "../lib/types";

export function EventListScreen({ userId }: { userId?: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    apiRequest<EventItem[]>("/api/events?status=open", { userId })
      .then(setEvents)
      .catch((e) => setError((e as Error).message));
  }, [userId]);

  return (
    <ScreenTemplate title="EventList">
      {!userId && <Text style={{ color: "#AAB4D4" }}>x-user-id が必要です。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {events.map((event) => (
        <Text key={event.id} style={{ color: "#F4F7FF" }}>
          [{event.eventType}] {event.title} / min:{event.minBetPoints}
        </Text>
      ))}
    </ScreenTemplate>
  );
}
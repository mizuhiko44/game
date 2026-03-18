import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem, VoteCreateResponse } from "../lib/types";

export function VoteScreen({ userId, onComplete }: { userId?: string; onComplete?: (vote: VoteCreateResponse) => void }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [betPoints, setBetPoints] = useState("100");
  const [message, setMessage] = useState("");

  const refreshEvents = async () => {
    if (!userId) return;
    const rows = await apiRequest<EventItem[]>("/events?status=open", { userId });
    setEvents(rows);
  };

  useEffect(() => {
    refreshEvents().catch((e) => setMessage((e as Error).message));
  }, [userId]);

  useEffect(() => {
    if (!events.length) {
      setEventId("");
      setOptionId("");
      return;
    }

    const selectedEvent = events.find((event) => event.id === eventId) ?? events[0];
    setEventId(selectedEvent.id);

    const selectedOption = selectedEvent.options?.find((option) => option.id === optionId) ?? selectedEvent.options?.[0];
    setOptionId(selectedOption?.id ?? "");
  }, [events, eventId, optionId]);

  const currentEvent = useMemo(() => events.find((event) => event.id === eventId), [events, eventId]);
  const currentOptions = currentEvent?.options ?? [];

  const submit = async () => {
    if (!userId || !eventId || !optionId) return;
    try {
      const vote = await apiRequest<VoteCreateResponse>("/votes", {
        method: "POST",
        userId,
        body: { eventId, optionId, betPoints: Number(betPoints) },
      });
      setMessage(`投票完了: ${vote.id} / 消費 ${vote.actualConsumedPoints}pt`);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      onComplete?.(vote);
    } catch (e) {
      const errorMessage = (e as Error).message;
      setMessage(errorMessage);
      if (errorMessage === "event closed" || errorMessage === "already voted") {
        refreshEvents().catch(() => undefined);
      }
    }
  };

  return (
    <ScreenTemplate title="Vote">
      {!userId && <Text style={{ color: "#AAB4D4" }}>x-user-id が必要です。</Text>}
      <Text style={{ color: "#AAB4D4" }}>open events: {events.length}</Text>
      {!events.length && <Text style={{ color: "#AAB4D4" }}>投票可能な open イベントはありません。</Text>}
      {!!currentEvent && (
        <>
          <Text style={{ color: "#F4F7FF" }}>event: {currentEvent.title}</Text>
          <Text style={{ color: "#F4F7FF" }}>minBet: {currentEvent.minBetPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>eventId: {eventId}</Text>
          <Text style={{ color: "#F4F7FF" }}>optionId: {optionId || "(未選択)"}</Text>
          <Text style={{ color: "#AAB4D4", fontWeight: "700", marginTop: 8 }}>options</Text>
          {currentOptions.map((option) => (
            <Pressable key={option.id} onPress={() => setOptionId(option.id)} style={{ paddingVertical: 4 }}>
              <Text style={{ color: option.id === optionId ? "#5BA7FF" : "#F4F7FF" }}>{option.label}</Text>
            </Pressable>
          ))}
        </>
      )}
      <TextInput value={betPoints} onChangeText={setBetPoints} keyboardType="numeric" style={{ color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 }} />
      <Pressable onPress={submit} disabled={!eventId || !optionId} style={{ backgroundColor: !eventId || !optionId ? "#4C5A80" : "#5BA7FF", padding: 12, borderRadius: 8 }}>
        <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>投票する</Text>
      </Pressable>
      {!!message && <Text style={{ color: "#F4F7FF" }}>{message}</Text>}
    </ScreenTemplate>
  );
}

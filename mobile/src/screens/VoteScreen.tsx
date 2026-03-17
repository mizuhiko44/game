import { useEffect, useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem } from "../lib/types";

export function VoteScreen({ userId }: { userId?: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("evt_global_1");
  const [optionId, setOptionId] = useState("opt_global_1");
  const [betPoints, setBetPoints] = useState("100");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) return;
    apiRequest<EventItem[]>("/api/events?status=open", { userId }).then(setEvents).catch(() => {});
  }, [userId]);

  const submit = async () => {
    if (!userId) return;
    try {
      const vote = await apiRequest<{ id: string; actualConsumedPoints: number }>("/api/votes", {
        method: "POST",
        userId,
        body: { eventId, optionId, betPoints: Number(betPoints) },
      });
      setMessage(`投票完了: ${vote.id} / 消費 ${vote.actualConsumedPoints}pt`);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  return (
    <ScreenTemplate title="Vote">
      {!userId && <Text style={{ color: "#AAB4D4" }}>x-user-id が必要です。</Text>}
      <Text style={{ color: "#AAB4D4" }}>open events: {events.length}</Text>
      <TextInput value={eventId} onChangeText={setEventId} style={{ color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 }} />
      <TextInput value={optionId} onChangeText={setOptionId} style={{ color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 }} />
      <TextInput value={betPoints} onChangeText={setBetPoints} keyboardType="numeric" style={{ color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 }} />
      <Pressable onPress={submit} style={{ backgroundColor: "#5BA7FF", padding: 12, borderRadius: 8 }}>
        <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>投票する</Text>
      </Pressable>
      {!!message && <Text style={{ color: "#F4F7FF" }}>{message}</Text>}
    </ScreenTemplate>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem, VoteCreateResponse } from "../lib/types";

const INPUT_STYLE = { color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 } as const;
const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 10, padding: 12, gap: 6 } as const;

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

  const rankedEvents = useMemo(
    () => [...events].sort((a, b) => (b.participantCount ?? 0) - (a.participantCount ?? 0) || a.title.localeCompare(b.title)),
    [events]
  );

  useEffect(() => {
    if (!rankedEvents.length) {
      setEventId("");
      setOptionId("");
      return;
    }

    const selectedEvent = rankedEvents.find((event) => event.id === eventId) ?? rankedEvents[0];
    setEventId(selectedEvent.id);

    const selectedOption = selectedEvent.options?.find((option) => option.id === optionId) ?? selectedEvent.options?.[0];
    setOptionId(selectedOption?.id ?? "");
  }, [rankedEvents, eventId, optionId]);

  const currentEvent = useMemo(() => rankedEvents.find((event) => event.id === eventId), [rankedEvents, eventId]);
  const currentOptions = currentEvent?.options ?? [];
  const importanceRank = currentEvent ? rankedEvents.findIndex((event) => event.id === currentEvent.id) + 1 : 0;

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
      <Text style={{ color: "#AAB4D4" }}>open events: {rankedEvents.length}</Text>
      {!rankedEvents.length && <Text style={{ color: "#AAB4D4" }}>投票可能な open イベントはありません。</Text>}

      {!!rankedEvents.length && (
        <>
          <View style={{ gap: 8 }}>
            <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>イベント選択</Text>
            {rankedEvents.map((event, index) => (
              <Pressable
                key={event.id}
                onPress={() => setEventId(event.id)}
                style={{
                  ...CARD_STYLE,
                  borderWidth: 1,
                  borderColor: event.id === eventId ? "#5BA7FF" : "#2B3554",
                }}
              >
                <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>{event.title}</Text>
                <Text style={{ color: "#AAB4D4" }}>重要度ランク: #{index + 1}</Text>
                <Text style={{ color: "#AAB4D4" }}>参加者: {event.participantCount ?? 0}人 / minBet: {event.minBetPoints}</Text>
              </Pressable>
            ))}
          </View>

          {!!currentEvent && (
            <View style={{ gap: 10 }}>
              <View style={CARD_STYLE}>
                <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>イベント名</Text>
                <Text style={{ color: "#F4F7FF" }}>{currentEvent.title}</Text>
                <Text style={{ color: "#AAB4D4" }}>重要度ランク: #{importanceRank}</Text>
              </View>

              <View style={CARD_STYLE}>
                <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>イベント情報</Text>
                <Text style={{ color: "#F4F7FF" }}>type: {currentEvent.eventType}</Text>
                <Text style={{ color: "#F4F7FF" }}>category: {currentEvent.category ?? "-"}</Text>
                <Text style={{ color: "#F4F7FF" }}>region: {currentEvent.regionCode ?? "global"}</Text>
                <Text style={{ color: "#F4F7FF" }}>minBet: {currentEvent.minBetPoints}</Text>
                <Text style={{ color: "#F4F7FF" }}>participants: {currentEvent.participantCount ?? 0}</Text>
              </View>

              <View style={CARD_STYLE}>
                <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>スケジュール・説明</Text>
                <Text style={{ color: "#F4F7FF" }}>voteEndAt: {currentEvent.voteEndAt}</Text>
                <Text style={{ color: "#F4F7FF" }}>resultAt: {currentEvent.resultAt ?? "-"}</Text>
                <Text style={{ color: "#F4F7FF" }}>{currentEvent.description ?? "説明なし"}</Text>
              </View>

              <View style={CARD_STYLE}>
                <Text style={{ color: "#AAB4D4", fontWeight: "700" }}>選択肢</Text>
                {currentOptions.map((option) => (
                  <Pressable key={option.id} onPress={() => setOptionId(option.id)} style={{ paddingVertical: 4 }}>
                    <Text style={{ color: option.id === optionId ? "#5BA7FF" : "#F4F7FF" }}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <TextInput value={betPoints} onChangeText={setBetPoints} keyboardType="numeric" style={INPUT_STYLE} />
          <Pressable onPress={submit} disabled={!eventId || !optionId} style={{ backgroundColor: !eventId || !optionId ? "#4C5A80" : "#5BA7FF", padding: 12, borderRadius: 8 }}>
            <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>投票する</Text>
          </Pressable>
        </>
      )}

      {!!message && <Text style={{ color: "#F4F7FF" }}>{message}</Text>}
    </ScreenTemplate>
  );
}

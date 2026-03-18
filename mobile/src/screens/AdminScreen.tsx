import { useEffect, useMemo, useState } from "react";
import { Pressable, Text } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { AdminSettleResponse, EventDetailPayload, EventItem } from "../lib/types";

export function AdminScreen({ userId }: { userId?: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [detail, setDetail] = useState<EventDetailPayload | null>(null);
  const [winningOptionId, setWinningOptionId] = useState<string | undefined>();
  const [settleResult, setSettleResult] = useState<AdminSettleResponse | null>(null);
  const [error, setError] = useState("");

  const refreshEvents = async () => {
    if (!userId) return;
    const rows = await apiRequest<EventItem[]>("/events", { userId });
    setEvents(rows);
  };

  const refreshDetail = async (eventId: string) => {
    if (!userId) return;
    const payload = await apiRequest<EventDetailPayload>(`/events/${eventId}`, { userId });
    setDetail(payload);
    setWinningOptionId(payload.options?.[0]?.id);
  };

  useEffect(() => {
    refreshEvents().catch((e) => setError((e as Error).message));
  }, [userId]);

  useEffect(() => {
    if (!selectedEventId) return;
    refreshDetail(selectedEventId).catch((e) => setError((e as Error).message));
  }, [selectedEventId, userId]);

  const pendingEvents = useMemo(() => events.filter((event) => event.status !== "settled"), [events]);

  const submitSettle = async () => {
    if (!userId || !selectedEventId || !winningOptionId) return;
    try {
      setError("");
      const result = await apiRequest<AdminSettleResponse>("/admin/events/settle", {
        method: "POST",
        userId,
        body: { eventId: selectedEventId, winningOptionId },
      });
      setSettleResult(result);
      await refreshEvents();
      await refreshDetail(selectedEventId);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ScreenTemplate title="Admin">
      {!userId && <Text style={{ color: "#AAB4D4" }}>管理操作には x-user-id が必要です。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}

      <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>結果未確定イベント</Text>
      {pendingEvents.map((event) => (
        <Pressable key={event.id} onPress={() => setSelectedEventId(event.id)} style={{ paddingVertical: 6 }}>
          <Text style={{ color: selectedEventId === event.id ? "#5BA7FF" : "#F4F7FF" }}>
            {event.title} [{event.status}]
          </Text>
        </Pressable>
      ))}
      {!pendingEvents.length && <Text style={{ color: "#AAB4D4" }}>未確定イベントはありません。</Text>}

      {detail && (
        <>
          <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 12 }}>選択中イベント</Text>
          <Text style={{ color: "#F4F7FF" }}>title: {detail.title}</Text>
          <Text style={{ color: "#F4F7FF" }}>status: {detail.status}</Text>
          <Text style={{ color: "#F4F7FF" }}>alreadyVoted(by admin user): {String(detail.alreadyVoted)}</Text>

          <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 12 }}>正解選択肢を選択</Text>
          {detail.options?.map((option) => (
            <Pressable key={option.id} onPress={() => setWinningOptionId(option.id)} style={{ paddingVertical: 6 }}>
              <Text style={{ color: winningOptionId === option.id ? "#5BA7FF" : "#F4F7FF" }}>{option.label}</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={submitSettle}
            disabled={detail.status === "settled" || !winningOptionId}
            style={{
              backgroundColor: detail.status === "settled" || !winningOptionId ? "#4C5A80" : "#5BA7FF",
              padding: 12,
              borderRadius: 8,
              marginTop: 10,
            }}
          >
            <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>結果を確定する</Text>
          </Pressable>
        </>
      )}

      {settleResult && (
        <>
          <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 16 }}>確定サマリー</Text>
          <Text style={{ color: "#F4F7FF" }}>idempotent: {String(settleResult.idempotent)}</Text>
          <Text style={{ color: "#F4F7FF" }}>processedVoteCount: {settleResult.processedVoteCount}</Text>
          <Text style={{ color: "#F4F7FF" }}>winnerCount: {settleResult.winnerCount}</Text>
          <Text style={{ color: "#F4F7FF" }}>totalRewardPoints: {settleResult.totalRewardPoints}</Text>
          <Text style={{ color: "#F4F7FF" }}>rewardedItemUserCount: {settleResult.rewardedItemUserCount}</Text>
        </>
      )}
    </ScreenTemplate>
  );
}

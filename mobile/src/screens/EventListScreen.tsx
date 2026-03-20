import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { EventItem, EventParticipantsPayload } from "../lib/types";
import { isWebPlatform, isWideLayout } from "../lib/platform";
import { colors } from "../theme/colors";

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

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: "#22304F" } as const;
const INPUT_STYLE = { color: colors.text, borderWidth: 1, borderColor: "#2B3554", padding: 12, borderRadius: 10, backgroundColor: "#10182E" } as const;

type EventTypeFilter = "all" | "global" | "local";

export function EventListScreen({ userId, onSelectEvent }: { userId?: string; onSelectEvent?: (eventId: string) => void }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | undefined>();
  const [participantsByEvent, setParticipantsByEvent] = useState<Record<string, EventParticipantsPayload>>({});
  const [loadingEventId, setLoadingEventId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("all");
  const { width } = useWindowDimensions();
  const wideWeb = isWebPlatform() && isWideLayout(width);

  useEffect(() => {
    if (!userId) return;
    apiRequest<EventItem[]>("/events?status=open", { userId })
      .then((rows) => {
        setEvents(rows);
        if (rows[0]) setExpandedEventId((current) => current ?? rows[0].id);
      })
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

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((event) => {
      const matchesType = typeFilter === "all" ? true : event.eventType === typeFilter;
      const haystack = `${event.title} ${event.description ?? ""} ${event.category ?? ""}`.toLowerCase();
      const matchesSearch = search.trim() ? haystack.includes(search.trim().toLowerCase()) : true;
      return matchesType && matchesSearch;
    });
  }, [search, sortedEvents, typeFilter]);

  const activeEvent = useMemo(
    () => filteredEvents.find((event) => event.id === expandedEventId) ?? filteredEvents[0],
    [expandedEventId, filteredEvents]
  );

  const ensureParticipantsLoaded = async (eventId: string) => {
    if (!userId || participantsByEvent[eventId]) return;
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

  const toggleParticipants = async (eventId: string) => {
    if (!userId) return;
    if (expandedEventId === eventId) {
      setExpandedEventId(undefined);
      return;
    }

    setExpandedEventId(eventId);
    await ensureParticipantsLoaded(eventId);
  };

  useEffect(() => {
    if (wideWeb && activeEvent?.id) {
      ensureParticipantsLoaded(activeEvent.id).catch(() => undefined);
    }
  }, [wideWeb, activeEvent?.id]);

  const summaryCards = useMemo(() => {
    const endingSoon = filteredEvents.filter((event) => new Date(event.voteEndAt).getTime() - nowMs <= 60 * 60 * 1000).length;
    const localEvents = filteredEvents.filter((event) => event.eventType === "local").length;
    const joined = filteredEvents.filter((event) => Boolean(event.myVote)).length;
    return [
      { label: "Open events", value: filteredEvents.length, tone: colors.accent },
      { label: "Ending < 1h", value: endingSoon, tone: "#FFD166" },
      { label: "Local events", value: localEvents, tone: "#8FE6A4" },
      { label: "Already joined", value: joined, tone: "#FF8F8F" },
    ];
  }, [filteredEvents, nowMs]);

  return (
    <ScreenTemplate title={wideWeb ? "Events Explorer" : "EventList"}>
      {!userId && <Text style={{ color: colors.subText }}>x-user-id が必要です。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {!sortedEvents.length && userId && <Text style={{ color: colors.subText }}>表示できる open イベントはありません。</Text>}

      {wideWeb && !!sortedEvents.length && (
        <View style={{ gap: 16 }}>
          <View style={{ ...CARD_STYLE, padding: 20 }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>Web prototype</Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>イベント一覧を比較しながら選ぶ</Text>
            <Text style={{ color: colors.subText, lineHeight: 20 }}>
              左で候補を比較し、右で詳細プレビューと参加者情報を確認する構成です。Web では一覧性を優先して、まず選びやすさを改善しています。
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {summaryCards.map((card) => (
              <View key={card.label} style={{ ...CARD_STYLE, minWidth: 180, flex: 1 }}>
                <Text style={{ color: colors.subText }}>{card.label}</Text>
                <Text style={{ color: card.tone, fontSize: 30, fontWeight: "800" }}>{card.value}</Text>
              </View>
            ))}
          </View>

          <View style={{ ...CARD_STYLE, gap: 12 }}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>Filters</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="イベント名・説明・カテゴリで検索" placeholderTextColor="#7F8DB6" style={INPUT_STYLE} />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {(["all", "global", "local"] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setTypeFilter(value)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: typeFilter === value ? colors.accent : "#10182E",
                    borderWidth: 1,
                    borderColor: typeFilter === value ? colors.accent : "#2B3554",
                  }}
                >
                  <Text style={{ color: typeFilter === value ? colors.bg : colors.text, fontWeight: "700" }}>{value}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
            <View style={{ flex: 1.2, gap: 12 }}>
              {filteredEvents.map((event) => {
                const selected = activeEvent?.id === event.id;
                const voteDeadlinePassed = new Date(event.voteEndAt).getTime() <= nowMs;
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => setExpandedEventId(event.id)}
                    style={{
                      ...CARD_STYLE,
                      borderColor: selected ? colors.accent : "#22304F",
                      backgroundColor: selected ? "#182544" : "#141D34",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>{event.title}</Text>
                      <Text style={{ color: selected ? colors.accent : colors.subText }}>{event.eventType}</Text>
                    </View>
                    <Text style={{ color: colors.subText }}>category: {event.category ?? "-"}</Text>
                    <Text style={{ color: voteDeadlinePassed ? "#FFB366" : "#8FE6A4" }}>
                      {voteDeadlinePassed ? "投票締切を過ぎています" : `投票締切まで: ${formatRemaining(event.voteEndAt, nowMs)}`}
                    </Text>
                    <Text style={{ color: colors.subText }}>participants: {event.participantCount ?? 0} / minBet: {event.minBetPoints}</Text>
                    {!!event.myVote && <Text style={{ color: "#8FE6A4", fontWeight: "700" }}>投票済み: {event.myVote.optionLabel}</Text>}
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flex: 0.95, gap: 12 }}>
              {!activeEvent && <Text style={{ color: colors.subText }}>表示対象イベントがありません。</Text>}
              {activeEvent && (
                <View style={{ ...CARD_STYLE, padding: 20 }}>
                  <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{activeEvent.title}</Text>
                  <Text style={{ color: colors.subText }}>{activeEvent.description ?? "説明なし"}</Text>
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <Text style={{ color: colors.subText }}>type: {activeEvent.eventType}</Text>
                    <Text style={{ color: colors.subText }}>category: {activeEvent.category ?? "-"}</Text>
                    <Text style={{ color: colors.subText }}>voteEndAt: {formatDateTime(activeEvent.voteEndAt)}</Text>
                    <Text style={{ color: colors.subText }}>resultAt: {formatDateTime(activeEvent.resultAt)}</Text>
                    <Text style={{ color: colors.subText }}>minBet: {activeEvent.minBetPoints}</Text>
                  </View>

                  <View style={{ gap: 8, marginTop: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>選択肢</Text>
                    {(activeEvent.options ?? []).map((option) => (
                      <View key={option.id} style={{ borderWidth: 1, borderColor: "#2B3554", borderRadius: 10, padding: 10 }}>
                        <Text style={{ color: colors.text }}>{option.label}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                    <Pressable onPress={() => onSelectEvent?.(activeEvent.id)} style={{ backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }}>
                      <Text style={{ color: colors.bg, fontWeight: "700" }}>詳細を見る</Text>
                    </Pressable>
                    <Pressable onPress={() => ensureParticipantsLoaded(activeEvent.id)} style={{ backgroundColor: "#10182E", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#2B3554" }}>
                      <Text style={{ color: colors.text, fontWeight: "700" }}>参加者を更新</Text>
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 8, gap: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>参加者プレビュー</Text>
                    {loadingEventId === activeEvent.id && <Text style={{ color: colors.subText }}>参加メンバーを取得中...</Text>}
                    {loadingEventId !== activeEvent.id && !participantsByEvent[activeEvent.id] && <Text style={{ color: colors.subText }}>まだ取得していません。</Text>}
                    {participantsByEvent[activeEvent.id] && (
                      <View style={{ gap: 8 }}>
                        <Text style={{ color: colors.subText }}>参加者 {participantsByEvent[activeEvent.id].participantCount}人</Text>
                        {participantsByEvent[activeEvent.id].participants.length === 0 && <Text style={{ color: colors.subText }}>まだ参加者はいません。</Text>}
                        {participantsByEvent[activeEvent.id].participants.map((row) => (
                          <View key={row.voteId} style={{ borderWidth: 1, borderColor: "#22304F", borderRadius: 10, padding: 10 }}>
                            <Text style={{ color: colors.text, fontWeight: "700" }}>{row.user.nickname}</Text>
                            <Text style={{ color: colors.subText }}>{row.user.regionCode} / {row.option.label}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {!wideWeb &&
        sortedEvents.map((event) => {
          const participants = participantsByEvent[event.id];
          const expanded = expandedEventId === event.id;
          const voteDeadlinePassed = new Date(event.voteEndAt).getTime() <= nowMs;
          const resultTimePassed = event.resultAt ? new Date(event.resultAt).getTime() <= nowMs : false;

          return (
            <View key={event.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#2B3554", gap: 8 }}>
              <Pressable onPress={() => onSelectEvent?.(event.id)}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  [{event.eventType}] {event.title}
                </Text>
                <Text style={{ color: colors.subText }}>min:{event.minBetPoints} / joined:{event.participantCount ?? 0}</Text>
                <Text style={{ color: voteDeadlinePassed ? "#ffb366" : "#8fe6a4" }}>
                  {voteDeadlinePassed ? "投票締切を過ぎています" : `投票締切まで: ${formatRemaining(event.voteEndAt, nowMs)}`}
                </Text>
                <Text style={{ color: resultTimePassed ? "#ffb366" : colors.subText }}>
                  結果反映まで: {formatRemaining(event.resultAt, nowMs)}
                </Text>
              </Pressable>

              <Pressable onPress={() => toggleParticipants(event.id)}>
                <Text style={{ color: colors.accent }}>{expanded ? "参加メンバーを閉じる" : "参加メンバーを表示"}</Text>
              </Pressable>

              {expanded && loadingEventId === event.id && <Text style={{ color: colors.subText }}>参加メンバーを取得中...</Text>}
              {expanded && loadingEventId !== event.id && participants && (
                <View style={{ gap: 6, backgroundColor: "#141D34", borderRadius: 8, padding: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>参加者 {participants.participantCount}人</Text>
                  {!participants.participants.length && <Text style={{ color: colors.subText }}>まだ参加者はいません。</Text>}
                  {participants.participants.map((row) => (
                    <Text key={row.voteId} style={{ color: colors.text }}>
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

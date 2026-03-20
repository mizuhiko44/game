import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { isWebPlatform, isWideLayout } from "../lib/platform";
import { EventItem, HomePayload } from "../lib/types";
import { useAppState } from "../state/AppState";
import { colors } from "../theme/colors";

const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: "#22304F" } as const;

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function EventPreviewCard({ event, onOpen }: { event: EventItem; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={{ ...CARD_STYLE, flex: 1, minWidth: 220 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>{event.title}</Text>
        <View style={{ backgroundColor: "#1A2A4B", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: "700" }}>{event.eventType}</Text>
        </View>
      </View>
      <Text style={{ color: colors.subText }}>category: {event.category ?? "-"}</Text>
      <Text style={{ color: colors.subText }}>minBet: {event.minBetPoints}pt</Text>
      <Text style={{ color: colors.subText }}>voteEndAt: {formatDateTime(event.voteEndAt)}</Text>
      <Text style={{ color: colors.accent, fontWeight: "700" }}>詳細を見る →</Text>
    </Pressable>
  );
}

export function HomeScreen({ userId }: { userId?: string }) {
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  const wideWeb = isWebPlatform() && isWideLayout(width);
  const { setTab, setSelectedEventId } = useAppState();

  useEffect(() => {
    if (!userId) return;
    apiRequest<HomePayload>("/home", { userId }).then(setPayload).catch((e) => setError((e as Error).message));
  }, [userId]);

  const stats = useMemo(() => {
    if (!payload) return [];
    return [
      { label: "Points", value: payload.userSummary.totalPoints, tone: colors.accent },
      { label: "Recommended", value: payload.recommendedEvents.length, tone: "#8FE6A4" },
      { label: "Ending soon", value: payload.endingSoonEvents.length, tone: "#FFD166" },
      { label: "Notifications", value: payload.recentNotifications.length, tone: "#FF8F8F" },
    ];
  }, [payload]);

  const openEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setTab("EventDetail");
  };

  return (
    <ScreenTemplate title={wideWeb ? "Dashboard" : "Home"}>
      {!userId && <Text style={{ color: colors.subText }}>Onboarding でユーザー作成後に表示されます。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {payload && !wideWeb && (
        <>
          <Text style={{ color: colors.text }}>Nickname: {payload.userSummary.nickname}</Text>
          <Text style={{ color: colors.text }}>Points: {payload.userSummary.totalPoints}</Text>
          <Text style={{ color: colors.text }}>Recommended: {payload.recommendedEvents.length}</Text>
          <Text style={{ color: colors.text, marginTop: 12, fontWeight: "700" }}>Result notifications</Text>
          {payload.recentNotifications.length === 0 && <Text style={{ color: colors.subText }}>まだ通知はありません。</Text>}
          {payload.recentNotifications.map((notice) => (
            <View
              key={notice.id}
              style={{
                backgroundColor: notice.kind === "result_win" ? "#17301E" : "#2B1E1E",
                borderRadius: 12,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>{notice.message}</Text>
              <Text style={{ color: colors.subText }}>
                あなたの選択: {notice.selectedOptionLabel}
                {notice.winningOptionLabel ? ` / 的中結果: ${notice.winningOptionLabel}` : ""}
              </Text>
              <Text style={{ color: colors.subText }}>settledAt: {formatDateTime(notice.settledAt)}</Text>
            </View>
          ))}
        </>
      )}
      {payload && wideWeb && (
        <View style={{ gap: 18 }}>
          <View style={{ ...CARD_STYLE, padding: 22 }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>Web prototype</Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>こんにちは、{payload.userSummary.nickname}</Text>
            <Text style={{ color: colors.subText, lineHeight: 20 }}>
              まず確認すべき情報を 1 画面に集約したダッシュボードです。締切が近いイベント、結果通知、次の操作を上から順に並べています。
            </Text>
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
              <Pressable onPress={() => setTab("Events")} style={{ backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 }}>
                <Text style={{ color: colors.bg, fontWeight: "700" }}>イベントを見る</Text>
              </Pressable>
              <Pressable onPress={() => setTab("Results")} style={{ backgroundColor: "#1A2442", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: "#31456B" }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>結果を見る</Text>
              </Pressable>
              {payload.userSummary.role === "admin" && (
                <Pressable onPress={() => setTab("Admin")} style={{ backgroundColor: "#1A2442", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: "#31456B" }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>Admin Console</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {stats.map((stat) => (
              <View key={stat.label} style={{ ...CARD_STYLE, minWidth: 180, flex: 1 }}>
                <Text style={{ color: colors.subText }}>{stat.label}</Text>
                <Text style={{ color: stat.tone, fontSize: 30, fontWeight: "800" }}>{stat.value}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
            <View style={{ flex: 2, gap: 16 }}>
              <View style={CARD_STYLE}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>締切間近</Text>
                <View style={{ gap: 10 }}>
                  {payload.endingSoonEvents.length === 0 && <Text style={{ color: colors.subText }}>締切間近イベントはありません。</Text>}
                  {payload.endingSoonEvents.map((event) => (
                    <EventPreviewCard key={event.id} event={event} onOpen={() => openEvent(event.id)} />
                  ))}
                </View>
              </View>

              <View style={CARD_STYLE}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>おすすめイベント</Text>
                <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                  {payload.recommendedEvents.length === 0 && <Text style={{ color: colors.subText }}>おすすめイベントはありません。</Text>}
                  {payload.recommendedEvents.map((event) => (
                    <EventPreviewCard key={event.id} event={event} onOpen={() => openEvent(event.id)} />
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flex: 1, gap: 16 }}>
              <View style={CARD_STYLE}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>結果通知</Text>
                {payload.recentNotifications.length === 0 && <Text style={{ color: colors.subText }}>まだ通知はありません。</Text>}
                {payload.recentNotifications.map((notice) => (
                  <View key={notice.id} style={{ borderRadius: 14, padding: 12, gap: 6, backgroundColor: notice.kind === "result_win" ? "#17301E" : "#2B1E1E" }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{notice.message}</Text>
                    <Text style={{ color: colors.subText }}>{notice.eventTitle}</Text>
                    <Text style={{ color: colors.subText }}>settledAt: {formatDateTime(notice.settledAt)}</Text>
                  </View>
                ))}
              </View>

              <View style={CARD_STYLE}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>Avatar summary</Text>
                <Text style={{ color: colors.subText }}>type: {payload.avatarSummary?.avatarType ?? "-"}</Text>
                <Text style={{ color: colors.subText }}>level: {payload.avatarSummary?.level ?? "-"}</Text>
                <Text style={{ color: colors.subText }}>exp: {payload.avatarSummary?.exp ?? "-"}</Text>
                <Pressable onPress={() => setTab("Avatar")} style={{ marginTop: 6 }}>
                  <Text style={{ color: colors.accent, fontWeight: "700" }}>アバター詳細を見る →</Text>
                </Pressable>
              </View>

              <View style={CARD_STYLE}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>Latest settled</Text>
                {payload.settledEvents.length === 0 && <Text style={{ color: colors.subText }}>確定済みイベントはまだありません。</Text>}
                {payload.settledEvents.slice(0, 3).map((event) => (
                  <Pressable key={event.id} onPress={() => openEvent(event.id)} style={{ paddingVertical: 6 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{event.title}</Text>
                    <Text style={{ color: colors.subText }}>{formatDateTime(event.resultAt)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}
    </ScreenTemplate>
  );
}

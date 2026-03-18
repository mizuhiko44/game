import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { AdminCreateEventPayload, AdminRegisteredUser, AdminSettleResponse, EventDetailPayload, EventItem } from "../lib/types";

const INPUT_STYLE = { color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 } as const;
const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 10, padding: 12, gap: 6 } as const;
const EVENT_TYPES: AdminCreateEventPayload["eventType"][] = ["global", "local"];
const CATEGORIES: AdminCreateEventPayload["category"][] = ["sports", "economy", "entertainment", "local"];
const SECTION_BUTTON_STYLE = { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 } as const;

type AdminSection = "create" | "pending" | "users";

function toLocalDateTimeValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export function AdminScreen({ userId }: { userId?: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<AdminRegisteredUser[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [detail, setDetail] = useState<EventDetailPayload | null>(null);
  const [winningOptionId, setWinningOptionId] = useState<string | undefined>();
  const [settleResult, setSettleResult] = useState<AdminSettleResponse | null>(null);
  const [eventType, setEventType] = useState<AdminCreateEventPayload["eventType"]>("global");
  const [category, setCategory] = useState<AdminCreateEventPayload["category"]>("sports");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [minBetPoints, setMinBetPoints] = useState("50");
  const [rewardItemId, setRewardItemId] = useState("itm_exp_small");
  const [rewardItemQuantity, setRewardItemQuantity] = useState("1");
  const [optionsText, setOptionsText] = useState("選択肢A\n選択肢B");
  const [startAt, setStartAt] = useState(toLocalDateTimeValue(new Date()));
  const [voteEndAt, setVoteEndAt] = useState(toLocalDateTimeValue(new Date(Date.now() + 1000 * 60 * 60 * 24)));
  const [resultAt, setResultAt] = useState(toLocalDateTimeValue(new Date(Date.now() + 1000 * 60 * 60 * 48)));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState<AdminSection>("create");

  const refreshEvents = async () => {
    if (!userId) return;
    const rows = await apiRequest<EventItem[]>("/events", { userId });
    setEvents(rows);
  };

  const refreshUsers = async () => {
    if (!userId) return;
    const rows = await apiRequest<AdminRegisteredUser[]>("/admin/users", { userId });
    setRegisteredUsers(rows);
  };

  const refreshDetail = async (currentEventId: string) => {
    if (!userId) return;
    const payload = await apiRequest<EventDetailPayload>(`/events/${currentEventId}`, { userId });
    setDetail(payload);
    setWinningOptionId(payload.result?.winningOptionId ?? payload.options?.[0]?.id);
  };

  useEffect(() => {
    refreshEvents().catch((e) => setError((e as Error).message));
    refreshUsers().catch((e) => setError((e as Error).message));
  }, [userId]);

  useEffect(() => {
    if (!selectedEventId) return;
    refreshDetail(selectedEventId).catch((e) => setError((e as Error).message));
  }, [selectedEventId, userId]);

  const pendingEvents = useMemo(() => events.filter((event) => event.status !== "settled"), [events]);

  const submitCreate = async () => {
    if (!userId) return;
    try {
      setError("");
      setMessage("");
      const payload: AdminCreateEventPayload = {
        eventType,
        category,
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        voteEndAt: new Date(voteEndAt).toISOString(),
        resultAt: new Date(resultAt).toISOString(),
        minBetPoints: Number(minBetPoints),
        rewardItemId: rewardItemId.trim() || undefined,
        rewardItemQuantity: Number(rewardItemQuantity || 0),
        options: optionsText.split("\n").map((row) => row.trim()).filter(Boolean),
        ...(eventType === "local" ? { regionCode: regionCode.trim() } : {}),
      };
      const created = await apiRequest<EventItem>("/admin/events", { method: "POST", userId, body: payload });
      setMessage(`イベントを作成しました: ${created.title}`);
      setActiveSection("pending");
      await refreshEvents();
      setSelectedEventId(created.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submitSettle = async () => {
    if (!userId || !selectedEventId || !winningOptionId) return;
    try {
      setError("");
      setMessage("");
      const result = await apiRequest<AdminSettleResponse>("/admin/events/settle", {
        method: "POST",
        userId,
        body: { eventId: selectedEventId, winningOptionId },
      });
      setSettleResult(result);
      setMessage(
        result.settlementTriggered
          ? "結果を登録し、resultAt 到達済みのため自動精算しました。"
          : "結果を登録しました。resultAt 到達後に自動精算されます。"
      );
      await refreshEvents();
      await refreshDetail(selectedEventId);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const renderSectionButtons = () => (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {([
        ["create", "イベント作成"],
        ["pending", "結果未精算イベント"],
        ["users", "登録者リスト（最大100人）"],
      ] as const).map(([value, label]) => {
        const selected = activeSection === value;
        return (
          <Pressable
            key={value}
            onPress={() => setActiveSection(value)}
            style={{
              ...SECTION_BUTTON_STYLE,
              backgroundColor: selected ? "#5BA7FF" : "#141D34",
              borderColor: selected ? "#5BA7FF" : "#2B3554",
            }}
          >
            <Text style={{ color: selected ? "#0B1020" : "#F4F7FF", fontWeight: "700" }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ScreenTemplate title="Admin">
      {!userId && <Text style={{ color: "#AAB4D4" }}>管理操作には x-user-id が必要です。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {!!message && <Text style={{ color: "#8fe6a4" }}>{message}</Text>}

      {renderSectionButtons()}

      {activeSection === "create" && (
        <>
          <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>イベント作成</Text>
          <View style={{ gap: 8 }}>
            <Text style={{ color: "#AAB4D4" }}>event type</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {EVENT_TYPES.map((value) => (
                <Pressable key={value} onPress={() => setEventType(value)}>
                  <Text style={{ color: eventType === value ? "#5BA7FF" : "#F4F7FF" }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: "#AAB4D4" }}>category</Text>
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              {CATEGORIES.map((value) => (
                <Pressable key={value} onPress={() => setCategory(value)}>
                  <Text style={{ color: category === value ? "#5BA7FF" : "#F4F7FF" }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: "#AAB4D4" }}>title: イベント名を入力</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="title" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
            <Text style={{ color: "#AAB4D4" }}>description: 補足説明（任意）</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="description (optional)" placeholderTextColor="#7E89AF" multiline style={INPUT_STYLE} />
            {eventType === "local" && (
              <>
                <Text style={{ color: "#AAB4D4" }}>regionCode: 地域イベント対象の地域コード</Text>
                <TextInput value={regionCode} onChangeText={setRegionCode} placeholder="regionCode" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
              </>
            )}
            <Text style={{ color: "#AAB4D4" }}>minBetPoints: 最低ベット額</Text>
            <TextInput value={minBetPoints} onChangeText={setMinBetPoints} placeholder="minBetPoints" placeholderTextColor="#7E89AF" keyboardType="numeric" style={INPUT_STYLE} />
            <Text style={{ color: "#AAB4D4" }}>rewardItemId: 報酬アイテムID（任意）</Text>
            <TextInput value={rewardItemId} onChangeText={setRewardItemId} placeholder="rewardItemId (optional)" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
            <Text style={{ color: "#AAB4D4" }}>rewardItemQuantity: 報酬個数</Text>
            <TextInput value={rewardItemQuantity} onChangeText={setRewardItemQuantity} placeholder="rewardItemQuantity" placeholderTextColor="#7E89AF" keyboardType="numeric" style={INPUT_STYLE} />
            <Text style={{ color: "#AAB4D4" }}>startAt: 開始日時</Text>
            <TextInput value={startAt} onChangeText={setStartAt} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
            <Text style={{ color: "#AAB4D4" }}>voteEndAt: 投票締切日時</Text>
            <TextInput value={voteEndAt} onChangeText={setVoteEndAt} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
            <Text style={{ color: "#AAB4D4" }}>resultAt: 結果反映日時</Text>
            <TextInput value={resultAt} onChangeText={setResultAt} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor="#7E89AF" style={INPUT_STYLE} />
            <Text style={{ color: "#AAB4D4" }}>options: 1行に1つずつ選択肢を入力</Text>
            <TextInput value={optionsText} onChangeText={setOptionsText} placeholder="1行1選択肢" placeholderTextColor="#7E89AF" multiline style={INPUT_STYLE} />
            <Pressable onPress={submitCreate} style={{ backgroundColor: "#5BA7FF", padding: 12, borderRadius: 8 }}>
              <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>イベントを作成する</Text>
            </Pressable>
          </View>
        </>
      )}

      {activeSection === "pending" && (
        <>
          <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 20 }}>結果未精算イベント</Text>
          {pendingEvents.map((event) => (
            <Pressable key={event.id} onPress={() => setSelectedEventId(event.id)} style={{ paddingVertical: 6 }}>
              <Text style={{ color: selectedEventId === event.id ? "#5BA7FF" : "#F4F7FF" }}>
                {event.title} [{event.status}]
              </Text>
            </Pressable>
          ))}
          {!pendingEvents.length && <Text style={{ color: "#AAB4D4" }}>未精算イベントはありません。</Text>}

          {detail && (
            <>
              <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 12 }}>選択中イベント</Text>
              <Text style={{ color: "#F4F7FF" }}>title: {detail.title}</Text>
              <Text style={{ color: "#F4F7FF" }}>status: {detail.status}</Text>
              <Text style={{ color: "#F4F7FF" }}>voteEndAt: {detail.voteEndAt}</Text>
              <Text style={{ color: "#F4F7FF" }}>resultAt: {detail.resultAt ?? "-"}</Text>
              <Text style={{ color: "#F4F7FF" }}>participants: {detail.participantCount ?? 0}</Text>
              <Text style={{ color: "#F4F7FF" }}>alreadyVoted(by admin user): {String(detail.alreadyVoted)}</Text>
              <Text style={{ color: "#F4F7FF" }}>registered winning option: {detail.result?.winningOption?.label ?? "未登録"}</Text>

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
                <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>正解を登録する</Text>
              </Pressable>
            </>
          )}

          {settleResult && (
            <>
              <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 16 }}>結果登録サマリー</Text>
              <Text style={{ color: "#F4F7FF" }}>idempotent: {String(settleResult.idempotent)}</Text>
              <Text style={{ color: "#F4F7FF" }}>settlementTriggered: {String(settleResult.settlementTriggered)}</Text>
              <Text style={{ color: "#F4F7FF" }}>eventStatus: {settleResult.eventStatus}</Text>
              <Text style={{ color: "#F4F7FF" }}>processedVoteCount: {settleResult.processedVoteCount}</Text>
              <Text style={{ color: "#F4F7FF" }}>winnerCount: {settleResult.winnerCount}</Text>
              <Text style={{ color: "#F4F7FF" }}>totalRewardPoints: {settleResult.totalRewardPoints}</Text>
              <Text style={{ color: "#F4F7FF" }}>rewardedItemUserCount: {settleResult.rewardedItemUserCount}</Text>
            </>
          )}
        </>
      )}

      {activeSection === "users" && (
        <>
          <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 20 }}>登録者リスト（最大100人）</Text>
          <View style={{ gap: 8 }}>
            {registeredUsers.map((registeredUser) => (
              <View key={registeredUser.id} style={CARD_STYLE}>
                <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>{registeredUser.nickname}</Text>
                <Text style={{ color: "#AAB4D4" }}>userId: {registeredUser.id}</Text>
                <Text style={{ color: "#AAB4D4" }}>region: {registeredUser.regionCode}</Text>
                <Text style={{ color: "#AAB4D4" }}>points: {registeredUser.totalPoints}</Text>
                <Text style={{ color: "#AAB4D4" }}>avatar: {registeredUser.avatarType ?? "-"}</Text>
                <Text style={{ color: "#AAB4D4" }}>createdAt: {registeredUser.createdAt}</Text>
              </View>
            ))}
            {!registeredUsers.length && <Text style={{ color: "#AAB4D4" }}>登録者はいません。</Text>}
          </View>
        </>
      )}
    </ScreenTemplate>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScreenTemplate } from "../components/ScreenTemplate";
import { apiRequest } from "../lib/api";
import { isWebPlatform } from "../lib/platform";
import { AdminCreateEventPayload, AdminMetricsPayload, AdminRegisteredUser, AdminSettleResponse, EventDetailPayload, EventItem } from "../lib/types";

const INPUT_STYLE = { color: "white", borderWidth: 1, borderColor: "#2B3554", padding: 10, borderRadius: 8 } as const;
const CARD_STYLE = { backgroundColor: "#141D34", borderRadius: 10, padding: 12, gap: 6 } as const;
const EVENT_TYPES: AdminCreateEventPayload["eventType"][] = ["global", "local"];
const CATEGORIES: AdminCreateEventPayload["category"][] = ["sports", "economy", "entertainment", "local"];
const SECTION_BUTTON_STYLE = { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 } as const;
const TABLE_ROW_STYLE = { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#2B3554" } as const;

type AdminSection = "create" | "pending" | "users" | "metrics";

function toLocalDateTimeValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export function AdminScreen({ userId, isWideLayout = false }: { userId?: string; isWideLayout?: boolean }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<AdminRegisteredUser[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [detail, setDetail] = useState<EventDetailPayload | null>(null);
  const [metrics, setMetrics] = useState<AdminMetricsPayload | null>(null);
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

  const refreshMetrics = async () => {
    if (!userId) return;
    const payload = await apiRequest<AdminMetricsPayload>("/admin/metrics", { userId });
    setMetrics(payload);
  };

  useEffect(() => {
    refreshEvents().catch((e) => setError((e as Error).message));
    refreshUsers().catch((e) => setError((e as Error).message));
    refreshMetrics().catch((e) => setError((e as Error).message));
  }, [userId]);

  useEffect(() => {
    if (!selectedEventId) return;
    refreshDetail(selectedEventId).catch((e) => setError((e as Error).message));
  }, [selectedEventId, userId]);

  const pendingEvents = useMemo(() => events.filter((event) => event.status !== "settled"), [events]);
  const settledEvents = useMemo(() => events.filter((event) => event.status === "settled"), [events]);
  const adminUsers = useMemo(() => registeredUsers.filter((registeredUser) => registeredUser.role === "admin"), [registeredUsers]);
  const latestSettledEvent = settledEvents[0];

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
      setMessage(result.settlementTriggered ? "結果を登録し、resultAt 到達済みのため自動精算しました。" : "結果を登録しました。resultAt 到達後に自動精算されます。");
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
        ["metrics", "メトリクス"],
      ] as const).map(([value, label]) => {
        const selected = activeSection === value;
        return (
          <Pressable key={value} onPress={() => setActiveSection(value)} style={{ ...SECTION_BUTTON_STYLE, backgroundColor: selected ? "#5BA7FF" : "#141D34", borderColor: selected ? "#5BA7FF" : "#2B3554" }}>
            <Text style={{ color: selected ? "#0B1020" : "#F4F7FF", fontWeight: "700" }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderPendingSection = () => (
    <>
      <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 20 }}>結果未精算イベント</Text>
      <View style={{ flexDirection: isWideLayout ? "row" : "column", gap: 16, alignItems: "flex-start" }}>
        <View style={{ flex: 1, width: "100%", minWidth: isWideLayout ? 320 : undefined }}>
          {pendingEvents.map((event) => (
            <Pressable key={event.id} onPress={() => setSelectedEventId(event.id)} style={{ ...CARD_STYLE, marginBottom: 8, borderWidth: 1, borderColor: selectedEventId === event.id ? "#5BA7FF" : "#2B3554" }}>
              <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>{event.title}</Text>
              <Text style={{ color: "#AAB4D4" }}>{event.status}</Text>
            </Pressable>
          ))}
          {!pendingEvents.length && <Text style={{ color: "#AAB4D4" }}>未精算イベントはありません。</Text>}
        </View>

        <View style={{ flex: 2, width: "100%" }}>
          {detail && (
            <View style={CARD_STYLE}>
              <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>選択中イベント</Text>
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
              <Pressable onPress={submitSettle} disabled={detail.status === "settled" || !winningOptionId} style={{ backgroundColor: detail.status === "settled" || !winningOptionId ? "#4C5A80" : "#5BA7FF", padding: 12, borderRadius: 8, marginTop: 10 }}>
                <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>正解を登録する</Text>
              </Pressable>
            </View>
          )}
          {!detail && <Text style={{ color: "#AAB4D4" }}>イベントを選択すると詳細を表示します。</Text>}
          {settleResult && (
            <View style={[CARD_STYLE, { marginTop: 12 }]}>
              <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>結果登録サマリー</Text>
              <Text style={{ color: "#F4F7FF" }}>idempotent: {String(settleResult.idempotent)}</Text>
              <Text style={{ color: "#F4F7FF" }}>settlementTriggered: {String(settleResult.settlementTriggered)}</Text>
              <Text style={{ color: "#F4F7FF" }}>eventStatus: {settleResult.eventStatus}</Text>
              <Text style={{ color: "#F4F7FF" }}>processedVoteCount: {settleResult.processedVoteCount}</Text>
              <Text style={{ color: "#F4F7FF" }}>winnerCount: {settleResult.winnerCount}</Text>
              <Text style={{ color: "#F4F7FF" }}>totalRewardPoints: {settleResult.totalRewardPoints}</Text>
              <Text style={{ color: "#F4F7FF" }}>rewardedItemUserCount: {settleResult.rewardedItemUserCount}</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  const renderUsersSection = () => (
    <>
      <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 20 }}>登録者リスト（最大100人）</Text>
      {!isWideLayout && (
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
        </View>
      )}
      {isWideLayout && (
        <View style={CARD_STYLE}>
          <View style={{ ...TABLE_ROW_STYLE, borderBottomColor: "#5BA7FF" }}>
            <Text style={{ color: "#5BA7FF", flex: 2, fontWeight: "700" }}>nickname</Text>
            <Text style={{ color: "#5BA7FF", flex: 2, fontWeight: "700" }}>userId</Text>
            <Text style={{ color: "#5BA7FF", flex: 1, fontWeight: "700" }}>region</Text>
            <Text style={{ color: "#5BA7FF", flex: 1, fontWeight: "700" }}>points</Text>
            <Text style={{ color: "#5BA7FF", flex: 1, fontWeight: "700" }}>avatar</Text>
          </View>
          {registeredUsers.map((registeredUser) => (
            <View key={registeredUser.id} style={TABLE_ROW_STYLE}>
              <Text style={{ color: "#F4F7FF", flex: 2 }}>{registeredUser.nickname}</Text>
              <Text style={{ color: "#AAB4D4", flex: 2 }}>{registeredUser.id}</Text>
              <Text style={{ color: "#F4F7FF", flex: 1 }}>{registeredUser.regionCode}</Text>
              <Text style={{ color: "#F4F7FF", flex: 1 }}>{registeredUser.totalPoints}</Text>
              <Text style={{ color: "#F4F7FF", flex: 1 }}>{registeredUser.avatarType ?? "-"}</Text>
            </View>
          ))}
        </View>
      )}
      {!registeredUsers.length && <Text style={{ color: "#AAB4D4" }}>登録者はいません。</Text>}
    </>
  );

  const renderMetricsSection = () => (
    <>
      <Text style={{ color: "#F4F7FF", fontWeight: "700", marginTop: 20 }}>簡易メトリクス</Text>
      {!metrics && <Text style={{ color: "#AAB4D4" }}>メトリクスを読み込み中です。</Text>}
      {metrics && (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Requests", value: metrics.totals.requests, tone: "#5BA7FF" },
              { label: "Errors", value: metrics.totals.errors, tone: "#FF8F8F" },
              { label: "Avg latency(ms)", value: metrics.totals.avgLatencyMs, tone: "#8FE6A4" },
            ].map((card) => (
              <View key={card.label} style={{ ...CARD_STYLE, minWidth: 180, flex: 1 }}>
                <Text style={{ color: "#AAB4D4" }}>{card.label}</Text>
                <Text style={{ color: card.tone, fontSize: 28, fontWeight: "700" }}>{card.value}</Text>
              </View>
            ))}
          </View>

          <View style={CARD_STYLE}>
            <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>Snapshot</Text>
            <Text style={{ color: "#AAB4D4" }}>monitoring enabled: {String(metrics.enabled)}</Text>
            <Text style={{ color: "#AAB4D4" }}>appEnv: {metrics.appEnv}</Text>
            <Text style={{ color: "#AAB4D4" }}>startedAt: {metrics.startedAt}</Text>
            <Text style={{ color: "#AAB4D4" }}>generatedAt: {metrics.generatedAt}</Text>
            <Text style={{ color: "#AAB4D4" }}>lastServerErrorAt: {metrics.totals.lastServerErrorAt ?? "-"}</Text>
            <Pressable
              onPress={() => refreshMetrics().catch((e) => setError((e as Error).message))}
              style={{ backgroundColor: "#5BA7FF", padding: 12, borderRadius: 8, marginTop: 8 }}
            >
              <Text style={{ color: "#0B1020", textAlign: "center", fontWeight: "700" }}>再読み込み</Text>
            </Pressable>
          </View>

          <View style={CARD_STYLE}>
            <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>Route metrics</Text>
            {metrics.routes.length === 0 && <Text style={{ color: "#AAB4D4" }}>まだメトリクスはありません。</Text>}
            {metrics.routes.map((route) => (
              <View key={`${route.method}-${route.path}`} style={{ borderBottomWidth: 1, borderBottomColor: "#2B3554", paddingBottom: 8, marginBottom: 8 }}>
                <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>
                  {route.method} {route.path}
                </Text>
                <Text style={{ color: "#AAB4D4" }}>
                  count: {route.count} / errors: {route.errorCount} / avgLatencyMs: {route.avgLatencyMs}
                </Text>
                <Text style={{ color: "#AAB4D4" }}>
                  lastStatusCode: {route.lastStatusCode} / lastSeenAt: {route.lastSeenAt}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );

  const renderWebOverview = () => (
    <View style={{ gap: 16, marginBottom: 20 }}>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Open / Pending", value: pendingEvents.length, tone: "#5BA7FF" },
          { label: "Settled", value: settledEvents.length, tone: "#8FE6A4" },
          { label: "Registered users", value: registeredUsers.length, tone: "#FFD166" },
          { label: "Admins", value: adminUsers.length, tone: "#FF8F8F" },
        ].map((card) => (
          <View key={card.label} style={{ ...CARD_STYLE, minWidth: 180, flex: 1, borderWidth: 1, borderColor: "#2B3554" }}>
            <Text style={{ color: "#AAB4D4", fontSize: 12 }}>{card.label}</Text>
            <Text style={{ color: card.tone, fontSize: 28, fontWeight: "700" }}>{card.value}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
        <View style={{ ...CARD_STYLE, flex: 2 }}>
          <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>Web admin quick guide</Text>
          <Text style={{ color: "#AAB4D4" }}>1. 「イベント作成」で新規イベントを登録</Text>
          <Text style={{ color: "#AAB4D4" }}>2. 「結果未精算イベント」で正解選択肢を登録</Text>
          <Text style={{ color: "#AAB4D4" }}>3. 「登録者リスト」で demo/admin を含む利用者を確認</Text>
          <Text style={{ color: "#AAB4D4" }}>4. `/admin` ルートをブラウザで直接開けば Web 管理画面として利用できます</Text>
        </View>

        <View style={{ ...CARD_STYLE, flex: 1 }}>
          <Text style={{ color: "#F4F7FF", fontWeight: "700" }}>Latest settled event</Text>
          {latestSettledEvent ? (
            <>
              <Text style={{ color: "#F4F7FF" }}>{latestSettledEvent.title}</Text>
              <Text style={{ color: "#AAB4D4" }}>status: {latestSettledEvent.status}</Text>
              <Text style={{ color: "#AAB4D4" }}>resultAt: {latestSettledEvent.resultAt ?? "-"}</Text>
            </>
          ) : (
            <Text style={{ color: "#AAB4D4" }}>まだ確定済みイベントはありません。</Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <ScreenTemplate title={isWideLayout && isWebPlatform() ? "Web Admin Console" : "Admin"}>
      {!userId && <Text style={{ color: "#AAB4D4" }}>管理操作には x-user-id が必要です。</Text>}
      {!!error && <Text style={{ color: "#ff8f8f" }}>{error}</Text>}
      {!!message && <Text style={{ color: "#8fe6a4" }}>{message}</Text>}
      {isWideLayout && isWebPlatform() && renderWebOverview()}
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
      {activeSection === "pending" && renderPendingSection()}
      {activeSection === "users" && renderUsersSection()}
      {activeSection === "metrics" && renderMetricsSection()}
    </ScreenTemplate>
  );
}

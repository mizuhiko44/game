import { View, Text, Pressable, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { EventListScreen } from "./src/screens/EventListScreen";
import { VoteHistoryScreen } from "./src/screens/VoteHistoryScreen";
import { AvatarScreen } from "./src/screens/AvatarScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";
import { VoteScreen } from "./src/screens/VoteScreen";
import { ResultListScreen } from "./src/screens/ResultListScreen";
import { EventDetailScreen } from "./src/screens/EventDetailScreen";
import { ResultDetailScreen } from "./src/screens/ResultDetailScreen";
import { VoteCompleteScreen } from "./src/screens/VoteCompleteScreen";
import { AdminScreen } from "./src/screens/AdminScreen";
import { apiRequest } from "./src/lib/api";
import { clearSavedNickname, getSavedNickname } from "./src/lib/session";
import { User, VoteCreateResponse, VoteHistoryItem } from "./src/lib/types";

const tabs = [
  "Onboarding",
  "Home",
  "Events",
  "EventDetail",
  "Vote",
  "VoteComplete",
  "History",
  "Results",
  "ResultDetail",
  "Avatar",
  "MyPage",
  "Admin",
] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Onboarding");
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [lastVote, setLastVote] = useState<VoteCreateResponse | undefined>();
  const [selectedResult, setSelectedResult] = useState<VoteHistoryItem | undefined>();

  useEffect(() => {
    async function bootstrap() {
      try {
        const savedNickname = await getSavedNickname();
        if (!savedNickname) return;
        const rememberedUser = await apiRequest<User>("/api/users/login", {
          method: "POST",
          body: { nickname: savedNickname },
        });
        setUser(rememberedUser);
        setTab("Home");
      } catch {
        await clearSavedNickname();
      } finally {
        setBooting(false);
      }
    }

    bootstrap().catch(() => setBooting(false));
  }, []);

  const logout = async () => {
    await clearSavedNickname();
    setUser(null);
    setSelectedEventId(undefined);
    setSelectedResult(undefined);
    setLastVote(undefined);
    setTab("Onboarding");
  };

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0E1428", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#F4F7FF" }}>ログイン情報を確認中...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {tab === "Onboarding" && (
        <OnboardingScreen
          onDone={(u) => {
            setUser(u);
            setTab("Home");
          }}
        />
      )}
      {tab === "Home" && <HomeScreen userId={user?.id} />}
      {tab === "Events" && (
        <EventListScreen
          userId={user?.id}
          onSelectEvent={(eventId) => {
            setSelectedEventId(eventId);
            setTab("EventDetail");
          }}
        />
      )}
      {tab === "EventDetail" && <EventDetailScreen userId={user?.id} eventId={selectedEventId} />}
      {tab === "Vote" && (
        <VoteScreen
          userId={user?.id}
          onComplete={(vote) => {
            setLastVote(vote);
            setTab("VoteComplete");
          }}
        />
      )}
      {tab === "VoteComplete" && <VoteCompleteScreen vote={lastVote} />}
      {tab === "History" && <VoteHistoryScreen userId={user?.id} />}
      {tab === "Results" && (
        <ResultListScreen
          userId={user?.id}
          onSelectResult={(row) => {
            setSelectedResult(row);
            setTab("ResultDetail");
          }}
        />
      )}
      {tab === "ResultDetail" && <ResultDetailScreen result={selectedResult} />}
      {tab === "Avatar" && <AvatarScreen userId={user?.id} />}
      {tab === "MyPage" && <MyPageScreen userId={user?.id} />}
      {tab === "Admin" && <AdminScreen userId={user?.id} />}
      <View style={styles.userBar}>
        <Text style={styles.userText}>nickname: {user?.nickname ?? "(未登録)"} / x-user-id: {user?.id ?? "(未登録)"}</Text>
        {!!user && (
          <Pressable onPress={logout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.active]}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userBar: {
    minHeight: 28,
    backgroundColor: "#0E1428",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 8,
  },
  userText: { color: "#7f8db6", fontSize: 11, flex: 1 },
  logoutText: { color: "#5BA7FF", fontSize: 11, fontWeight: "700" },
  tabBar: {
    height: 56,
    backgroundColor: "#151D33",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  tabLabel: { color: "#AAB4D4", fontSize: 10, marginHorizontal: 2 },
  active: { color: "#5BA7FF", fontWeight: "700" },
});

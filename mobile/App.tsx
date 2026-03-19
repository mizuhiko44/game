import { View, Text } from "react-native";
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
import { Tab } from "./src/lib/navigation";
import { AppShell } from "./src/components/AppShell";

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

  const renderCurrentScreen = () => {
    if (tab === "Onboarding") {
      return (
        <OnboardingScreen
          onDone={(u) => {
            setUser(u);
            setTab("Home");
          }}
        />
      );
    }
    if (tab === "Home") return <HomeScreen userId={user?.id} />;
    if (tab === "Events") {
      return (
        <EventListScreen
          userId={user?.id}
          onSelectEvent={(eventId) => {
            setSelectedEventId(eventId);
            setTab("EventDetail");
          }}
        />
      );
    }
    if (tab === "EventDetail") return <EventDetailScreen userId={user?.id} eventId={selectedEventId} />;
    if (tab === "Vote") {
      return (
        <VoteScreen
          userId={user?.id}
          onComplete={(vote) => {
            setLastVote(vote);
            setTab("VoteComplete");
          }}
        />
      );
    }
    if (tab === "VoteComplete") return <VoteCompleteScreen vote={lastVote} />;
    if (tab === "History") return <VoteHistoryScreen userId={user?.id} />;
    if (tab === "Results") {
      return (
        <ResultListScreen
          userId={user?.id}
          onSelectResult={(row) => {
            setSelectedResult(row);
            setTab("ResultDetail");
          }}
        />
      );
    }
    if (tab === "ResultDetail") return <ResultDetailScreen result={selectedResult} />;
    if (tab === "Avatar") return <AvatarScreen userId={user?.id} />;
    if (tab === "MyPage") return <MyPageScreen userId={user?.id} />;
    if (tab === "Admin") return <AdminScreen userId={user?.id} />;
    return <HomeScreen userId={user?.id} />;
  };

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0E1428", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#F4F7FF" }}>ログイン情報を確認中...</Text>
      </View>
    );
  }

  return (
    <AppShell tab={tab} onTabChange={setTab} nickname={user?.nickname} userId={user?.id} onLogout={logout}>
      {renderCurrentScreen()}
    </AppShell>
  );
}

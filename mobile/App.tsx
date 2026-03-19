import { View, Text, useWindowDimensions } from "react-native";
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
import { clearAuthSession, clearSavedNickname, getSavedNickname } from "./src/lib/session";
import { User } from "./src/lib/types";
import { AppShell } from "./src/components/AppShell";
import { AppStateProvider, useAppState } from "./src/state/AppState";
import { getCurrentRouteState, subscribeRouteChanges, syncRouteState } from "./src/lib/router";
import { reportClientError } from "./src/lib/monitoring";

function AppInner() {
  const [booting, setBooting] = useState(true);
  const { width } = useWindowDimensions();
  const { tab, setTab, user, setUser, selectedEventId, setSelectedEventId, lastVote, setLastVote, selectedResult, setSelectedResult } = useAppState();

  useEffect(() => {
    const route = getCurrentRouteState();
    setTab(route.tab);
    if (route.selectedEventId) setSelectedEventId(route.selectedEventId);
    const unsubscribe = subscribeRouteChanges((nextRoute) => {
      setTab(nextRoute.tab);
      setSelectedEventId(nextRoute.selectedEventId);
    });
    return unsubscribe;
  }, [setSelectedEventId, setTab]);

  useEffect(() => {
    syncRouteState({ tab, selectedEventId, selectedResultId: selectedResult?.id });
  }, [tab, selectedEventId, selectedResult]);

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
        if (tab === "Onboarding") setTab("Home");
      } catch (error) {
        reportClientError(error, { phase: "bootstrap" });
        await clearSavedNickname();
        await clearAuthSession();
      } finally {
        setBooting(false);
      }
    }

    bootstrap().catch((error) => {
      reportClientError(error, { phase: "bootstrap_outer" });
      setBooting(false);
    });
  }, []);

  const logout = async () => {
    await clearSavedNickname();
    await clearAuthSession();
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
          onDone={(nextUser) => {
            setUser(nextUser);
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
    if (tab === "Admin") return <AdminScreen userId={user?.id} isWideLayout={width >= 960} />;
    return <HomeScreen userId={user?.id} />;
  };

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0E1428", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#F4F7FF" }}>ログイン情報を確認中...</Text>
      </View>
    );
  }

  return <AppShell onLogout={logout}>{renderCurrentScreen()}</AppShell>;
}

export default function App() {
  return (
    <AppStateProvider>
      <AppInner />
    </AppStateProvider>
  );
}

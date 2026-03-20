import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { AppShell } from "./src/components/AppShell";
import { ApiError, apiRequest } from "./src/lib/api";
import { AUTH_MODE } from "./src/lib/env";
import { reportClientError } from "./src/lib/monitoring";
import { getCurrentRouteState, subscribeRouteChanges, syncRouteState } from "./src/lib/router";
import { clearAuthSession, clearSavedNickname, getAuthSession, getSavedNickname, saveAuthSession } from "./src/lib/session";
import { AdminScreen } from "./src/screens/AdminScreen";
import { AdminAccessScreen } from "./src/screens/AdminAccessScreen";
import { AvatarScreen } from "./src/screens/AvatarScreen";
import { EventDetailScreen } from "./src/screens/EventDetailScreen";
import { EventListScreen } from "./src/screens/EventListScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ResultDetailScreen } from "./src/screens/ResultDetailScreen";
import { ResultListScreen } from "./src/screens/ResultListScreen";
import { VoteCompleteScreen } from "./src/screens/VoteCompleteScreen";
import { VoteHistoryScreen } from "./src/screens/VoteHistoryScreen";
import { VoteScreen } from "./src/screens/VoteScreen";
import { AppStateProvider, useAppState } from "./src/state/AppState";
import { AuthSessionResponse, User } from "./src/lib/types";

async function persistAuthPayload(payload: AuthSessionResponse) {
  await saveAuthSession({
    accessToken: payload.auth.accessToken,
    refreshToken: payload.auth.refreshToken,
    userId: payload.user.id,
    nickname: payload.user.nickname,
    role: payload.user.role,
    expiresAt: payload.auth.expiresAt,
    refreshExpiresAt: payload.auth.refreshExpiresAt,
  });
}

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
        const savedSession = await getAuthSession();
        if (AUTH_MODE !== "mvp_header" && savedSession?.refreshToken) {
          const refreshed = await apiRequest<AuthSessionResponse>("/api/auth/refresh", {
            method: "POST",
            body: { refreshToken: savedSession.refreshToken },
          });
          await persistAuthPayload(refreshed);
          setUser(refreshed.user);
          if (getCurrentRouteState().tab === "Onboarding") setTab("Home");
          return;
        }

        const savedNickname = await getSavedNickname();
        if (!savedNickname) return;
        const rememberedUser = await apiRequest<AuthSessionResponse>("/api/users/login", {
          method: "POST",
          body: { nickname: savedNickname },
        });
        await persistAuthPayload(rememberedUser);
        setUser(rememberedUser.user);
        if (getCurrentRouteState().tab === "Onboarding") setTab("Home");
      } catch (error) {
        const apiError = error as ApiError;
        reportClientError(error, { phase: "bootstrap" });
        if (AUTH_MODE !== "mvp_header" && [401, 404].includes(apiError.status ?? 0)) {
          await clearSavedNickname();
          await clearAuthSession();
        }
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
    try {
      const session = await getAuthSession();
      if (session?.refreshToken && AUTH_MODE !== "mvp_header") {
        await apiRequest<void>("/api/auth/logout", {
          method: "POST",
          body: { refreshToken: session.refreshToken },
        });
      }
    } catch (error) {
      reportClientError(error, { phase: "logout" });
    } finally {
      await clearSavedNickname();
      await clearAuthSession();
      setUser(null);
      setSelectedEventId(undefined);
      setSelectedResult(undefined);
      setLastVote(undefined);
      setTab("Onboarding");
    }
  };

  const renderCurrentScreen = () => {
    if (tab === "Onboarding") {
      return (
        <OnboardingScreen
          onDone={(nextUser: User) => {
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
    if (tab === "Admin") {
      return user?.role === "admin" ? (
        <AdminScreen userId={user.id} isWideLayout={width >= 960} />
      ) : (
        <AdminAccessScreen userId={user?.id} role={user?.role} />
      );
    }
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

import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { AppShell } from "./src/components/AppShell";
import { ApiError, apiRequest } from "./src/lib/api";
import { AUTH_MODE } from "./src/lib/env";
import { reportClientError } from "./src/lib/monitoring";
import { isWebPlatform } from "./src/lib/platform";
import { getCurrentRouteState, subscribeRouteChanges, syncRouteState } from "./src/lib/router";
import { isSameRoute, resolveRouteGuard } from "./src/lib/routes";
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
  const { route, setRoute, tab, setTab, user, setUser, selectedEventId, selectedResultId, selectEvent, selectResult, lastVote, setLastVote } = useAppState();

  useEffect(() => {
    const nextRoute = getCurrentRouteState();
    setRoute(nextRoute);
    const unsubscribe = subscribeRouteChanges((changedRoute) => {
      setRoute((previous) => (isSameRoute(previous, changedRoute) ? previous : changedRoute));
    });
    return unsubscribe;
  }, [setRoute]);

  useEffect(() => {
    syncRouteState(route);
  }, [route]);

  useEffect(() => {
    if (booting) return;
    const guardRedirect = resolveRouteGuard(route, user);
    if (guardRedirect && !isSameRoute(route, guardRedirect)) {
      setRoute(guardRedirect);
    }
  }, [booting, route, setRoute, user]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const savedSession = await getAuthSession();
        if (AUTH_MODE !== "mvp_header" && (savedSession?.refreshToken || isWebPlatform())) {
          const refreshed = await apiRequest<AuthSessionResponse>("/api/auth/refresh", {
            method: "POST",
            body: savedSession?.refreshToken ? { refreshToken: savedSession.refreshToken } : {},
          });
          await persistAuthPayload(refreshed);
          setUser(refreshed.user);
          return;
        }

        if (AUTH_MODE !== "mvp_header") return;

        const savedNickname = await getSavedNickname();
        if (!savedNickname) return;
        const rememberedUser = await apiRequest<AuthSessionResponse>("/api/users/login", {
          method: "POST",
          body: { nickname: savedNickname },
        });
        await persistAuthPayload(rememberedUser);
        setUser(rememberedUser.user);
      } catch (error) {
        const apiError = error as ApiError;
        reportClientError(error, { phase: "bootstrap" });
        if (AUTH_MODE !== "mvp_header" && [400, 401, 404].includes(apiError.status ?? 0)) {
          await clearAuthSession();
        }
        if (AUTH_MODE === "mvp_header" && [401, 404].includes(apiError.status ?? 0)) {
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
  }, [setUser]);

  const logout = async () => {
    try {
      const session = await getAuthSession();
      if (AUTH_MODE !== "mvp_header") {
        await apiRequest<void>("/api/auth/logout", {
          method: "POST",
          body: session?.refreshToken ? { refreshToken: session.refreshToken } : {},
        });
      }
    } catch (error) {
      reportClientError(error, { phase: "logout" });
    } finally {
      await clearSavedNickname();
      await clearAuthSession();
      setUser(null);
      setLastVote(undefined);
      setRoute({ tab: "Onboarding" });
    }
  };

  const renderCurrentScreen = () => {
    if (tab === "Onboarding") {
      return (
        <OnboardingScreen
          onDone={(nextUser: User) => {
            setUser(nextUser);
            setRoute({ tab: "Home" });
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
            selectEvent(eventId);
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
            setRoute((previous) => ({ ...previous, tab: "VoteComplete" }));
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
          onSelectResult={(resultId) => {
            selectResult(resultId);
          }}
        />
      );
    }
    if (tab === "ResultDetail") return <ResultDetailScreen userId={user?.id} resultId={selectedResultId} />;
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

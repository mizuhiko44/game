import { PropsWithChildren, createContext, useContext, useMemo, useState } from "react";
import { APP_ENV, AUTH_MODE } from "../lib/env";
import { RouteState } from "../lib/routes";
import { User, VoteCreateResponse } from "../lib/types";

const DEFAULT_ROUTE: RouteState = { tab: "Onboarding" };

type AppStateValue = {
  route: RouteState;
  setRoute: (route: RouteState | ((previous: RouteState) => RouteState)) => void;
  tab: RouteState["tab"];
  setTab: (tab: RouteState["tab"]) => void;
  selectedEventId?: string;
  selectedResultId?: string;
  selectEvent: (eventId: string, nextTab?: RouteState["tab"]) => void;
  selectResult: (resultId: string, nextTab?: RouteState["tab"]) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  lastVote?: VoteCreateResponse;
  setLastVote: (vote?: VoteCreateResponse) => void;
  appEnv: string;
  authMode: string;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [route, setRouteState] = useState<RouteState>(DEFAULT_ROUTE);
  const [user, setUser] = useState<User | null>(null);
  const [lastVote, setLastVote] = useState<VoteCreateResponse | undefined>();

  const setRoute: AppStateValue["setRoute"] = (nextRoute) => {
    setRouteState((previous) => (typeof nextRoute === "function" ? nextRoute(previous) : nextRoute));
  };

  const setTab: AppStateValue["setTab"] = (tab) => {
    setRouteState((previous) => ({ ...previous, tab }));
  };

  const selectEvent: AppStateValue["selectEvent"] = (eventId, nextTab = "EventDetail") => {
    setRouteState((previous) => ({ ...previous, tab: nextTab, selectedEventId: eventId }));
  };

  const selectResult: AppStateValue["selectResult"] = (resultId, nextTab = "ResultDetail") => {
    setRouteState((previous) => ({ ...previous, tab: nextTab, selectedResultId: resultId }));
  };

  const value = useMemo(
    () => ({
      route,
      setRoute,
      tab: route.tab,
      setTab,
      selectedEventId: route.selectedEventId,
      selectedResultId: route.selectedResultId,
      selectEvent,
      selectResult,
      user,
      setUser,
      lastVote,
      setLastVote,
      appEnv: APP_ENV,
      authMode: AUTH_MODE,
    }),
    [route, user, lastVote]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}

import { PropsWithChildren, createContext, useContext, useMemo, useState } from "react";
import { APP_ENV, AUTH_MODE } from "../lib/env";
import { Tab } from "../lib/navigation";
import { User, VoteCreateResponse, VoteHistoryItem } from "../lib/types";

type AppStateValue = {
  tab: Tab;
  setTab: (tab: Tab) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  selectedEventId?: string;
  setSelectedEventId: (eventId?: string) => void;
  lastVote?: VoteCreateResponse;
  setLastVote: (vote?: VoteCreateResponse) => void;
  selectedResult?: VoteHistoryItem;
  setSelectedResult: (result?: VoteHistoryItem) => void;
  appEnv: string;
  authMode: string;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [tab, setTab] = useState<Tab>("Onboarding");
  const [user, setUser] = useState<User | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [lastVote, setLastVote] = useState<VoteCreateResponse | undefined>();
  const [selectedResult, setSelectedResult] = useState<VoteHistoryItem | undefined>();

  const value = useMemo(
    () => ({
      tab,
      setTab,
      user,
      setUser,
      selectedEventId,
      setSelectedEventId,
      lastVote,
      setLastVote,
      selectedResult,
      setSelectedResult,
      appEnv: APP_ENV,
      authMode: AUTH_MODE,
    }),
    [tab, user, selectedEventId, lastVote, selectedResult]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}

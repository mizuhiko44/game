export const appTabs = [
  { key: "Onboarding", label: "Onboarding", section: "entry" },
  { key: "Home", label: "Home", section: "main" },
  { key: "Events", label: "Events", section: "main" },
  { key: "EventDetail", label: "EventDetail", section: "detail" },
  { key: "Vote", label: "Vote", section: "main" },
  { key: "VoteComplete", label: "VoteComplete", section: "detail" },
  { key: "History", label: "History", section: "main" },
  { key: "Results", label: "Results", section: "main" },
  { key: "ResultDetail", label: "ResultDetail", section: "detail" },
  { key: "Avatar", label: "Avatar", section: "account" },
  { key: "MyPage", label: "MyPage", section: "account" },
  { key: "Admin", label: "Admin", section: "admin" },
] as const;

export type Tab = (typeof appTabs)[number]["key"];

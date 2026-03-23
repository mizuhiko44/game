import { RouteState } from "./routes";

function canUseBrowserRouting() {
  return typeof window !== "undefined" && typeof window.history !== "undefined";
}

function buildUrl(pathname: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getCurrentRouteState(): RouteState {
  if (!canUseBrowserRouting()) return { tab: "Onboarding" };

  const { pathname, search } = window.location;
  const searchParams = new URLSearchParams(search);

  if (pathname === "/" || pathname === "/onboarding") return { tab: "Onboarding" };
  if (pathname === "/home") return { tab: "Home" };
  if (pathname === "/events") return { tab: "Events" };
  if (pathname.startsWith("/events/")) return { tab: "EventDetail", selectedEventId: decodeURIComponent(pathname.split("/")[2] ?? "") };
  if (pathname === "/vote") return { tab: "Vote", selectedEventId: searchParams.get("eventId") ?? undefined };
  if (pathname === "/vote/complete") return { tab: "VoteComplete", selectedEventId: searchParams.get("eventId") ?? undefined };
  if (pathname === "/history") return { tab: "History" };
  if (pathname === "/results") return { tab: "Results" };
  if (pathname.startsWith("/results/")) return { tab: "ResultDetail", selectedResultId: decodeURIComponent(pathname.split("/")[2] ?? "") };
  if (pathname === "/avatar") return { tab: "Avatar" };
  if (pathname === "/me") return { tab: "MyPage" };
  if (pathname === "/admin") return { tab: "Admin" };
  return { tab: "Home" };
}

export function buildRoutePath(state: RouteState) {
  switch (state.tab) {
    case "Onboarding": return "/onboarding";
    case "Home": return "/home";
    case "Events": return "/events";
    case "EventDetail": return state.selectedEventId ? `/events/${encodeURIComponent(state.selectedEventId)}` : "/events";
    case "Vote": return buildUrl("/vote", { eventId: state.selectedEventId });
    case "VoteComplete": return buildUrl("/vote/complete", { eventId: state.selectedEventId });
    case "History": return "/history";
    case "Results": return "/results";
    case "ResultDetail": return state.selectedResultId ? `/results/${encodeURIComponent(state.selectedResultId)}` : "/results";
    case "Avatar": return "/avatar";
    case "MyPage": return "/me";
    case "Admin": return "/admin";
  }
}

export function syncRouteState(state: RouteState) {
  if (!canUseBrowserRouting()) return;

  const path = buildRoutePath(state);
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath !== path) {
    window.history.pushState({}, "", path);
  }
}

export function subscribeRouteChanges(callback: (state: RouteState) => void) {
  if (!canUseBrowserRouting()) return () => undefined;

  const handler = () => callback(getCurrentRouteState());
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}

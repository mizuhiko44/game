import { Tab } from "./navigation";

type RouteState = {
  tab: Tab;
  selectedEventId?: string;
  selectedResultId?: string;
};

function canUseBrowserRouting() {
  return typeof window !== "undefined" && typeof window.history !== "undefined";
}

export function getCurrentRouteState(): RouteState {
  if (!canUseBrowserRouting()) return { tab: "Onboarding" };

  const pathname = window.location.pathname;
  if (pathname === "/" || pathname === "/onboarding") return { tab: "Onboarding" };
  if (pathname === "/home") return { tab: "Home" };
  if (pathname === "/events") return { tab: "Events" };
  if (pathname.startsWith("/events/")) return { tab: "EventDetail", selectedEventId: pathname.split("/")[2] };
  if (pathname === "/vote") return { tab: "Vote" };
  if (pathname === "/vote/complete") return { tab: "VoteComplete" };
  if (pathname === "/history") return { tab: "History" };
  if (pathname === "/results") return { tab: "Results" };
  if (pathname.startsWith("/results/")) return { tab: "ResultDetail", selectedResultId: pathname.split("/")[2] };
  if (pathname === "/avatar") return { tab: "Avatar" };
  if (pathname === "/me") return { tab: "MyPage" };
  if (pathname === "/admin") return { tab: "Admin" };
  return { tab: "Home" };
}

export function syncRouteState(state: RouteState) {
  if (!canUseBrowserRouting()) return;

  let path = "/";
  switch (state.tab) {
    case "Onboarding": path = "/onboarding"; break;
    case "Home": path = "/home"; break;
    case "Events": path = "/events"; break;
    case "EventDetail": path = state.selectedEventId ? `/events/${state.selectedEventId}` : "/events"; break;
    case "Vote": path = "/vote"; break;
    case "VoteComplete": path = "/vote/complete"; break;
    case "History": path = "/history"; break;
    case "Results": path = "/results"; break;
    case "ResultDetail": path = state.selectedResultId ? `/results/${state.selectedResultId}` : "/results"; break;
    case "Avatar": path = "/avatar"; break;
    case "MyPage": path = "/me"; break;
    case "Admin": path = "/admin"; break;
  }

  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
}

export function subscribeRouteChanges(callback: (state: RouteState) => void) {
  if (!canUseBrowserRouting()) return () => undefined;

  const handler = () => callback(getCurrentRouteState());
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}

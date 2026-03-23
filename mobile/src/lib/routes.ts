import { Tab } from "./navigation";
import { User } from "./types";

export type RouteState = {
  tab: Tab;
  selectedEventId?: string;
  selectedResultId?: string;
};

export type RouteAccess = "public" | "auth" | "admin";

export type RouteDefinition = {
  tab: Tab;
  path: string;
  access: RouteAccess;
  description: string;
  params?: string[];
};

export const routeDefinitions: RouteDefinition[] = [
  { tab: "Onboarding", path: "/onboarding", access: "public", description: "onboarding / login entry" },
  { tab: "Home", path: "/home", access: "auth", description: "home dashboard" },
  { tab: "Events", path: "/events", access: "auth", description: "event list" },
  { tab: "EventDetail", path: "/events/:eventId", access: "auth", description: "event detail", params: ["eventId"] },
  { tab: "Vote", path: "/vote?eventId=:eventId", access: "auth", description: "vote form", params: ["eventId"] },
  { tab: "VoteComplete", path: "/vote/complete?eventId=:eventId", access: "auth", description: "vote completion", params: ["eventId"] },
  { tab: "History", path: "/history", access: "auth", description: "vote history" },
  { tab: "Results", path: "/results", access: "auth", description: "result list" },
  { tab: "ResultDetail", path: "/results/:resultId", access: "auth", description: "result detail", params: ["resultId"] },
  { tab: "Avatar", path: "/avatar", access: "auth", description: "avatar" },
  { tab: "MyPage", path: "/me", access: "auth", description: "my page" },
  { tab: "Admin", path: "/admin", access: "admin", description: "admin console" },
];

export function getRouteDefinition(tab: Tab) {
  return routeDefinitions.find((route) => route.tab === tab);
}

export function isSameRoute(left: RouteState, right: RouteState) {
  return left.tab === right.tab && left.selectedEventId === right.selectedEventId && left.selectedResultId === right.selectedResultId;
}

export function resolveRouteGuard(route: RouteState, user: User | null): RouteState | null {
  const definition = getRouteDefinition(route.tab);
  if (!definition) return null;

  if (!user && definition.access !== "public") {
    return { tab: "Onboarding" };
  }

  if (user && definition.access === "public") {
    return { tab: "Home" };
  }

  if (definition.access === "admin" && user?.role !== "admin") {
    return { tab: "Home" };
  }

  return null;
}

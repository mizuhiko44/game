const DEFAULT_API_BASE_URL = "http://localhost:3000";

// Web開発では localhost:3000 を既定値として使用。
// 実機テスト時は EXPO_PUBLIC_API_BASE_URL をLANのPCアドレスに変更してください。
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

type ApiOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  userId?: string;
};

function normalizePath(path: string) {
  const prefixed = path.startsWith("/") ? path : `/${path}`;
  return prefixed.startsWith("/api") ? prefixed : `/api${prefixed}`;
}

function buildUrl(path: string) {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${normalizePath(path)}`;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.userId) {
    headers["x-user-id"] = options.userId;
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed: ${response.status}`);
  }

  return data as T;
}
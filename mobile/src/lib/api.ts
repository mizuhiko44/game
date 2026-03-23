import { API_BASE_URL, AUTH_MODE } from "./env";
import { reportClientError } from "./monitoring";
import { clearAuthSession, getAuthSession, saveAuthSession } from "./session";
import { AuthSessionResponse } from "./types";

type ApiOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  userId?: string;
  skipAuthRefresh?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
  }
}

function normalizePath(path: string) {
  const prefixed = path.startsWith("/") ? path : `/${path}`;
  return prefixed.startsWith("/api") ? prefixed : `/api${prefixed}`;
}

function buildUrl(path: string) {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${normalizePath(path)}`;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isRefreshableAuthRequest(path: string) {
  const normalizedPath = normalizePath(path);
  return !normalizedPath.startsWith("/api/auth/refresh") && !normalizedPath.startsWith("/api/auth/logout");
}

async function refreshAccessToken() {
  if (AUTH_MODE === "mvp_header") return false;

  const authSession = await getAuthSession();
  try {
    const refreshed = await apiRequest<AuthSessionResponse>("/api/auth/refresh", {
      method: "POST",
      body: authSession?.refreshToken ? { refreshToken: authSession.refreshToken } : {},
      skipAuthRefresh: true,
    });

    await saveAuthSession({
      accessToken: refreshed.auth.accessToken,
      refreshToken: refreshed.auth.refreshToken,
      userId: refreshed.user.id,
      nickname: refreshed.user.nickname,
      role: refreshed.user.role,
      expiresAt: refreshed.auth.expiresAt,
      refreshExpiresAt: refreshed.auth.refreshExpiresAt,
    });
    return true;
  } catch (error) {
    await clearAuthSession();
    reportClientError(error, { phase: "auth_refresh" });
    return false;
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.userId) {
    headers["x-user-id"] = options.userId;
  }

  const authSession = await getAuthSession();
  if (authSession?.accessToken) {
    headers.authorization = `Bearer ${authSession.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });
  } catch (error) {
    reportClientError(error, { phase: "network", path, apiBaseUrl: API_BASE_URL });
    throw new ApiError(`Network error: backendに接続できません。API_BASE_URL=${API_BASE_URL} を確認してください。`);
  }

  if (response.status === 401 && !options.skipAuthRefresh && isRefreshableAuthRequest(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipAuthRefresh: true });
    }
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    reportClientError(new Error(`HTTP ${response.status}`), { phase: "response", path, status: response.status, details: data });
    throw new ApiError((data as { message?: string } | null)?.message ?? `Request failed: ${response.status}`, response.status, data);
  }

  return data as T;
}

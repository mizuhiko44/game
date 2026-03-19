const DEFAULT_API_BASE_URL = "http://localhost:3000";

function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  if (typeof globalThis !== "undefined" && "location" in globalThis) {
    const location = (globalThis as { location?: { origin?: string; hostname?: string } }).location;
    if (location?.origin) {
      const isLocalHost = ["localhost", "127.0.0.1"].includes(location.hostname ?? "");
      return isLocalHost ? DEFAULT_API_BASE_URL : location.origin;
    }
  }

  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

type ApiOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  userId?: string;
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

export async function apiRequest<T>(path: string, options: ApiOptions = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.userId) {
    headers["x-user-id"] = options.userId;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(`Network error: backendに接続できません。API_BASE_URL=${API_BASE_URL} を確認してください。`);
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw new ApiError((data as { message?: string } | null)?.message ?? `Request failed: ${response.status}`, response.status, data);
  }

  return data as T;
}

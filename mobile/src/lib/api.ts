import { reportClientError } from "./monitoring";
import { API_BASE_URL } from "./env";


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
  } catch (error) {
    reportClientError(error, { phase: "network", path, apiBaseUrl: API_BASE_URL });
    throw new ApiError(`Network error: backendに接続できません。API_BASE_URL=${API_BASE_URL} を確認してください。`);
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    reportClientError(new Error(`HTTP ${response.status}`), { phase: "response", path, status: response.status, details: data });
    throw new ApiError((data as { message?: string } | null)?.message ?? `Request failed: ${response.status}`, response.status, data);
  }

  return data as T;
}

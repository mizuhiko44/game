import dotenv from "dotenv";

dotenv.config();

export type AppEnv = "local" | "staging" | "production";
export type AuthMode = "mvp_header" | "jwt_transition" | "jwt_required";

function parseList(value: string | undefined, fallback: string[]) {
  if (!value?.trim()) return fallback;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: parseNumber(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  appEnv: (process.env.APP_ENV ?? "local") as AppEnv,
  logDir: process.env.LOG_DIR ?? "logs",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
  corsOrigins: parseList(process.env.CORS_ORIGINS, ["*"]),
  authMode: (process.env.AUTH_MODE ?? "mvp_header") as AuthMode,
  jwtIssuer: process.env.JWT_ISSUER ?? "prediction-game-mvp",
  jwtAudience: process.env.JWT_AUDIENCE ?? "prediction-game-clients",
  accessTokenTtlMinutes: parseNumber(process.env.ACCESS_TOKEN_TTL_MINUTES, 60),
  refreshTokenTtlDays: parseNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  monitoringEnabled: (process.env.MONITORING_ENABLED ?? "false") === "true",
  sentryDsn: process.env.SENTRY_DSN ?? "",
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT ?? process.env.APP_ENV ?? "local",
};

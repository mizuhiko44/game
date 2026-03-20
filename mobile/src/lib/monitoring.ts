import { APP_ENV } from "./env";

const monitoringEnabled = process.env.EXPO_PUBLIC_MONITORING_ENABLED === "true";
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (!monitoringEnabled) return;

  console.error("monitoring:client_error", {
    appEnv: APP_ENV,
    sentryDsnConfigured: Boolean(sentryDsn),
    context,
    error,
  });
}

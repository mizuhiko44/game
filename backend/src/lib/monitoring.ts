import { env } from "../config/env";
import { logger } from "./logger";

export function reportServerError(error: unknown, context: Record<string, unknown> = {}) {
  if (!env.monitoringEnabled) return;

  logger.error("monitoring:server_error", {
    context,
    sentryEnvironment: env.sentryEnvironment,
    sentryDsnConfigured: Boolean(env.sentryDsn),
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
  });
}

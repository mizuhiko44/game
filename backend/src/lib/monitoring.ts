import { env } from "../config/env";
import { logger } from "./logger";

type RouteMetric = {
  method: string;
  path: string;
  count: number;
  errorCount: number;
  totalLatencyMs: number;
  lastStatusCode: number;
  lastSeenAt: string;
};

const startedAt = new Date();
const routeMetrics = new Map<string, RouteMetric>();
let totalRequests = 0;
let totalErrors = 0;
let totalLatencyMs = 0;
let lastServerErrorAt: string | null = null;

export function recordRequestMetric(input: { method: string; path: string; statusCode: number; elapsedMs: number }) {
  totalRequests += 1;
  totalLatencyMs += input.elapsedMs;

  const key = `${input.method} ${input.path}`;
  const current = routeMetrics.get(key) ?? {
    method: input.method,
    path: input.path,
    count: 0,
    errorCount: 0,
    totalLatencyMs: 0,
    lastStatusCode: input.statusCode,
    lastSeenAt: new Date().toISOString(),
  };

  current.count += 1;
  current.totalLatencyMs += input.elapsedMs;
  current.lastStatusCode = input.statusCode;
  current.lastSeenAt = new Date().toISOString();

  if (input.statusCode >= 400) {
    current.errorCount += 1;
    totalErrors += 1;
  }

  routeMetrics.set(key, current);
}

export function recordServerErrorMetric() {
  totalErrors += 1;
  lastServerErrorAt = new Date().toISOString();
}

export function getMonitoringSnapshot() {
  const routes = Array.from(routeMetrics.values())
    .sort((left, right) => right.count - left.count)
    .map((route) => ({
      ...route,
      avgLatencyMs: Number((route.totalLatencyMs / Math.max(route.count, 1)).toFixed(1)),
    }));

  return {
    enabled: env.monitoringEnabled,
    appEnv: env.appEnv,
    startedAt: startedAt.toISOString(),
    generatedAt: new Date().toISOString(),
    totals: {
      requests: totalRequests,
      errors: totalErrors,
      avgLatencyMs: Number((totalLatencyMs / Math.max(totalRequests, 1)).toFixed(1)),
      lastServerErrorAt,
    },
    routes,
  };
}

export function reportServerError(error: unknown, context: Record<string, unknown> = {}) {
  recordServerErrorMetric();

  if (!env.monitoringEnabled) return;

  logger.error("monitoring:server_error", {
    context,
    sentryEnvironment: env.sentryEnvironment,
    sentryDsnConfigured: Boolean(env.sentryDsn),
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
  });
}

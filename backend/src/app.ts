import { randomUUID } from "crypto";
import cors from "cors";
import express from "express";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error";
import { logger } from "./lib/logger";
import { recordRequestMetric } from "./lib/monitoring";
import { env } from "./config/env";

export const app = express();

function normalizeOrigin(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOrigins.some((entry) => {
    const normalizedEntry = normalizeOrigin(entry);
    if (normalizedEntry === "*") return true;
    if (!normalizedEntry.includes("*")) return normalizedEntry === normalizedOrigin;

    const pattern = normalizedEntry
      .split("*")
      .map((segment) => segment.replace(/[|\{}()[\]^$+?.]/g, "\\$&"))
      .join(".*");

    return new RegExp(`^${pattern}$`).test(normalizedOrigin);
  });
}

const routeSummary = {
  appEnv: env.appEnv,
  public: ["GET /", "GET /health", "GET /api", "GET /api/config", "POST /api/users/onboarding", "POST /api/users/login", "POST /api/auth/login", "POST /api/auth/refresh"],
  protected: [
    "GET /api/home",
    "GET /api/events",
    "POST /api/admin/events",
    "GET /api/admin/users",
    "GET /api/admin/metrics",
    "GET /api/events/:eventId",
    "GET /api/events/:eventId/participants",
    "POST /api/votes",
    "GET /api/votes/history",
    "GET /api/results",
    "GET /api/avatar",
    "POST /api/avatar/level-up",
    "GET /api/me",
    "POST /api/admin/events/settle",
  ],
  auth: {
    mode: env.authMode,
    current: env.authMode === "mvp_header" ? "x-user-id header" : "Bearer token / JWT",
    next: "Bearer token / JWT",
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
  },
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin, env.corsOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  })
);
app.use(express.json());
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  const startAt = process.hrtime.bigint();
  res.setHeader("x-request-id", requestId);
  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    recordRequestMetric({
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      elapsedMs,
    });
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode}`, { elapsedMs: Number(elapsedMs.toFixed(1)), requestId });
  });
  next();
});

app.get("/", (_req, res) =>
  res.json({
    name: "prediction-voting-game-mvp-api",
    docs: "/api",
    health: "/health",
    appEnv: env.appEnv,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true, appEnv: env.appEnv }));
app.get("/api", (_req, res) => res.json(routeSummary));
app.get("/api/config", (_req, res) =>
  res.json({
    appEnv: env.appEnv,
    authMode: env.authMode,
    publicAppUrl: env.publicAppUrl,
    auth: {
      current: env.authMode === "mvp_header" ? "x-user-id" : "bearer-jwt",
      next: "bearer-jwt",
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      accessTokenTtlMinutes: env.accessTokenTtlMinutes,
      refreshTokenTtlDays: env.refreshTokenTtlDays,
    },
  })
);

app.use("/api", router);
app.use(errorMiddleware);

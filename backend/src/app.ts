import { randomUUID } from "crypto";
import cors from "cors";
import express from "express";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error";
import { logger } from "./lib/logger";

export const app = express();

const routeSummary = {
  public: ["GET /", "GET /health", "GET /api", "POST /api/users/onboarding", "POST /api/users/login"],
  protected: [
    "GET /api/home",
    "GET /api/events",
    "POST /api/admin/events",
    "GET /api/admin/users",
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
    type: "header",
    headerName: "x-user-id",
    note: "All protected routes require x-user-id header in MVP.",
  },
};

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  const startAt = process.hrtime.bigint();
  res.setHeader("x-request-id", requestId);
  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startAt) / 1_000_000;
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode}`, { elapsedMs: Number(elapsedMs.toFixed(1)), requestId });
  });
  next();
});

app.get("/", (_req, res) =>
  res.json({
    name: "prediction-voting-game-mvp-api",
    docs: "/api",
    health: "/health",
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api", (_req, res) => res.json(routeSummary));

app.use("/api", router);
app.use(errorMiddleware);

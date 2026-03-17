import cors from "cors";
import express from "express";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error";

export const app = express();

const routeSummary = {
  public: [
    "GET /",
    "GET /health",
    "GET /api",
    "POST /api/users/onboarding",
  ],
  protected: [
    "GET /api/home",
    "GET /api/events",
    "GET /api/events/:eventId",
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
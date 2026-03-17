import cors from "cors";
import express from "express";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error";

export const app = express();

app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", router);
app.use(errorMiddleware);

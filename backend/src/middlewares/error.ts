import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";
import { reportServerError } from "../lib/monitoring";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function isHttpLikeError(err: unknown): err is { status: number; message: string } {
  return typeof err === "object" && err !== null && "status" in err && "message" in err;
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = res.getHeader("x-request-id") ?? req.header("x-request-id");

  if (err instanceof ZodError) {
    logger.warn("validation error", { requestId, path: req.originalUrl, issues: err.issues });
    return res.status(400).json({
      message: "validation error",
      issues: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  if (err instanceof HttpError || isHttpLikeError(err)) {
    logger.warn("handled application error", { requestId, path: req.originalUrl, status: (err as { status: number }).status, message: (err as { message: string }).message });
    return res.status((err as { status: number }).status).json({ message: (err as { message: string }).message });
  }

  logger.error("unhandled application error", {
    requestId,
    path: req.originalUrl,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
  });
  reportServerError(err, { requestId, path: req.originalUrl, method: req.method });
  return res.status(500).json({ message: "Internal Server Error" });
}

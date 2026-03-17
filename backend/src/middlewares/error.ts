import { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function isHttpLikeError(err: unknown): err is { status: number; message: string } {
  return typeof err === "object" && err !== null && "status" in err && "message" in err;
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError || isHttpLikeError(err)) {
    return res.status((err as { status: number }).status).json({ message: (err as { message: string }).message });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal Server Error" });
}

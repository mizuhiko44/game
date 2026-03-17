import { NextFunction, Request, Response } from "express";

export type AuthedRequest = Request & { userId: string };

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.header("x-user-id");
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as AuthedRequest).userId = userId;
  return next();
}

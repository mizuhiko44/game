import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { findUserByAccessToken, resolveUserRole } from "../lib/auth";
import { prisma } from "../lib/prisma";

export type AuthedRequest = Request & {
  userId: string;
  userRole: UserRole;
  authSource: "header" | "jwt";
};

function extractBearerToken(req: Request) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

async function attachUser(req: Request, userId: string, authSource: "header" | "jwt") {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const authed = req as AuthedRequest;
  authed.userId = user.id;
  authed.userRole = resolveUserRole(user);
  authed.authSource = authSource;
  return authed;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const bearerToken = extractBearerToken(req);
    const headerUserId = req.header("x-user-id");

    if (env.authMode === "mvp_header") {
      if (!headerUserId) return res.status(401).json({ message: "x-user-id header is required" });
      const authed = await attachUser(req, headerUserId, "header");
      if (!authed) return res.status(401).json({ message: "Unauthorized" });
      return next();
    }

    if (bearerToken) {
      const user = await findUserByAccessToken(bearerToken);
      const authed = req as AuthedRequest;
      authed.userId = user.id;
      authed.userRole = resolveUserRole(user);
      authed.authSource = "jwt";
      return next();
    }

    if (env.authMode === "jwt_transition" && headerUserId) {
      const authed = await attachUser(req, headerUserId, "header");
      if (!authed) return res.status(401).json({ message: "Unauthorized" });
      return next();
    }

    return res.status(401).json({ message: env.authMode === "jwt_required" ? "Bearer token is required" : "Unauthorized" });
  } catch (error) {
    return res.status(401).json({ message: error instanceof Error ? error.message : "Unauthorized" });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const authed = req as AuthedRequest;
  if (env.authMode !== "mvp_header" && authed.authSource !== "jwt") {
    return res.status(403).json({ message: "Admin API requires Bearer token in this auth mode" });
  }
  if (authed.userRole !== "admin") {
    return res.status(403).json({ message: "Admin role required" });
  }
  return next();
}

import { Request, Response } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { clearRefreshTokenCookie, readRefreshTokenCookie, setRefreshTokenCookie } from "../../lib/auth-cookies";
import { revokeRefreshToken, rotateRefreshToken, serializeUser } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { HttpError } from "../../middlewares/error";

const refreshSchema = z.object({ refreshToken: z.string().min(1).optional().nullable() }).optional();

function resolveRefreshToken(req: Request) {
  const parsed = refreshSchema.parse(req.body);
  const bodyToken = parsed?.refreshToken?.trim();
  return bodyToken || readRefreshTokenCookie(req);
}

export async function refreshAuthToken(req: Request, res: Response) {
  const refreshToken = resolveRefreshToken(req);
  if (!refreshToken) throw new HttpError(400, "refresh token is required");

  try {
    const payload = await rotateRefreshToken(refreshToken);
    setRefreshTokenCookie(res, payload.auth.refreshToken, env.refreshTokenTtlDays);
    return res.json(payload);
  } catch (error) {
    clearRefreshTokenCookie(res);
    throw new HttpError(401, error instanceof Error ? error.message : "refresh token is invalid or expired");
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = resolveRefreshToken(req);
  if (!refreshToken) {
    clearRefreshTokenCookie(res);
    return res.status(204).send();
  }

  try {
    await revokeRefreshToken(refreshToken);
  } catch (error) {
    clearRefreshTokenCookie(res);
    throw new HttpError(401, error instanceof Error ? error.message : "refresh token is invalid or expired");
  }

  clearRefreshTokenCookie(res);
  return res.status(204).send();
}

export async function getAuthMe(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  return res.json(serializeUser(user));
}

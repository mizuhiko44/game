import { Request, Response } from "express";
import { z } from "zod";
import { revokeRefreshToken, rotateRefreshToken, serializeUser } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { HttpError } from "../../middlewares/error";

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export async function refreshAuthToken(req: Request, res: Response) {
  const parsed = refreshSchema.parse(req.body);

  try {
    const payload = await rotateRefreshToken(parsed.refreshToken);
    return res.json(payload);
  } catch (error) {
    throw new HttpError(401, error instanceof Error ? error.message : "refresh token is invalid or expired");
  }
}

export async function logout(req: Request, res: Response) {
  const parsed = refreshSchema.parse(req.body);

  try {
    await revokeRefreshToken(parsed.refreshToken);
  } catch (error) {
    throw new HttpError(401, error instanceof Error ? error.message : "refresh token is invalid or expired");
  }

  return res.status(204).send();
}

export async function getAuthMe(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  return res.json(serializeUser(user));
}

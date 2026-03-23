import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { issueAuthTokensForUser, serializeUser } from "../../lib/auth";
import { setRefreshTokenCookie } from "../../lib/auth-cookies";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middlewares/error";

const onboardingSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  regionCode: z.string().trim().min(1),
  avatarType: z.string().trim().min(1),
});

const loginSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
});

type UserLookupClient = Pick<PrismaClient, "user"> | Prisma.TransactionClient;

async function findUserByNicknameInsensitive(client: UserLookupClient, nickname: string) {
  return client.user.findFirst({
    where: {
      nickname: {
        equals: nickname.trim(),
        mode: "insensitive",
      },
    },
  });
}

export async function onboarding(req: Request, res: Response) {
  const parsed = onboardingSchema.parse(req.body);
  const duplicateUser = await findUserByNicknameInsensitive(prisma, parsed.nickname);
  if (duplicateUser) throw new HttpError(409, "nickname already exists");

  const payload = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        nickname: parsed.nickname,
        regionCode: parsed.regionCode,
        totalPoints: 1000,
      },
    });

    const avatar = await tx.avatar.create({
      data: { userId: created.id, avatarType: parsed.avatarType, level: 1, exp: 0 },
    });

    await tx.avatarPassiveEffect.create({
      data: { avatarId: avatar.id, effectType: "bet_cost_discount", effectValue: 0 },
    });

    await tx.pointTransaction.create({
      data: {
        userId: created.id,
        transactionType: "initial",
        amount: 1000,
        balanceAfter: 1000,
      },
    });

    return issueAuthTokensForUser(created, tx);
  });

  setRefreshTokenCookie(res, payload.auth.refreshToken, env.refreshTokenTtlDays);
  return res.status(201).json(payload);
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.parse(req.body);
  const user = await findUserByNicknameInsensitive(prisma, parsed.nickname);
  if (!user) throw new HttpError(404, "user not found");

  const payload = await issueAuthTokensForUser(user);
  setRefreshTokenCookie(res, payload.auth.refreshToken, env.refreshTokenTtlDays);
  return res.json(payload);
}

export async function listRegisteredUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { avatar: true },
  });

  return res.json(
    users.map((user) => ({
      ...serializeUser(user),
      createdAt: user.createdAt,
      avatarType: user.avatar?.avatarType ?? null,
    }))
  );
}

import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middlewares/error";

const onboardingSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  regionCode: z.string().trim().min(1),
  avatarType: z.string().trim().min(1),
});

export async function onboarding(req: Request, res: Response) {
  const parsed = onboardingSchema.parse(req.body);

  const existingUser = await prisma.user.findFirst({
    where: { nickname: { equals: parsed.nickname, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingUser) throw new HttpError(409, "nickname already exists");

  const user = await prisma.$transaction(async (tx) => {
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

    return created;
  });

  return res.status(201).json(user);
}

import { Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { resolveAvatarState } from "../../lib/avatar-level";
import { AuthedRequest } from "../../middlewares/auth";
import { HttpError } from "../../middlewares/error";

export async function getAvatar(req: AuthedRequest, res: Response) {
  const avatar = await prisma.avatar.findUniqueOrThrow({ where: { userId: req.userId }, include: { passiveEffects: true } });
  const items = await prisma.userItem.findMany({ where: { userId: req.userId }, include: { item: true } });
  return res.json({ avatar, items });
}

const levelUpSchema = z.object({ itemId: z.string(), quantity: z.number().int().positive() });

export async function levelUpAvatar(req: AuthedRequest, res: Response) {
  const parsed = levelUpSchema.parse(req.body);

  const userItem = await prisma.userItem.findUnique({
    where: { userId_itemId: { userId: req.userId, itemId: parsed.itemId } },
    include: { item: true },
  });
  if (!userItem || userItem.quantity < parsed.quantity) {
    throw new HttpError(400, "insufficient items");
  }

  const payload = await prisma.$transaction(async (tx) => {
    const expGain = userItem.item.expValue * parsed.quantity;
    const avatar = await tx.avatar.findUniqueOrThrow({ where: { userId: req.userId } });
    const nextExp = avatar.exp + expGain;
    const state = resolveAvatarState(nextExp);

    const updatedAvatar = await tx.avatar.update({ where: { id: avatar.id }, data: { exp: nextExp, level: state.level } });
    await tx.avatarPassiveEffect.upsert({
      where: { avatarId_effectType: { avatarId: avatar.id, effectType: "bet_cost_discount" } },
      update: { effectValue: state.discountPercent },
      create: { avatarId: avatar.id, effectType: "bet_cost_discount", effectValue: state.discountPercent },
    });
    await tx.userItem.update({ where: { id: userItem.id }, data: { quantity: { decrement: parsed.quantity } } });

    return updatedAvatar;
  });

  return res.json(payload);
}

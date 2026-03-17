import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middlewares/error";

const settleSchema = z.object({ eventId: z.string(), winningOptionId: z.string() });

export async function settleEvent(req: Request, res: Response) {
  const parsed = settleSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: parsed.eventId } });
    if (!event) throw new HttpError(404, "event not found");

    const existing = await tx.eventResult.findUnique({ where: { eventId: parsed.eventId } });
    if (existing) return { idempotent: true, eventResult: existing };

    const eventResult = await tx.eventResult.create({
      data: { eventId: parsed.eventId, winningOptionId: parsed.winningOptionId, settledAt: new Date() },
    });

    const votes = await tx.vote.findMany({ where: { eventId: parsed.eventId } });

    for (const vote of votes) {
      const won = vote.optionId === parsed.winningOptionId;
      const rewardPoints = won ? vote.inputBetPoints * 2 : 0;

      await tx.vote.update({ where: { id: vote.id }, data: { status: won ? "won" : "lost", rewardPoints } });

      if (won) {
        const updated = await tx.user.update({ where: { id: vote.userId }, data: { totalPoints: { increment: rewardPoints } } });
        await tx.pointTransaction.create({
          data: {
            userId: vote.userId,
            transactionType: "reward",
            amount: rewardPoints,
            balanceAfter: updated.totalPoints,
            relatedEventId: parsed.eventId,
            relatedVoteId: vote.id,
          },
        });

        if (event.rewardItemId && event.rewardItemQuantity > 0) {
          await tx.userItem.upsert({
            where: { userId_itemId: { userId: vote.userId, itemId: event.rewardItemId } },
            update: { quantity: { increment: event.rewardItemQuantity } },
            create: { userId: vote.userId, itemId: event.rewardItemId, quantity: event.rewardItemQuantity },
          });
        }
      }
    }

    await tx.event.update({ where: { id: parsed.eventId }, data: { status: "settled" } });
    return { idempotent: false, eventResult };
  });

  return res.json(result);
}

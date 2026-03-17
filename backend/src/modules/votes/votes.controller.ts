import { Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { HttpError } from "../../middlewares/error";

const voteSchema = z.object({
  eventId: z.string(),
  optionId: z.string(),
  betPoints: z.number().int().positive(),
});

export async function createVote(req: AuthedRequest, res: Response) {
  const parsed = voteSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const [user, avatar, event] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: req.userId } }),
      tx.avatar.findUnique({ where: { userId: req.userId }, include: { passiveEffects: true } }),
      tx.event.findUnique({ where: { id: parsed.eventId } }),
    ]);

    if (!event || event.status !== "open" || event.voteEndAt <= new Date()) throw new HttpError(403, "event closed");

    const exists = await tx.vote.findUnique({ where: { userId_eventId: { userId: req.userId, eventId: parsed.eventId } } });
    if (exists) throw new HttpError(409, "already voted");
    if (parsed.betPoints < event.minBetPoints) throw new HttpError(400, "invalid bet points");

    const discount = avatar?.passiveEffects.find((e) => e.effectType === "bet_cost_discount")?.effectValue ?? 0;
    const actualConsumedPoints = Math.max(1, Math.floor((parsed.betPoints * (100 - discount)) / 100));

    if (user.totalPoints < actualConsumedPoints) throw new HttpError(422, "insufficient points");

    const updatedUser = await tx.user.update({ where: { id: user.id }, data: { totalPoints: { decrement: actualConsumedPoints } } });
    const vote = await tx.vote.create({
      data: {
        userId: req.userId,
        eventId: parsed.eventId,
        optionId: parsed.optionId,
        inputBetPoints: parsed.betPoints,
        actualConsumedPoints,
      },
    });

    await tx.pointTransaction.create({
      data: {
        userId: req.userId,
        transactionType: "bet",
        amount: -actualConsumedPoints,
        balanceAfter: updatedUser.totalPoints,
        relatedEventId: parsed.eventId,
        relatedVoteId: vote.id,
      },
    });

    return vote;
  });

  return res.status(201).json(result);
}

export async function voteHistory(req: AuthedRequest, res: Response) {
  const history = await prisma.vote.findMany({ where: { userId: req.userId }, include: { event: true, option: true }, orderBy: { createdAt: "desc" } });
  return res.json(history);
}

import { Request, Response } from "express";
import { z } from "zod";
import { getMonitoringSnapshot } from "../../lib/monitoring";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middlewares/error";
import { syncEventLifecycleInTx } from "../events/event-lifecycle";

const settleSchema = z.object({ eventId: z.string(), winningOptionId: z.string() });

export async function settleEvent(req: Request, res: Response) {
  const parsed = settleSchema.parse(req.body);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let event = await syncEventLifecycleInTx(tx, parsed.eventId, now);
    if (!event) throw new HttpError(404, "event not found");

    const eventWithOptions = await tx.event.findUnique({
      where: { id: parsed.eventId },
      include: { options: true, result: true },
    });
    if (!eventWithOptions) throw new HttpError(404, "event not found");

    const matchedOption = eventWithOptions.options.find((option) => option.id === parsed.winningOptionId);
    if (!matchedOption) throw new HttpError(400, "winning option does not belong to event");

    if (eventWithOptions.status === "settled") {
      if (eventWithOptions.result?.winningOptionId !== parsed.winningOptionId) {
        throw new HttpError(409, "settled event result cannot be changed");
      }

      const votes = await tx.vote.findMany({ where: { eventId: parsed.eventId } });
      const winnerCount = votes.filter((vote) => vote.status === "won").length;
      const totalRewardPoints = votes.reduce((sum, vote) => sum + vote.rewardPoints, 0);

      return {
        idempotent: true,
        settlementTriggered: false,
        eventStatus: eventWithOptions.status,
        eventResult: eventWithOptions.result,
        processedVoteCount: votes.length,
        winnerCount,
        totalRewardPoints,
        rewardedItemUserCount: eventWithOptions.rewardItemId ? winnerCount : 0,
      };
    }

    const eventResult = eventWithOptions.result
      ? await tx.eventResult.update({
          where: { eventId: parsed.eventId },
          data: { winningOptionId: parsed.winningOptionId },
        })
      : await tx.eventResult.create({
          data: { eventId: parsed.eventId, winningOptionId: parsed.winningOptionId, settledAt: now },
        });

    event = await syncEventLifecycleInTx(tx, parsed.eventId, now);

    const latestEventResult = await tx.eventResult.findUniqueOrThrow({ where: { eventId: parsed.eventId } });
    const votes = await tx.vote.findMany({ where: { eventId: parsed.eventId } });
    const winnerCount = votes.filter((vote) => vote.status === "won").length;
    const totalRewardPoints = votes.reduce((sum, vote) => sum + vote.rewardPoints, 0);

    return {
      idempotent: Boolean(eventWithOptions.result && eventWithOptions.result.winningOptionId === parsed.winningOptionId),
      settlementTriggered: event?.status === "settled",
      eventStatus: event?.status ?? eventWithOptions.status,
      eventResult: latestEventResult,
      processedVoteCount: votes.length,
      winnerCount,
      totalRewardPoints,
      rewardedItemUserCount: eventWithOptions.rewardItemId ? winnerCount : 0,
    };
  });

  return res.json(result);
}

export function getAdminMetrics(_req: Request, res: Response) {
  return res.json(getMonitoringSnapshot());
}

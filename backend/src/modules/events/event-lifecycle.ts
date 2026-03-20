import { EventStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

type EventWithWinningResult = Prisma.EventGetPayload<{
  include: { result: { include: { winningOption: true } } };
}>;

async function finalizeReadyEvent(tx: Prisma.TransactionClient, eventId: string): Promise<EventWithWinningResult | null> {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    include: { result: { include: { winningOption: true } } },
  });

  if (!event || !event.result || event.status === "settled") {
    return event;
  }

  await tx.eventResult.update({
    where: { eventId },
    data: { settledAt: new Date() },
  });

  const pendingVotes = await tx.vote.findMany({ where: { eventId, status: "pending" } });

  for (const vote of pendingVotes) {
    const won = vote.optionId === event.result.winningOptionId;
    const rewardPoints = won ? vote.inputBetPoints * 2 : 0;

    await tx.vote.update({
      where: { id: vote.id },
      data: { status: won ? "won" : "lost", rewardPoints },
    });

    if (!won) continue;

    const updatedUser = await tx.user.update({
      where: { id: vote.userId },
      data: { totalPoints: { increment: rewardPoints } },
    });

    await tx.pointTransaction.create({
      data: {
        userId: vote.userId,
        transactionType: "reward",
        amount: rewardPoints,
        balanceAfter: updatedUser.totalPoints,
        relatedEventId: eventId,
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

  return tx.event.update({
    where: { id: eventId },
    data: { status: "settled" },
    include: { result: { include: { winningOption: true } } },
  });
}

export async function syncEventLifecycleInTx(tx: Prisma.TransactionClient, eventId: string, now = new Date()) {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    include: { result: { include: { winningOption: true } } },
  });

  if (!event) return null;

  let nextStatus = event.status;

  if (event.status === "scheduled" && event.startAt <= now && event.voteEndAt > now) {
    nextStatus = "open";
  }

  if (["scheduled", "open"].includes(event.status) && event.voteEndAt <= now) {
    nextStatus = "closed";
  }

  let syncedEvent = event;
  if (nextStatus !== event.status) {
    syncedEvent = await tx.event.update({
      where: { id: event.id },
      data: { status: nextStatus as EventStatus },
      include: { result: { include: { winningOption: true } } },
    });
  }

  if (syncedEvent.result && syncedEvent.resultAt <= now && syncedEvent.status !== "settled") {
    syncedEvent = await finalizeReadyEvent(tx, syncedEvent.id);
    return tx.event.findUnique({
      where: { id: syncedEvent.id },
      include: { result: { include: { winningOption: true } } },
    });
  }

  return syncedEvent;
}

export async function syncEventLifecycles(now = new Date()) {
  await prisma.$transaction(async (tx) => {
    await tx.event.updateMany({
      where: { status: "scheduled", startAt: { lte: now }, voteEndAt: { gt: now } },
      data: { status: "open" },
    });

    await tx.event.updateMany({
      where: { status: { in: ["scheduled", "open"] }, voteEndAt: { lte: now } },
      data: { status: "closed" },
    });

    const readyEvents = await tx.event.findMany({
      where: {
        status: { in: ["closed", "open", "scheduled"] },
        resultAt: { lte: now },
        result: { isNot: null },
      },
      select: { id: true },
    });

    for (const readyEvent of readyEvents) {
      await finalizeReadyEvent(tx, readyEvent.id);
    }
  });
}

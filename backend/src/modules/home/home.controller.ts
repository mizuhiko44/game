import { Response } from "express";
import { serializeUser } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { syncEventLifecycles } from "../events/event-lifecycle";

export async function getHome(req: AuthedRequest, res: Response) {
  await syncEventLifecycles();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, include: { avatar: true } });
  const now = new Date();
  const [recommendedEvents, endingSoonEvents, settledEvents, recentVoteResults] = await Promise.all([
    prisma.event.findMany({ where: { status: "open", voteEndAt: { gt: now }, OR: [{ eventType: "global" }, { eventType: "local", regionCode: user.regionCode }] }, take: 5, orderBy: { voteEndAt: "asc" } }),
    prisma.event.findMany({ where: { status: "open", voteEndAt: { gt: now } }, take: 5, orderBy: { voteEndAt: "asc" } }),
    prisma.event.findMany({ where: { status: "settled" }, take: 5, orderBy: { resultAt: "desc" } }),
    prisma.vote.findMany({
      where: { userId: req.userId, status: { not: "pending" } },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        event: { include: { result: { include: { winningOption: true } } } },
        option: true,
      },
    }),
  ]);

  const serializedUser = serializeUser(user);

  return res.json({
    userSummary: serializedUser,
    avatarSummary: user.avatar,
    recommendedEvents,
    endingSoonEvents,
    settledEvents,
    recentNotifications: recentVoteResults.map((vote) => ({
      id: vote.id,
      kind: vote.status === "won" ? "result_win" : "result_loss",
      eventId: vote.eventId,
      eventTitle: vote.event.title,
      settledAt: vote.event.result?.settledAt ?? vote.updatedAt,
      selectedOptionLabel: vote.option.label,
      winningOptionLabel: vote.event.result?.winningOption?.label ?? null,
      rewardPoints: vote.rewardPoints,
      message:
        vote.status === "won"
          ? `「${vote.event.title}」が的中しました。+${vote.rewardPoints}pt`
          : `「${vote.event.title}」の結果が確定しました。今回は不的中でした。`,
    })),
  });
}

import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { syncEventLifecycles } from "../events/event-lifecycle";

export async function getHome(req: AuthedRequest, res: Response) {
  await syncEventLifecycles();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, include: { avatar: true } });
  const now = new Date();
  const [recommendedEvents, endingSoonEvents, settledEvents] = await Promise.all([
    prisma.event.findMany({ where: { status: "open", voteEndAt: { gt: now }, OR: [{ eventType: "global" }, { eventType: "local", regionCode: user.regionCode }] }, take: 5, orderBy: { voteEndAt: "asc" } }),
    prisma.event.findMany({ where: { status: "open", voteEndAt: { gt: now } }, take: 5, orderBy: { voteEndAt: "asc" } }),
    prisma.event.findMany({ where: { status: "settled" }, take: 5, orderBy: { resultAt: "desc" } }),
  ]);

  return res.json({
    userSummary: { id: user.id, nickname: user.nickname, totalPoints: user.totalPoints, regionCode: user.regionCode, role: user.role },
    avatarSummary: user.avatar,
    recommendedEvents,
    endingSoonEvents,
    settledEvents,
  });
}

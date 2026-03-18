import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";

export async function getHome(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, include: { avatar: true } });
  const now = new Date();
  const [recommendedEvents, endingSoonEvents, settledEvents] = await Promise.all([
    prisma.event.findMany({ where: { status: "open", OR: [{ eventType: "global" }, { eventType: "local", regionCode: user.regionCode }] }, take: 5, orderBy: { voteEndAt: "asc" } }),
    prisma.event.findMany({ where: { status: "open", voteEndAt: { gt: now } }, take: 5, orderBy: { voteEndAt: "asc" } }),
    prisma.event.findMany({ where: { status: "closed" }, take: 5, orderBy: { resultAt: "desc" } }),
  ]);

  return res.json({
    userSummary: { id: user.id, nickname: user.nickname, totalPoints: user.totalPoints, regionCode: user.regionCode },
    avatarSummary: user.avatar,
    recommendedEvents,
    endingSoonEvents,
    settledEvents,
  });
}

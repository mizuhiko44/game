import { Response } from "express";
import { serializeUser } from "../../lib/auth";
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

  const serializedUser = serializeUser(user);

  return res.json({
    userSummary: serializedUser,
    avatarSummary: user.avatar,
    recommendedEvents,
    endingSoonEvents,
    settledEvents,
  });
}

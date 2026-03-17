import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";

export async function listEvents(req: Request, res: Response) {
  const { type, status, regionCode } = req.query;
  const events = await prisma.event.findMany({
    where: {
      eventType: type as any,
      status: status as any,
      regionCode: typeof regionCode === "string" ? regionCode : undefined,
    },
    include: { options: true },
    orderBy: { voteEndAt: "asc" },
  });
  return res.json(events);
}

export async function getEventDetail(req: AuthedRequest, res: Response) {
  const eventId = req.params.eventId;
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, include: { options: true, votes: true } });
  const voteCounts = await prisma.vote.groupBy({ by: ["optionId"], where: { eventId }, _count: true });
  const alreadyVoted = event.votes.some((v) => v.userId === req.userId);

  return res.json({
    ...event,
    popularity: voteCounts,
    alreadyVoted,
  });
}

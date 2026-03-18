import { EventCategory, EventType } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { HttpError } from "../../middlewares/error";

const createEventSchema = z
  .object({
    eventType: z.nativeEnum(EventType),
    regionCode: z.string().trim().optional(),
    category: z.nativeEnum(EventCategory),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
    startAt: z.string().datetime().optional(),
    voteEndAt: z.string().datetime(),
    resultAt: z.string().datetime(),
    minBetPoints: z.number().int().positive(),
    rewardItemId: z.string().trim().optional(),
    rewardItemQuantity: z.number().int().min(0).optional(),
    options: z.array(z.string().trim().min(1).max(80)).min(2).max(10),
  })
  .superRefine((value, ctx) => {
    if (value.eventType === EventType.local && !value.regionCode?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "regionCode is required for local events", path: ["regionCode"] });
    }
  });

export async function listEvents(req: Request, res: Response) {
  const { type, status, regionCode } = req.query;
  const events = await prisma.event.findMany({
    where: {
      eventType: type as EventType | undefined,
      status: status as any,
      regionCode: typeof regionCode === "string" ? regionCode : undefined,
    },
    include: { options: true, _count: { select: { votes: true } } },
    orderBy: { voteEndAt: "asc" },
  });

  return res.json(
    events.map(({ _count, ...event }) => ({
      ...event,
      participantCount: _count.votes,
    }))
  );
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
    participantCount: event.votes.length,
  });
}

export async function listEventParticipants(req: AuthedRequest, res: Response) {
  const eventId = req.params.eventId;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } });
  if (!event) throw new HttpError(404, "event not found");

  const participants = await prisma.vote.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, nickname: true, regionCode: true } },
      option: { select: { id: true, label: true } },
    },
  });

  return res.json({
    eventId: event.id,
    eventTitle: event.title,
    participantCount: participants.length,
    participants: participants.map((vote) => ({
      voteId: vote.id,
      joinedAt: vote.createdAt,
      user: vote.user,
      option: vote.option,
      status: vote.status,
    })),
  });
}

export async function createEvent(req: Request, res: Response) {
  const parsed = createEventSchema.parse(req.body);

  const uniqueOptions = parsed.options.filter((label, index, rows) => rows.findIndex((row) => row === label) === index);
  if (uniqueOptions.length !== parsed.options.length) {
    throw new HttpError(400, "options must be unique");
  }

  const startAt = parsed.startAt ? new Date(parsed.startAt) : new Date();
  const voteEndAt = new Date(parsed.voteEndAt);
  const resultAt = new Date(parsed.resultAt);
  if (voteEndAt <= startAt) throw new HttpError(400, "voteEndAt must be after startAt");
  if (resultAt <= voteEndAt) throw new HttpError(400, "resultAt must be after voteEndAt");

  const now = new Date();
  const status = startAt > now ? "scheduled" : "open";

  const event = await prisma.event.create({
    data: {
      eventType: parsed.eventType,
      regionCode: parsed.eventType === EventType.local ? parsed.regionCode?.trim() : null,
      category: parsed.category,
      title: parsed.title,
      description: parsed.description,
      status,
      startAt,
      voteEndAt,
      resultAt,
      minBetPoints: parsed.minBetPoints,
      rewardItemId: parsed.rewardItemId?.trim() || null,
      rewardItemQuantity: parsed.rewardItemQuantity ?? 0,
      options: {
        create: uniqueOptions.map((label, index) => ({
          label,
          sortOrder: index + 1,
        })),
      },
    },
    include: { options: true },
  });

  return res.status(201).json(event);
}

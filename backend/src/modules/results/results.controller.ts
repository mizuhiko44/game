import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { syncEventLifecycles } from "../events/event-lifecycle";

export async function listResults(req: AuthedRequest, res: Response) {
  await syncEventLifecycles();

  const votes = await prisma.vote.findMany({
    where: { userId: req.userId, status: { not: "pending" } },
    include: {
      event: { include: { result: { include: { winningOption: true } } } },
      option: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return res.json(votes);
}

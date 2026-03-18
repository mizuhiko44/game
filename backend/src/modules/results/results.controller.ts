import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";

export async function listResults(req: AuthedRequest, res: Response) {
  const votes = await prisma.vote.findMany({ where: { userId: req.userId }, include: { event: true, option: true }, orderBy: { updatedAt: "desc" } });
  return res.json(votes);
}

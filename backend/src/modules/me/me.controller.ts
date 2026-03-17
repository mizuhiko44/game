import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";

export async function getMe(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, include: { avatar: true } });
  const votes = await prisma.vote.findMany({ where: { userId: req.userId } });
  const wins = votes.filter((v) => v.status === "won").length;

  return res.json({
    nickname: user.nickname,
    regionCode: user.regionCode,
    totalPoints: user.totalPoints,
    totalVotes: votes.length,
    hitRate: votes.length ? wins / votes.length : 0,
    avatarLevel: user.avatar?.level ?? 1,
  });
}

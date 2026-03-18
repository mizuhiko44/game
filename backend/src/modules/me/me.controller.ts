import { Response } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";

export async function getMe(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, include: { avatar: true } });
  const [allVotes, settledVotes] = await Promise.all([
    prisma.vote.findMany({ where: { userId: req.userId } }),
    prisma.vote.findMany({
      where: { userId: req.userId, status: { not: "pending" } },
      include: { event: { include: { result: true } } },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const wins = settledVotes.filter((v) => v.status === "won").length;

  let currentWinningStreak = 0;
  let bestWinningStreak = 0;
  for (const vote of settledVotes) {
    if (vote.status === "won") {
      currentWinningStreak += 1;
      bestWinningStreak = Math.max(bestWinningStreak, currentWinningStreak);
    } else {
      currentWinningStreak = 0;
    }
  }

  return res.json({
    nickname: user.nickname,
    regionCode: user.regionCode,
    totalPoints: user.totalPoints,
    totalVotes: allVotes.length,
    hitRate: settledVotes.length ? wins / settledVotes.length : 0,
    avatarLevel: user.avatar?.level ?? 1,
    winningStreak: currentWinningStreak,
    bestWinningStreak,
  });
}

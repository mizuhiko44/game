import { Response } from "express";
import { serializeUser } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AuthedRequest } from "../../middlewares/auth";
import { syncEventLifecycles } from "../events/event-lifecycle";

export async function getMe(req: AuthedRequest, res: Response) {
  await syncEventLifecycles();

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

  const serializedUser = serializeUser(user);

  return res.json({
    id: serializedUser.id,
    nickname: serializedUser.nickname,
    regionCode: serializedUser.regionCode,
    totalPoints: serializedUser.totalPoints,
    role: serializedUser.role,
    totalVotes: allVotes.length,
    hitRate: settledVotes.length ? wins / settledVotes.length : 0,
    avatarLevel: user.avatar?.level ?? 1,
    winningStreak: currentWinningStreak,
    bestWinningStreak,
  });
}

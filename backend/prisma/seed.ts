import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const expItem = await prisma.itemMaster.upsert({
    where: { id: "itm_exp_small" },
    update: {},
    create: {
      id: "itm_exp_small",
      name: "Small EXP Material",
      itemType: "avatar_exp_material",
      expValue: 100,
    },
  });

  await prisma.event.deleteMany({ where: { id: "evt_local_1" } });

  const eventGlobal = await prisma.event.upsert({
    where: { id: "evt_global_1" },
    update: {
      status: "open",
      voteEndAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      resultAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
    },
    create: {
      id: "evt_global_1",
      eventType: "global",
      category: "sports",
      title: "日本代表戦の勝敗予想",
      description: "次の日本代表戦でどちらが勝つかを予想してください。",
      status: "open",
      startAt: new Date(),
      voteEndAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      resultAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      minBetPoints: 50,
      rewardItemId: expItem.id,
      rewardItemQuantity: 1,
    },
  });

  await prisma.eventOption.upsert({
    where: { id: "opt_global_1" },
    update: { label: "日本が勝つ", sortOrder: 1, eventId: eventGlobal.id },
    create: { id: "opt_global_1", eventId: eventGlobal.id, label: "日本が勝つ", sortOrder: 1 },
  });

  await prisma.eventOption.upsert({
    where: { id: "opt_global_2" },
    update: { label: "引き分け", sortOrder: 2, eventId: eventGlobal.id },
    create: { id: "opt_global_2", eventId: eventGlobal.id, label: "引き分け", sortOrder: 2 },
  });

  await prisma.eventOption.upsert({
    where: { id: "opt_global_3" },
    update: { label: "相手が勝つ", sortOrder: 3, eventId: eventGlobal.id },
    create: { id: "opt_global_3", eventId: eventGlobal.id, label: "相手が勝つ", sortOrder: 3 },
  });

  const user = await prisma.user.upsert({
    where: { id: "usr_demo_1" },
    update: { nickname: "DemoUser", regionCode: "kanagawa", role: "admin", totalPoints: 1000 },
    create: {
      id: "usr_demo_1",
      nickname: "DemoUser",
      regionCode: "kanagawa",
      role: "admin",
      totalPoints: 1000,
    },
  });

  const avatar = await prisma.avatar.upsert({
    where: { userId: user.id },
    update: { avatarType: "cat", level: 1, exp: 0 },
    create: { userId: user.id, avatarType: "cat", level: 1, exp: 0 },
  });

  await prisma.avatarPassiveEffect.upsert({
    where: { avatarId_effectType: { avatarId: avatar.id, effectType: "bet_cost_discount" } },
    update: { effectValue: 0 },
    create: { avatarId: avatar.id, effectType: "bet_cost_discount", effectValue: 0 },
  });

  await prisma.pointTransaction.upsert({
    where: { id: "pt_init_demo_user" },
    update: { balanceAfter: user.totalPoints },
    create: {
      id: "pt_init_demo_user",
      userId: user.id,
      transactionType: "initial",
      amount: 1000,
      balanceAfter: user.totalPoints,
    },
  });

  console.log("Seed completed.");
  console.log("Demo user id (x-user-id): usr_demo_1");
  console.log("Demo user role: admin");
  console.log("Sample global event id:", eventGlobal.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

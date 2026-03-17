export const avatarLevelTable = [
  { level: 1, requiredExp: 0, discountPercent: 0 },
  { level: 2, requiredExp: 100, discountPercent: 1 },
  { level: 3, requiredExp: 250, discountPercent: 2 },
  { level: 4, requiredExp: 450, discountPercent: 3 },
  { level: 5, requiredExp: 700, discountPercent: 5 },
];

export function resolveAvatarState(exp: number) {
  const current = [...avatarLevelTable].reverse().find((row) => exp >= row.requiredExp) ?? avatarLevelTable[0];
  return { level: current.level, discountPercent: current.discountPercent };
}

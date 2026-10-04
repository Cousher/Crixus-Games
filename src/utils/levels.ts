// Mirrors backend/utils/economy.js so the client can show level progress.
const BASE_XP = 1000;
const GROWTH_RATE = 1.25;

export const xpForLevel = (level: number) =>
  level <= 0 ? 0 : Math.floor(BASE_XP * Math.pow(GROWTH_RATE, level - 1));

/** Progress (0..1) from the current level threshold to the next one. */
export const levelProgress = (xp: number, level: number) => {
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  if (next <= current) return 0;
  return Math.min(1, Math.max(0, (xp - current) / (next - current)));
};

export const xpToNext = (xp: number, level: number) => Math.max(0, xpForLevel(level + 1) - xp);

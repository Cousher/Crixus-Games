// Mirrors backend/utils/economy.js and backend/utils/missions.js so the client
// displays the exact same cumulative XP thresholds and level rewards.
const BASE_XP = 1000;
const GROWTH_RATE = 1.25;
const MAX_LEVEL_REWARD = 10000;

export const xpDeltaForLevel = (level: number) =>
  level <= 0 ? 0 : Math.floor(BASE_XP * Math.pow(GROWTH_RATE, level - 1));

export const xpForLevel = (level: number) => {
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += xpDeltaForLevel(l);
  }
  return total;
};

export const levelRewardFor = (level: number) => {
  if (level <= 0) return 0;
  const deltaXp = xpDeltaForLevel(level);
  const raw = Math.floor((deltaXp * 0.004) / 5) * 5;
  return Math.min(MAX_LEVEL_REWARD, Math.max(5, raw));
};

/** Progress (0..1) from the current level threshold to the next one. */
export const levelProgress = (xp: number, level: number) => {
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  if (next <= current) return 0;
  return Math.min(1, Math.max(0, (xp - current) / (next - current)));
};

export const xpToNext = (xp: number, level: number) => Math.max(0, xpForLevel(level + 1) - xp);

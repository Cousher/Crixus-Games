const crypto = require("crypto");
const User = require("../models/User");
const { xpDeltaForLevel } = require("./economy");

// ---------------------------------------------------------------------------
// Daily missions + login streak + level rewards
// ---------------------------------------------------------------------------

// Minimum bet required for count-based daily missions so $1 bets cannot cheese rewards.
const MIN_MISSION_BET = 50;

// Day boundary uses a fixed UTC-3 offset (Argentina) so "today" matches the
// players' actual day instead of UTC.
const DAY_OFFSET_MS = 3 * 60 * 60 * 1000;
const dayString = (date = new Date()) =>
  new Date(date.getTime() - DAY_OFFSET_MS).toISOString().slice(0, 10);

const isYesterday = (date) => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return dayString(date) === dayString(yesterday);
};

// Streak rewards for days 1..7 (day 7+ keeps paying the max).
// Rebalanced to stay motivating (10x Day 1 -> Day 7) without driving hyperinflation.
const STREAK_REWARDS = [250, 400, 600, 900, 1250, 1750, 2500];
const streakReward = (day) => STREAK_REWARDS[Math.min(day, 7) - 1];

// Level-up reward: ~40% rakeback of the expected house edge required to advance
// to `level` (100 XP = $1 expected house edge), capped at $10,000 per level.
// Strictly negative-EV for grinding/alt farming across every level 1..infinity.
const MAX_LEVEL_REWARD = 10000;
const levelReward = (level) => {
  if (level <= 0) return 0;
  const deltaXp = xpDeltaForLevel(level);
  const raw = Math.floor((deltaXp * 0.004) / 5) * 5;
  return Math.min(MAX_LEVEL_REWARD, Math.max(5, raw));
};
const pendingLevelReward = (claimedUpTo, currentLevel) => {
  let total = 0;
  for (let l = claimedUpTo + 1; l <= currentLevel; l++) total += levelReward(l);
  return total;
};

// Pool of possible daily missions. Each day, 3 are drawn at random.
// `key` is what games report via trackMission; the frontend translates it.
const MISSION_POOL = [
  { key: "bet_total", target: 2500, reward: 400 },
  { key: "case_open", target: 5, reward: 400 },
  { key: "crash_2x", target: 3, reward: 500 },
  { key: "coinflip_win", target: 4, reward: 450 },
  { key: "slot_win", target: 5, reward: 400 },
  { key: "mines_cashout", target: 3, reward: 500 },
  { key: "road_cashout", target: 3, reward: 500 },
  { key: "upgrade_try", target: 2, reward: 300 },
];

const MISSIONS_PER_DAY = 3;

const drawDailyMissions = () => {
  const pool = [...MISSION_POOL];
  const drawn = [];
  for (let i = 0; i < MISSIONS_PER_DAY && pool.length > 0; i++) {
    const idx = crypto.randomInt(0, pool.length);
    const [m] = pool.splice(idx, 1);
    drawn.push({ ...m, progress: 0, claimed: false });
  }
  return drawn;
};

// Makes sure the user has today's missions assigned. Returns the fresh user.
// The missionsDate guard in the query makes concurrent calls safe: only one
// request rolls the new missions, the rest see the already-updated doc.
const ensureDailyMissions = async (userId) => {
  const today = dayString();
  const updated = await User.findOneAndUpdate(
    { _id: userId, missionsDate: { $ne: today } },
    { $set: { missionsDate: today, dailyMissions: drawDailyMissions() } },
    { new: true }
  );
  if (updated) return updated;
  return User.findById(userId);
};

// Reports progress on a mission. Automatically initializes today's missions if
// the user started playing before visiting /rewards. Emits "missionComplete"
// the moment a mission crosses its target.
const trackMission = async (io, userId, key, amount = 1) => {
  try {
    if (!userId) return;
    const today = dayString();

    // Ensure today's missions exist before incrementing progress so players
    // never lose progress when jumping straight into a game.
    await ensureDailyMissions(userId);

    const updated = await User.findOneAndUpdate(
      {
        _id: userId,
        missionsDate: today,
        dailyMissions: { $elemMatch: { key, claimed: false } },
      },
      { $inc: { "dailyMissions.$[m].progress": amount } },
      { arrayFilters: [{ "m.key": key, "m.claimed": false }], new: true }
    );

    if (!updated || !io) return;

    const mission = updated.dailyMissions.find((m) => m.key === key && !m.claimed);
    if (
      mission &&
      mission.progress >= mission.target &&
      mission.progress - amount < mission.target
    ) {
      io.to(userId.toString()).emit("missionComplete", {
        key: mission.key,
        reward: mission.reward,
      });
    }
  } catch (err) {
    // mission tracking must never break a game round
    console.error("trackMission error:", err.message);
  }
};

module.exports = {
  MIN_MISSION_BET,
  dayString,
  isYesterday,
  streakReward,
  levelReward,
  pendingLevelReward,
  drawDailyMissions,
  ensureDailyMissions,
  trackMission,
  MISSION_POOL,
  MISSIONS_PER_DAY,
  STREAK_REWARDS,
};

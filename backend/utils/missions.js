const crypto = require("crypto");
const User = require("../models/User");

// ---------------------------------------------------------------------------
// Daily missions + login streak + level rewards
// ---------------------------------------------------------------------------

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
const STREAK_REWARDS = [500, 750, 1000, 1500, 2000, 3000, 5000];
const streakReward = (day) => STREAK_REWARDS[Math.min(day, 7) - 1];

// Level-up reward: claiming level L grants 500 + 250 * L.
const levelReward = (level) => 500 + 250 * level;
const pendingLevelReward = (claimedUpTo, currentLevel) => {
  let total = 0;
  for (let l = claimedUpTo + 1; l <= currentLevel; l++) total += levelReward(l);
  return total;
};

// Pool of possible daily missions. Each day, 3 are drawn at random.
// `key` is what games report via trackMission; the frontend translates it.
const MISSION_POOL = [
  { key: "bet_total", target: 2000, reward: 600 },
  { key: "case_open", target: 5, reward: 500 },
  { key: "crash_2x", target: 3, reward: 700 },
  { key: "coinflip_win", target: 4, reward: 600 },
  { key: "slot_win", target: 5, reward: 500 },
  { key: "mines_cashout", target: 3, reward: 700 },
  { key: "upgrade_try", target: 2, reward: 400 },
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

// Reports progress on a mission. Fire-and-forget from the games: it only
// touches users that have today's missions assigned and the matching key
// unclaimed. Emits "missionComplete" the moment a mission crosses its target.
const trackMission = async (io, userId, key, amount = 1) => {
  try {
    if (!userId) return;
    const today = dayString();

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

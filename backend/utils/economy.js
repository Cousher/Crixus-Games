const User = require("../models/User");
const { processReferralLevelProgress } = require("./referrals");

let sharedIo = null;
function setEconomyIo(io) {
  sharedIo = io;
}

const BASE_XP = 1000; // incremental xp required for level 1
const GROWTH_RATE = 1.25; // exponential growth per level

// Incremental XP required to advance from (level - 1) to `level`.
function xpDeltaForLevel(level) {
  if (level <= 0) return 0;
  return Math.floor(BASE_XP * Math.pow(GROWTH_RATE, level - 1));
}

// Cumulative total XP required to reach `level`.
function calculateXPForLevel(level) {
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += xpDeltaForLevel(l);
  }
  return total;
}

// level is derived from cumulative xp, safe and monotonic.
function calculateLevelFromXp(xp) {
  let level = 0;
  let cumulative = 0;
  while (true) {
    const nextDelta = xpDeltaForLevel(level + 1);
    if (xp < cumulative + nextDelta) break;
    cumulative += nextDelta;
    level += 1;
  }
  return level;
}

// Atomically debit `cost` only if the balance covers it, optionally granting XP.
// `xpMultiplier` weights XP by game house edge (~100 XP per $1 expected edge)
// so no low-edge game can farm positive-EV level rewards.
async function chargeUser(userId, cost, { awardXp = true, xpMultiplier = 2 } = {}) {
  const xpGain = awardXp ? Math.floor(cost * xpMultiplier) : 0;
  const inc = xpGain > 0
    ? { walletBalance: -cost, xp: xpGain }
    : { walletBalance: -cost };

  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: cost } },
    { $inc: inc },
    { new: true }
  );

  if (!user) {
    return null;
  }

  if (xpGain > 0) {
    const newLevel = calculateLevelFromXp(user.xp);
    // Never demote legacy accounts whose stored level is already higher
    if (newLevel > user.level) {
      user.level = newLevel;
      await User.updateOne({ _id: userId, level: { $lt: newLevel } }, { $set: { level: newLevel } });
      processReferralLevelProgress(userId, newLevel, sharedIo).catch(() => {});
    }
  }

  return user;
}

// Grant XP independently (used by risk-gated games like Mines & Gladiator Road
// on round completion so 1.03x zero-risk cashouts cannot farm XP).
async function awardUserXp(userId, xpAmount) {
  const gain = Math.floor(xpAmount);
  if (!Number.isFinite(gain) || gain <= 0) return null;

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { xp: gain } },
    { new: true }
  );
  if (!user) return null;

  const newLevel = calculateLevelFromXp(user.xp);
  if (newLevel > user.level) {
    user.level = newLevel;
    await User.updateOne({ _id: userId, level: { $lt: newLevel } }, { $set: { level: newLevel } });
    processReferralLevelProgress(userId, newLevel, sharedIo).catch(() => {});
  }
  return user;
}

// atomically credit winnings to the wallet (and weekly winnings).
async function creditUser(userId, amount, winnings = 0) {
  return User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount, weeklyWinnings: winnings } },
    { new: true }
  );
}

module.exports = {
  BASE_XP,
  GROWTH_RATE,
  setEconomyIo,
  xpDeltaForLevel,
  calculateXPForLevel,
  calculateLevelFromXp,
  chargeUser,
  awardUserXp,
  creditUser,
};

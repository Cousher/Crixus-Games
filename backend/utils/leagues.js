const User = require("../models/User");
const Notification = require("../models/Notification");

// ---------------------------------------------------------------------------
// Weekly Colosseum Leagues (Bronze -> Silver -> Gold -> Legion -> Emperor)
// Every Wednesday at 20:00 ARG (UTC-3), each league rewards its Top 3 active
// winners and promotes top performers (and demotes inactive players in higher
// tiers), giving every new player an achievable weekly goal.
// ---------------------------------------------------------------------------

const LEAGUES = [
  { id: "bronze", order: 0, prizes: [1000, 600, 300], promoSlots: 5 },
  { id: "silver", order: 1, prizes: [2000, 1200, 600], promoSlots: 5 },
  { id: "gold", order: 2, prizes: [3500, 2000, 1000], promoSlots: 4 },
  { id: "legion", order: 3, prizes: [6000, 3500, 1800], promoSlots: 3 },
  { id: "emperor", order: 4, prizes: [10000, 5000, 2500], promoSlots: 0 },
];

const LEAGUE_MAP = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));

const getLeagueInfo = (leagueId) => LEAGUE_MAP[leagueId] || LEAGUE_MAP.bronze;

const nextLeagueId = (leagueId) => {
  const cur = getLeagueInfo(leagueId);
  return LEAGUES[cur.order + 1]?.id || cur.id;
};

const prevLeagueId = (leagueId) => {
  const cur = getLeagueInfo(leagueId);
  return LEAGUES[cur.order - 1]?.id || cur.id;
};

/**
 * Computes the next Wednesday 20:00 Argentina time (UTC-3 = 23:00 UTC).
 */
function getNextWednesdayReset(now = new Date()) {
  const utc = new Date(now.getTime());
  const target = new Date(Date.UTC(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    23, 0, 0, 0
  ));
  // 3 = Wednesday in UTC day-of-week
  let diffDays = (3 - target.getUTCDay() + 7) % 7;
  if (diffDays === 0 && target.getTime() <= utc.getTime()) {
    diffDays = 7;
  }
  target.setUTCDate(target.getUTCDate() + diffDays);
  return target;
}

/**
 * Settles all 5 leagues at weekly reset: pays top 3 active players per league,
 * promotes top active players up 1 league, and demotes 0-winnings players in
 * upper leagues down 1 tier.
 */
async function settleWeeklyLeagues(io = null) {
  for (const league of LEAGUES) {
    const leagueFilter =
      league.id === "bronze"
        ? { $or: [{ league: "bronze" }, { league: { $exists: false } }, { league: null }] }
        : { league: league.id };

    const activePlayers = await User.find({
      ...leagueFilter,
      weeklyWinnings: { $gt: 0 },
    })
      .sort({ weeklyWinnings: -1, _id: 1 })
      .select("_id username weeklyWinnings league");

    // 1. Pay Top 3 prizes in this league
    const topWinners = activePlayers.slice(0, league.prizes.length);
    for (let i = 0; i < topWinners.length; i++) {
      const winner = topWinners[i];
      const prize = league.prizes[i];
      const updated = await User.findByIdAndUpdate(
        winner._id,
        { $inc: { walletBalance: prize } },
        { new: true }
      );

      const content = `League ${league.id.toUpperCase()} — #${i + 1} place! You won $${prize}.`;
      await Notification.create({
        senderId: winner._id,
        receiverId: winner._id,
        type: "message",
        title: `Award - ${i + 1} place`,
        content,
      });

      if (io) {
        io.to(winner._id.toString()).emit("newNotification", { message: content });
        if (updated) {
          io.to(winner._id.toString()).emit("userDataUpdated", {
            walletBalance: updated.walletBalance,
            xp: updated.xp,
            level: updated.level,
          });
        }
      }
    }

    // 2. Promote top active players to next league (except Emperor)
    const promotedIds = [];
    if (league.promoSlots > 0 && activePlayers.length > 0) {
      const promoteCount = Math.min(league.promoSlots, activePlayers.length);
      const nextTier = nextLeagueId(league.id);
      for (let i = 0; i < promoteCount; i++) {
        promotedIds.push(activePlayers[i]._id);
      }
      if (promotedIds.length > 0) {
        await User.updateMany(
          { _id: { $in: promotedIds } },
          { $set: { league: nextTier } }
        );
      }
    }

    // 3. Demote completely inactive players (weeklyWinnings === 0) in tiers above Bronze
    if (league.order > 0) {
      const lowerTier = prevLeagueId(league.id);
      await User.updateMany(
        { league: league.id, weeklyWinnings: { $lte: 0 } },
        { $set: { league: lowerTier } }
      );
    }
  }
}

module.exports = {
  LEAGUES,
  getLeagueInfo,
  nextLeagueId,
  prevLeagueId,
  getNextWednesdayReset,
  settleWeeklyLeagues,
};

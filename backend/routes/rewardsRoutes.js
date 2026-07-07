const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");
const User = require("../models/User");
const {
  dayString,
  isYesterday,
  streakReward,
  pendingLevelReward,
  ensureDailyMissions,
} = require("../utils/missions");

module.exports = (io) => {
  // -------------------------------------------------------------------------
  // GET /rewards/status
  // Everything the rewards page needs in one call. Also (re)assigns today's
  // missions if they haven't been rolled yet.
  // -------------------------------------------------------------------------
  router.get("/status", isAuthenticated, async (req, res) => {
    try {
      const user = await ensureDailyMissions(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const today = dayString();
      const lastClaimDay = user.lastStreakClaim ? dayString(user.lastStreakClaim) : null;
      const claimedToday = lastClaimDay === today;
      const continuesStreak = user.lastStreakClaim && isYesterday(user.lastStreakClaim);
      const nextStreakDay = claimedToday
        ? user.loginStreak
        : continuesStreak
          ? user.loginStreak + 1
          : 1;

      res.json({
        streak: {
          count: user.loginStreak,
          claimedToday,
          nextDay: nextStreakDay,
          nextReward: streakReward(nextStreakDay),
        },
        missions: user.dailyMissions,
        levelRewards: {
          currentLevel: user.level,
          claimedUpTo: user.claimedLevelRewards,
          pendingAmount: pendingLevelReward(user.claimedLevelRewards, user.level),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /rewards/streak/claim
  // One claim per day. Claiming on consecutive days grows the streak (bigger
  // rewards up to day 7); skipping a day resets it to day 1.
  // -------------------------------------------------------------------------
  router.post("/streak/claim", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const today = dayString();
      const lastClaimDay = user.lastStreakClaim ? dayString(user.lastStreakClaim) : null;

      if (lastClaimDay === today) {
        return res.status(400).json({ message: "Daily reward already claimed" });
      }

      const newStreak =
        user.lastStreakClaim && isYesterday(user.lastStreakClaim)
          ? user.loginStreak + 1
          : 1;
      const reward = streakReward(newStreak);

      // matching on the previous lastStreakClaim lets only one concurrent
      // request through, so the reward can't be claimed twice
      const updated = await User.findOneAndUpdate(
        { _id: user._id, lastStreakClaim: user.lastStreakClaim },
        {
          $set: { loginStreak: newStreak, lastStreakClaim: new Date() },
          $inc: { walletBalance: reward },
        },
        { new: true }
      );

      if (!updated) {
        return res.status(400).json({ message: "Daily reward already claimed" });
      }

      io.to(user._id.toString()).emit("userDataUpdated", {
        walletBalance: updated.walletBalance,
        xp: updated.xp,
        level: updated.level,
      });

      res.json({ streak: newStreak, reward, walletBalance: updated.walletBalance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /rewards/missions/claim  { key }
  // Claims a completed daily mission.
  // -------------------------------------------------------------------------
  router.post("/missions/claim", isAuthenticated, async (req, res) => {
    try {
      const { key } = req.body;
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.missionsDate !== dayString()) {
        return res.status(400).json({ message: "Missions expired, refresh the page" });
      }

      const mission = user.dailyMissions.find((m) => m.key === key);
      if (!mission) return res.status(404).json({ message: "Mission not found" });
      if (mission.claimed) return res.status(400).json({ message: "Already claimed" });
      if (mission.progress < mission.target) {
        return res.status(400).json({ message: "Mission not completed yet" });
      }

      // atomic: the arrayFilters condition (claimed=false, progress>=target)
      // ensures a concurrent duplicate request can't pay twice
      const updated = await User.findOneAndUpdate(
        {
          _id: user._id,
          missionsDate: dayString(),
          dailyMissions: { $elemMatch: { key, claimed: false } },
        },
        {
          $set: { "dailyMissions.$[m].claimed": true },
          $inc: { walletBalance: mission.reward },
        },
        {
          arrayFilters: [
            { "m.key": key, "m.claimed": false, "m.progress": { $gte: mission.target } },
          ],
          new: true,
        }
      );

      if (!updated) return res.status(400).json({ message: "Already claimed" });

      io.to(user._id.toString()).emit("userDataUpdated", {
        walletBalance: updated.walletBalance,
        xp: updated.xp,
        level: updated.level,
      });

      res.json({ key, reward: mission.reward, walletBalance: updated.walletBalance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /rewards/level/claim
  // Claims all pending level-up rewards at once.
  // -------------------------------------------------------------------------
  router.post("/level/claim", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const amount = pendingLevelReward(user.claimedLevelRewards, user.level);

      if (amount <= 0) {
        return res.status(400).json({ message: "No level rewards to claim" });
      }

      // matching claimedLevelRewards makes the claim race-safe
      const updated = await User.findOneAndUpdate(
        { _id: user._id, claimedLevelRewards: user.claimedLevelRewards },
        {
          $set: { claimedLevelRewards: user.level },
          $inc: { walletBalance: amount },
        },
        { new: true }
      );

      if (!updated) {
        return res.status(400).json({ message: "No level rewards to claim" });
      }

      io.to(user._id.toString()).emit("userDataUpdated", {
        walletBalance: updated.walletBalance,
        xp: updated.xp,
        level: updated.level,
      });

      res.json({ reward: amount, claimedUpTo: user.level, walletBalance: updated.walletBalance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
};

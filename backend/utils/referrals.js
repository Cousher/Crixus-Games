const crypto = require("crypto");
const User = require("../models/User");
const Notification = require("../models/Notification");

// ---------------------------------------------------------------------------
// Referral System — "Legión de Gladiadores"
// Rewards are tied strictly to real gameplay levels (Level 3 for invitee,
// Level 5 for referrer) with IP-hash anti-smurf protection so alt-account
// farming is blocked while genuine word-of-mouth stays rewarding.
// ---------------------------------------------------------------------------

const INVITEE_UNLOCK_LEVEL = 3;
const INVITEE_BONUS = 500;
const REFERRER_UNLOCK_LEVEL = 5;
const REFERRER_BONUS = 1500;
const MAX_REFERRALS_PER_IP_24H = 2;

const REFERRAL_MILESTONES = [
  { count: 1, reward: 1000, titleKey: "centurion" },
  { count: 3, reward: 3500, titleKey: "tribune" },
  { count: 5, reward: 7500, titleKey: "general" },
  { count: 10, reward: 18000, titleKey: "emperor" },
];

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeReferralCode = (raw) => {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, 40);
};

const hashIp = (ip) => {
  if (!ip || typeof ip !== "string") return "";
  const salt = process.env.JWT_SECRET || "crixus-ref-salt";
  return crypto
    .createHash("sha256")
    .update(`${salt}:${ip.trim()}`)
    .digest("hex")
    .slice(0, 32);
};

/**
 * Links a newly created user to their referrer if valid and passes anti-smurf
 * checks. Never throws or blocks registration.
 */
async function applyReferralOnSignup(newUser, rawCode, clientIp, io = null) {
  try {
    const ipHash = hashIp(clientIp);
    if (ipHash) {
      await User.updateOne({ _id: newUser._id }, { $set: { referralIpHash: ipHash } });
    }

    const code = normalizeReferralCode(rawCode);
    if (!code) return { linked: false, reason: "empty" };

    // Match referrer by exact username (case-insensitive)
    const referrer = await User.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(code)}$`, "i") },
    }).select("_id username referralIpHash");

    if (!referrer) return { linked: false, reason: "not_found" };
    if (referrer._id.toString() === newUser._id.toString()) {
      return { linked: false, reason: "self" };
    }

    // Anti-smurf shield: reject self-referrals from the same IP hash or
    // bursts of >2 referred accounts from the same IP within 24 hours.
    if (ipHash) {
      if (referrer.referralIpHash && referrer.referralIpHash === ipHash) {
        return { linked: false, reason: "same_ip" };
      }
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentFromIp = await User.countDocuments({
        referralIpHash: ipHash,
        referredBy: { $ne: null },
        referralJoinedAt: { $gte: since24h },
      });
      if (recentFromIp >= MAX_REFERRALS_PER_IP_24H) {
        return { linked: false, reason: "ip_rate_limit" };
      }
    }

    // Link atomically (only if not already linked) and connect them as friends
    const linked = await User.findOneAndUpdate(
      { _id: newUser._id, referredBy: null },
      {
        $set: {
          referredBy: referrer._id,
          referralJoinedAt: new Date(),
        },
        $addToSet: { friends: referrer._id },
      },
      { new: true }
    );

    if (!linked) return { linked: false, reason: "already_linked" };

    await User.updateOne(
      { _id: referrer._id },
      { $addToSet: { friends: newUser._id } }
    );

    const notice = `${newUser.username} joined your Legion! You'll earn $${REFERRER_BONUS} when they reach Level ${REFERRER_UNLOCK_LEVEL}.`;
    await Notification.create({
      senderId: newUser._id,
      receiverId: referrer._id,
      type: "message",
      title: "New Legion Recruit",
      content: notice,
    });

    if (io) {
      io.to(referrer._id.toString()).emit("newNotification", { message: notice });
    }

    return { linked: true, referrerId: referrer._id };
  } catch (err) {
    console.error("applyReferralOnSignup error:", err.message);
    return { linked: false, reason: "error" };
  }
}

/**
 * Checks whether a user crossing `newLevel` unlocks their invitee Level 3 bonus
 * and/or activates their referrer's Level 5 bonus. Fully idempotent via atomic
 * boolean guards.
 */
async function processReferralLevelProgress(userId, newLevel, io = null) {
  try {
    if (!userId || !Number.isFinite(newLevel) || newLevel < INVITEE_UNLOCK_LEVEL) {
      return;
    }

    // 1. Invitee Level 3 unlock (+$500 to invitee)
    const inviteeUnlocked = await User.findOneAndUpdate(
      {
        _id: userId,
        referredBy: { $ne: null },
        referralRewardClaimed: { $ne: true },
        level: { $gte: INVITEE_UNLOCK_LEVEL },
      },
      {
        $set: { referralRewardClaimed: true },
        $inc: { walletBalance: INVITEE_BONUS },
      },
      { new: true }
    );

    if (inviteeUnlocked) {
      const msg = `Legion welcome bonus unlocked! You received $${INVITEE_BONUS} for reaching Level ${INVITEE_UNLOCK_LEVEL}.`;
      await Notification.create({
        senderId: inviteeUnlocked.referredBy,
        receiverId: inviteeUnlocked._id,
        type: "message",
        title: "Legion Welcome Bonus",
        content: msg,
      });

      if (io) {
        io.to(inviteeUnlocked._id.toString()).emit("newNotification", { message: msg });
        io.to(inviteeUnlocked._id.toString()).emit("userDataUpdated", {
          walletBalance: inviteeUnlocked.walletBalance,
          xp: inviteeUnlocked.xp,
          level: inviteeUnlocked.level,
        });
      }
    }

    // 2. Referrer Level 5 activation (+$1,500 + active recruit count to referrer)
    if (newLevel >= REFERRER_UNLOCK_LEVEL) {
      const activated = await User.findOneAndUpdate(
        {
          _id: userId,
          referredBy: { $ne: null },
          referralMilestoneAwardedToReferrer: { $ne: true },
          level: { $gte: REFERRER_UNLOCK_LEVEL },
        },
        {
          $set: { referralMilestoneAwardedToReferrer: true },
        },
        { new: true }
      );

      if (activated && activated.referredBy) {
        const updatedReferrer = await User.findByIdAndUpdate(
          activated.referredBy,
          {
            $inc: {
              walletBalance: REFERRER_BONUS,
              activeReferralsCount: 1,
              referralEarningsTotal: REFERRER_BONUS,
            },
          },
          { new: true }
        );

        if (updatedReferrer) {
          const msg = `Your recruit ${activated.username} reached Level ${REFERRER_UNLOCK_LEVEL}! You earned $${REFERRER_BONUS}.`;
          await Notification.create({
            senderId: activated._id,
            receiverId: updatedReferrer._id,
            type: "message",
            title: "Legion Recruit Activated",
            content: msg,
          });

          if (io) {
            io.to(updatedReferrer._id.toString()).emit("newNotification", { message: msg });
            io.to(updatedReferrer._id.toString()).emit("userDataUpdated", {
              walletBalance: updatedReferrer.walletBalance,
              xp: updatedReferrer.xp,
              level: updatedReferrer.level,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("processReferralLevelProgress error:", err.message);
  }
}

/**
 * Returns full Legion dashboard state for the logged-in user.
 */
async function getReferralSummary(userId, io = null) {
  const user = await User.findById(userId)
    .populate("referredBy", "username")
    .select(
      "username level referredBy referralRewardClaimed activeReferralsCount referralEarningsTotal referralMilestonesClaimed"
    );

  if (!user) return null;

  // Safety net: ensure any pending level 3/5 unlock is settled
  if (user.referredBy && user.level >= INVITEE_UNLOCK_LEVEL) {
    await processReferralLevelProgress(user._id, user.level, io);
  }

  const inviteesRaw = await User.find({ referredBy: user._id })
    .sort({ referralJoinedAt: -1, _id: -1 })
    .limit(15)
    .select("username profilePicture level referralMilestoneAwardedToReferrer referralJoinedAt");

  const totalReferred = await User.countDocuments({ referredBy: user._id });
  const activeCount = user.activeReferralsCount || 0;
  const claimedSet = new Set(user.referralMilestonesClaimed || []);

  const milestones = REFERRAL_MILESTONES.map((m) => ({
    ...m,
    claimed: claimedSet.has(m.count),
    unlocked: activeCount >= m.count,
  }));

  return {
    referralCode: user.username,
    activeReferralsCount: activeCount,
    totalReferralsCount: totalReferred,
    referralEarningsTotal: user.referralEarningsTotal || 0,
    inviteeBonus: INVITEE_BONUS,
    referrerBonus: REFERRER_BONUS,
    inviteeUnlockLevel: INVITEE_UNLOCK_LEVEL,
    referrerUnlockLevel: REFERRER_UNLOCK_LEVEL,
    referredByUsername: user.referredBy ? user.referredBy.username : null,
    inviteeBonusClaimed: Boolean(user.referralRewardClaimed),
    milestones,
    invitees: inviteesRaw.map((inv) => ({
      id: inv._id,
      username: inv.username,
      profilePicture: inv.profilePicture,
      level: inv.level || 0,
      active: Boolean(inv.referralMilestoneAwardedToReferrer),
      joinedAt: inv.referralJoinedAt,
    })),
  };
}

/**
 * Atomically claims a recruitment milestone (1, 3, 5, or 10 active recruits).
 */
async function claimReferralMilestone(userId, rawCount, io = null) {
  const targetCount = Number(rawCount);
  const milestone = REFERRAL_MILESTONES.find((m) => m.count === targetCount);
  if (!milestone) {
    return { status: 400, message: "Invalid milestone" };
  }

  const updated = await User.findOneAndUpdate(
    {
      _id: userId,
      activeReferralsCount: { $gte: milestone.count },
      referralMilestonesClaimed: { $ne: milestone.count },
    },
    {
      $addToSet: { referralMilestonesClaimed: milestone.count },
      $inc: {
        walletBalance: milestone.reward,
        referralEarningsTotal: milestone.reward,
      },
    },
    { new: true }
  );

  if (!updated) {
    const user = await User.findById(userId).select(
      "activeReferralsCount referralMilestonesClaimed"
    );
    if (!user) return { status: 404, message: "User not found" };
    if ((user.referralMilestonesClaimed || []).includes(milestone.count)) {
      return { status: 400, message: "Already claimed" };
    }
    return { status: 400, message: "Milestone not unlocked yet" };
  }

  if (io) {
    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: updated.walletBalance,
      xp: updated.xp,
      level: updated.level,
    });
  }

  return {
    status: 200,
    count: milestone.count,
    reward: milestone.reward,
    walletBalance: updated.walletBalance,
  };
}

module.exports = {
  INVITEE_UNLOCK_LEVEL,
  INVITEE_BONUS,
  REFERRER_UNLOCK_LEVEL,
  REFERRER_BONUS,
  REFERRAL_MILESTONES,
  MAX_REFERRALS_PER_IP_24H,
  normalizeReferralCode,
  hashIp,
  applyReferralOnSignup,
  processReferralLevelProgress,
  getReferralSummary,
  claimReferralMilestone,
};

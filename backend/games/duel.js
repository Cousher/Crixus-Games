const crypto = require("crypto");
const Duel = require("../models/Duel");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { chargeUser, creditUser } = require("../utils/economy");
const { trackMission, MIN_MISSION_BET } = require("../utils/missions");
const { recordLiveWin } = require("../utils/liveFeed");

// 1v1 Private Arena Coin Flip Duels (2.5% sink -> 1.95x total pot payout,
// matching global Coin Flip economics).
const MIN_BET = 10;
const MAX_BET = 25000;
const PAYOUT_MULTIPLIER = 1.95;
const MAX_OPEN_DUELS_PER_USER = 5;
const DUEL_TTL_MS = 24 * 60 * 60 * 1000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateDuelCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

function sanitizeCode(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

const createDuel = async (userId, rawBetAmount, rawSide, io) => {
  const betAmount = Number(rawBetAmount);
  if (
    !Number.isFinite(betAmount) ||
    !Number.isInteger(betAmount) ||
    betAmount < MIN_BET ||
    betAmount > MAX_BET
  ) {
    return { status: 400, message: "Invalid bet amount" };
  }

  const side = rawSide === "heads" || rawSide === "tails" ? rawSide : null;
  if (!side) {
    return { status: 400, message: "Invalid side" };
  }

  const openCount = await Duel.countDocuments({
    creatorId: userId,
    status: "open",
    expiresAt: { $gt: new Date() },
  });
  if (openCount >= MAX_OPEN_DUELS_PER_USER) {
    return { status: 400, message: "You have too many open duels" };
  }

  // Atomically escrow the creator's stake (no XP until duel actually resolves so
  // create->cancel loops can never farm XP).
  const creator = await chargeUser(userId, betAmount, { awardXp: false });
  if (!creator) {
    return { status: 400, message: "Insufficient balance" };
  }

  let code = generateDuelCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await Duel.exists({ code });
    if (!exists) break;
    code = generateDuelCode();
  }

  const duel = await Duel.create({
    code,
    creatorId: creator._id,
    creatorUsername: creator.username,
    creatorAvatar: creator.profilePicture || "",
    creatorLevel: creator.level || 0,
    creatorSide: side,
    betAmount,
    payout: Math.floor(betAmount * PAYOUT_MULTIPLIER * 100) / 100,
    status: "open",
    expiresAt: new Date(Date.now() + DUEL_TTL_MS),
  });

  if (io) {
    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: creator.walletBalance,
      xp: creator.xp,
      level: creator.level,
    });
  }

  return { status: 201, duel, walletBalance: creator.walletBalance };
};

const getDuel = async (rawCode) => {
  const code = sanitizeCode(rawCode);
  if (!code) return { status: 404, message: "Duel not found" };

  const duel = await Duel.findOne({ code });
  if (!duel) return { status: 404, message: "Duel not found" };

  // Lazily expire overdue open duels and refund creator atomically
  if (duel.status === "open" && duel.expiresAt.getTime() <= Date.now()) {
    const expired = await Duel.findOneAndUpdate(
      { _id: duel._id, status: "open" },
      { $set: { status: "expired" } },
      { new: true }
    );
    if (expired) {
      await User.findByIdAndUpdate(expired.creatorId, {
        $inc: { walletBalance: expired.betAmount },
      });
      return { status: 200, duel: expired };
    }
  }

  return { status: 200, duel };
};

const listMyDuels = async (userId) => {
  const duels = await Duel.find({
    $or: [{ creatorId: userId }, { opponentId: userId }],
  })
    .sort({ createdAt: -1 })
    .limit(15);
  return { status: 200, duels };
};

const joinDuel = async (userId, rawCode, io) => {
  const code = sanitizeCode(rawCode);
  if (!code) return { status: 404, message: "Duel not found" };

  const existing = await Duel.findOne({ code });
  if (!existing) return { status: 404, message: "Duel not found" };
  if (existing.status !== "open") {
    return { status: 400, message: "Duel is no longer open" };
  }
  if (existing.expiresAt.getTime() <= Date.now()) {
    return { status: 400, message: "Duel has expired" };
  }
  if (existing.creatorId.toString() === userId.toString()) {
    return { status: 400, message: "You can't join your own duel" };
  }

  // Atomically lock the duel so two challengers cannot join simultaneously
  const locked = await Duel.findOneAndUpdate(
    { _id: existing._id, status: "open", expiresAt: { $gt: new Date() } },
    { $set: { status: "completed", opponentId: userId } },
    { new: true }
  );
  if (!locked) {
    return { status: 400, message: "Duel is no longer open" };
  }

  // Charge challenger atomically (edge-weighted 2.5 XP/$1)
  const opponent = await chargeUser(userId, locked.betAmount, { xpMultiplier: 2.5 });
  if (!opponent) {
    // Roll back lock if opponent couldn't afford it
    await Duel.updateOne(
      { _id: locked._id },
      { $set: { status: "open", opponentId: null } }
    );
    return { status: 400, message: "Insufficient balance" };
  }

  // Award creator's XP now that the duel actually happened
  const { awardUserXp } = require("../utils/economy");
  await awardUserXp(locked.creatorId, locked.betAmount * 2.5);

  const resultSide = crypto.randomInt(0, 2) === 0 ? "heads" : "tails";
  const creatorWon = resultSide === locked.creatorSide;
  const winnerId = creatorWon ? locked.creatorId : opponent._id;
  const winnerUsername = creatorWon ? locked.creatorUsername : opponent.username;
  const payout = Math.floor(locked.betAmount * PAYOUT_MULTIPLIER * 100) / 100;
  const netProfit = Math.max(0, payout - locked.betAmount);

  const finalDuel = await Duel.findByIdAndUpdate(
    locked._id,
    {
      $set: {
        opponentUsername: opponent.username,
        opponentAvatar: opponent.profilePicture || "",
        opponentLevel: opponent.level || 0,
        resultSide,
        winnerId,
        winnerUsername,
        payout,
      },
    },
    { new: true }
  );

  // Pay winner & auto-connect them as friends
  const updatedWinner = await creditUser(winnerId, payout, netProfit);

  await Promise.all([
    User.updateOne({ _id: locked.creatorId }, { $addToSet: { friends: opponent._id } }),
    User.updateOne({ _id: opponent._id }, { $addToSet: { friends: locked.creatorId } }),
  ]);

  trackMission(io, locked.creatorId, "bet_total", locked.betAmount);
  trackMission(io, opponent._id, "bet_total", locked.betAmount);
  if (locked.betAmount >= MIN_MISSION_BET) {
    trackMission(io, winnerId, "coinflip_win");
  }

  recordLiveWin(io, {
    username: winnerUsername,
    userId: winnerId,
    game: "duel",
    multiplier: PAYOUT_MULTIPLIER,
    payout,
  });

  // Notify creator of the duel outcome
  const creatorMsg = creatorWon
    ? `You won your 1v1 duel against ${opponent.username} for $${payout}!`
    : `${opponent.username} won your 1v1 duel ($${payout}).`;
  await Notification.create({
    senderId: opponent._id,
    receiverId: locked.creatorId,
    type: "message",
    title: "1v1 Arena Duel",
    content: creatorMsg,
  });

  if (io) {
    io.to(locked.creatorId.toString()).emit("newNotification", { message: creatorMsg });
    io.to(locked.creatorId.toString()).emit("duel:resolved", finalDuel);
    io.to(opponent._id.toString()).emit("duel:resolved", finalDuel);
    if (updatedWinner) {
      io.to(winnerId.toString()).emit("userDataUpdated", {
        walletBalance: updatedWinner.walletBalance,
        xp: updatedWinner.xp,
        level: updatedWinner.level,
      });
    }
    if (!creatorWon) {
      // Winner is opponent; balance already emitted above.
    } else {
      // Opponent lost: emit debited balance
      io.to(opponent._id.toString()).emit("userDataUpdated", {
        walletBalance: opponent.walletBalance,
        xp: opponent.xp,
        level: opponent.level,
      });
    }
  }

  return {
    status: 200,
    duel: finalDuel,
    walletBalance: creatorWon ? opponent.walletBalance : updatedWinner?.walletBalance,
  };
};

const cancelDuel = async (userId, rawCode, io) => {
  const code = sanitizeCode(rawCode);
  if (!code) return { status: 404, message: "Duel not found" };

  // Atomically cancel only if still open and owned by this user
  const cancelled = await Duel.findOneAndUpdate(
    { code, creatorId: userId, status: "open" },
    { $set: { status: "cancelled" } },
    { new: true }
  );
  if (!cancelled) {
    return { status: 400, message: "Duel cannot be cancelled" };
  }

  const refunded = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: cancelled.betAmount } },
    { new: true }
  );

  if (io && refunded) {
    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: refunded.walletBalance,
      xp: refunded.xp,
      level: refunded.level,
    });
  }

  return { status: 200, duel: cancelled, walletBalance: refunded?.walletBalance };
};

module.exports = {
  MIN_BET,
  MAX_BET,
  PAYOUT_MULTIPLIER,
  generateDuelCode,
  sanitizeCode,
  createDuel,
  getDuel,
  listMyDuels,
  joinDuel,
  cancelDuel,
};

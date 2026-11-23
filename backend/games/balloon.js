const crypto = require("crypto");
const BalloonGame = require("../models/BalloonGame");
const { chargeUser, creditUser, awardUserXp } = require("../utils/economy");
const { trackMission } = require("../utils/missions");
const { recordLiveWin } = require("../utils/liveFeed");

const HOUSE_EDGE = 0.02; // 2% edge -> 98% RTP across all risk modes
const MIN_BET = 1;
const MAX_BET = 50000;
const MAX_PAYOUT = 500000;
const MIN_XP_MULTIPLIER = 1.25; // prevents 1-pump low-risk XP farming

const MODES = {
  bronze: { maxPumps: 30, popChance: 0.08 },   // 92% survive/pump -> up to 11.98x
  gold: { maxPumps: 24, popChance: 0.14 },     // 86% survive/pump -> up to 36.79x
  emperor: { maxPumps: 20, popChance: 0.25 },  // 75% survive/pump -> up to 308.60x
};

const round2 = (n) => Math.floor(n * 100) / 100;

// Exact provably-fair multiplier at pump `p` (0 = uninflated -> 1.00x).
// Formula: floor((1 - HOUSE_EDGE) / (surviveChance ^ p) * 100) / 100
const multiplierFor = (pump, mode) => {
  const cfg = MODES[mode];
  if (!cfg || pump <= 0) return 1;
  const survive = 1 - cfg.popChance;
  const raw = (1 - HOUSE_EDGE) / Math.pow(survive, pump);
  return Math.max(1.01, round2(raw));
};

const multipliersTable = (mode) => {
  const cfg = MODES[mode];
  if (!cfg) return [];
  return Array.from({ length: cfg.maxPumps }, (_, i) => multiplierFor(i + 1, mode));
};

// Deterministic provably-fair burst pump derived from serverSeed.
// Evaluates independent uniform u in [0, 1) for each pump 1..maxPumps;
// the first pump with u < popChance bursts the balloon. Returns maxPumps + 1 if it survives all.
const computePopAt = (serverSeed, mode) => {
  const cfg = MODES[mode];
  for (let p = 1; p <= cfg.maxPumps; p++) {
    const digest = crypto
      .createHash("sha256")
      .update(`balloon:${serverSeed}:${mode}:${p}`)
      .digest("hex");
    const u = parseInt(digest.slice(0, 8), 16) / 2 ** 32;
    if (u < cfg.popChance) {
      return p;
    }
  }
  return cfg.maxPumps + 1;
};

const fairnessHash = (serverSeed, mode, popAt) =>
  crypto.createHash("sha256").update(`${serverSeed}:${mode}:${popAt}`).digest("hex");

const payoutFor = (bet, multiplier) => Math.min(MAX_PAYOUT, round2(bet * multiplier));

// Public state: NEVER leaks popAt or serverSeed while active.
const publicState = (game) => {
  const currentMultiplier = multiplierFor(game.currentPump, game.mode);
  const nextPump = Math.min(game.maxPumps, game.currentPump + 1);
  const nextMultiplier = multiplierFor(nextPump, game.mode);
  return {
    gameId: game._id,
    bet: game.bet,
    mode: game.mode,
    maxPumps: game.maxPumps,
    currentPump: game.currentPump,
    hash: game.hash,
    multipliers: multipliersTable(game.mode),
    currentMultiplier,
    nextMultiplier,
    potentialPayout: game.currentPump > 0 ? payoutFor(game.bet, currentMultiplier) : game.bet,
  };
};

// Guard against concurrent requests for the same player
const inFlightUsers = new Set();

const start = async (userId, rawBetAmount, mode, io) => {
  const betAmount = Number(rawBetAmount);
  if (
    !Number.isFinite(betAmount) ||
    !Number.isInteger(betAmount) ||
    betAmount < MIN_BET ||
    betAmount > MAX_BET
  ) {
    return { status: 400, message: "Invalid bet amount" };
  }

  const cfg = MODES[mode];
  if (!cfg) {
    return { status: 400, message: "Invalid mode" };
  }

  const userKey = userId.toString();
  if (inFlightUsers.has(userKey)) {
    return { status: 400, message: "Game start already in progress" };
  }

  inFlightUsers.add(userKey);
  try {
    const existing = await BalloonGame.findOne({ userId, active: true });
    if (existing) {
      return {
        status: 400,
        message: "You already have an active game",
        game: publicState(existing),
      };
    }

    // Defer XP until round resolution (pop loss or >= 1.25x cashout)
    const player = await chargeUser(userId, betAmount, { awardXp: false });
    if (!player) {
      return { status: 400, message: "Insufficient balance" };
    }

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const popAt = computePopAt(serverSeed, mode);
    const hash = fairnessHash(serverSeed, mode, popAt);

    const game = await BalloonGame.create({
      userId,
      bet: betAmount,
      mode,
      maxPumps: cfg.maxPumps,
      currentPump: 0,
      popAt,
      serverSeed,
      hash,
    });

    trackMission(io, userId, "bet_total", betAmount);

    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: player.walletBalance,
      xp: player.xp,
      level: player.level,
    });

    return {
      status: 200,
      game: publicState(game),
      walletBalance: player.walletBalance,
    };
  } finally {
    inFlightUsers.delete(userKey);
  }
};

const pump = async (userId, io) => {
  const userKey = userId.toString();
  if (inFlightUsers.has(userKey)) {
    return { status: 400, message: "Action already in progress" };
  }

  inFlightUsers.add(userKey);
  try {
    const game = await BalloonGame.findOne({ userId, active: true });
    if (!game) {
      return { status: 400, message: "No active game" };
    }

    const nextPump = game.currentPump + 1;

    // Balloon burst!
    if (nextPump >= game.popAt) {
      const closed = await BalloonGame.findOneAndUpdate(
        { _id: game._id, active: true, currentPump: game.currentPump },
        { $set: { active: false } },
        { new: true }
      );
      if (!closed) {
        return { status: 400, message: "No active game" };
      }

      // Burst: player took real risk and lost stake -> award edge-weighted XP (2 XP/$1)
      const xpUser = await awardUserXp(userId, closed.bet * 2);
      if (xpUser) {
        io.to(userId.toString()).emit("userDataUpdated", {
          walletBalance: xpUser.walletBalance,
          xp: xpUser.xp,
          level: xpUser.level,
        });
      }

      return {
        status: 200,
        result: "popped",
        pump: nextPump,
        popAt: closed.popAt,
        serverSeed: closed.serverSeed,
        hash: closed.hash,
      };
    }

    // Reached maximum inflation -> automatic imperial jackpot cashout!
    if (nextPump >= game.maxPumps) {
      const closed = await BalloonGame.findOneAndUpdate(
        { _id: game._id, active: true, currentPump: game.currentPump },
        { $set: { active: false, currentPump: game.maxPumps } },
        { new: true }
      );
      if (!closed) {
        return { status: 400, message: "No active game" };
      }

      const mult = multiplierFor(closed.maxPumps, closed.mode);
      const payout = payoutFor(closed.bet, mult);
      let updatedUser = await creditUser(userId, payout, Math.max(0, payout - closed.bet));
      const xpUser = await awardUserXp(userId, closed.bet * 2);
      if (xpUser) updatedUser = xpUser;

      if (updatedUser) {
        recordLiveWin(io, {
          username: updatedUser.username,
          userId,
          game: "balloon",
          multiplier: mult,
          payout,
        });
        io.to(userId.toString()).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });
      }

      return {
        status: 200,
        result: "victory",
        pump: closed.maxPumps,
        multiplier: mult,
        payout,
        popAt: closed.popAt,
        serverSeed: closed.serverSeed,
        hash: closed.hash,
        walletBalance: updatedUser ? updatedUser.walletBalance : undefined,
      };
    }

    // Safe inflation -> advance
    const updated = await BalloonGame.findOneAndUpdate(
      { _id: game._id, active: true, currentPump: game.currentPump },
      { $set: { currentPump: nextPump } },
      { new: true }
    );
    if (!updated) {
      return { status: 400, message: "No active game" };
    }

    return {
      status: 200,
      result: "inflated",
      pump: nextPump,
      game: publicState(updated),
    };
  } finally {
    inFlightUsers.delete(userKey);
  }
};

const cashout = async (userId, io) => {
  const userKey = userId.toString();
  if (inFlightUsers.has(userKey)) {
    return { status: 400, message: "Action already in progress" };
  }

  inFlightUsers.add(userKey);
  try {
    // Atomically close only if active AND inflated at least once
    const game = await BalloonGame.findOneAndUpdate(
      { userId, active: true, currentPump: { $gte: 1 } },
      { $set: { active: false } },
      { new: true }
    );

    if (!game) {
      return {
        status: 400,
        message: "No active game to cash out (inflate at least once)",
      };
    }

    const mult = multiplierFor(game.currentPump, game.mode);
    const payout = payoutFor(game.bet, mult);
    let updatedUser = await creditUser(userId, payout, Math.max(0, payout - game.bet));

    if (mult >= MIN_XP_MULTIPLIER) {
      const xpUser = await awardUserXp(userId, game.bet * 2);
      if (xpUser) updatedUser = xpUser;
    }

    if (updatedUser) {
      recordLiveWin(io, {
        username: updatedUser.username,
        userId,
        game: "balloon",
        multiplier: mult,
        payout,
      });
      io.to(userId.toString()).emit("userDataUpdated", {
        walletBalance: updatedUser.walletBalance,
        xp: updatedUser.xp,
        level: updatedUser.level,
      });
    }

    return {
      status: 200,
      result: "cashout",
      pump: game.currentPump,
      multiplier: mult,
      payout,
      popAt: game.popAt,
      serverSeed: game.serverSeed,
      hash: game.hash,
      walletBalance: updatedUser ? updatedUser.walletBalance : undefined,
    };
  } finally {
    inFlightUsers.delete(userKey);
  }
};

const activeGame = async (userId) => {
  const game = await BalloonGame.findOne({ userId, active: true });
  return { status: 200, game: game ? publicState(game) : null };
};

module.exports = {
  MODES,
  HOUSE_EDGE,
  MAX_PAYOUT,
  multiplierFor,
  multipliersTable,
  computePopAt,
  fairnessHash,
  payoutFor,
  start,
  pump,
  cashout,
  activeGame,
};

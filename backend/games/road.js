const crypto = require("crypto");
const RoadGame = require("../models/RoadGame");
const { chargeUser, creditUser, awardUserXp } = require("../utils/economy");
const { trackMission, MIN_MISSION_BET } = require("../utils/missions");
const { recordLiveWin } = require("../utils/liveFeed");

const HOUSE_EDGE = 0.02; // 2% edge -> 98% RTP across all difficulties
const MIN_BET = 1;
const MAX_BET = 50000;
const MAX_PAYOUT = 500000;
const MIN_XP_MULTIPLIER = 1.25; // blocks Easy 1-step (1.08x) XP/mission farming

const DIFFICULTIES = {
  easy: { totalSteps: 20, trapChance: 0.1 },     // 90% survive/step -> up to 8.06x
  medium: { totalSteps: 18, trapChance: 0.2 },   // 80% survive/step -> up to 54.40x
  hard: { totalSteps: 15, trapChance: 0.3 },     // 70% survive/step -> up to 206.42x
  hardcore: { totalSteps: 12, trapChance: 0.4 }, // 60% survive/step -> up to 450.19x
};

const round2 = (n) => Math.floor(n * 100) / 100;

// Multiplier at step `step` (0 = start platform -> 1.00x).
// Exact formula: floor((1 - HOUSE_EDGE) / (surviveChance ^ step) * 100) / 100
const multiplierFor = (step, difficulty) => {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg || step <= 0) return 1;
  const survive = 1 - cfg.trapChance;
  const raw = (1 - HOUSE_EDGE) / Math.pow(survive, step);
  return Math.max(1.01, round2(raw));
};

const multipliersTable = (difficulty) => {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) return [];
  return Array.from({ length: cfg.totalSteps }, (_, i) => multiplierFor(i + 1, difficulty));
};

// Deterministic provably-fair crash step derived from serverSeed.
// Rolls an independent uniform u in [0, 1) for each step 1..totalSteps;
// first step with u < trapChance is the trap. If all survive, returns totalSteps + 1.
const computeCrashStep = (serverSeed, difficulty) => {
  const cfg = DIFFICULTIES[difficulty];
  for (let step = 1; step <= cfg.totalSteps; step++) {
    const digest = crypto
      .createHash("sha256")
      .update(`road:${serverSeed}:${difficulty}:${step}`)
      .digest("hex");
    const u = parseInt(digest.slice(0, 8), 16) / 2 ** 32;
    if (u < cfg.trapChance) {
      return step;
    }
  }
  return cfg.totalSteps + 1;
};

const fairnessHash = (serverSeed, difficulty, crashStep) =>
  crypto
    .createHash("sha256")
    .update(`${serverSeed}:${difficulty}:${crashStep}`)
    .digest("hex");

const payoutFor = (bet, multiplier) => Math.min(MAX_PAYOUT, round2(bet * multiplier));

// Public state: NEVER leaks crashStep or serverSeed while active.
const publicState = (game) => {
  const currentMultiplier = multiplierFor(game.currentStep, game.difficulty);
  const nextStep = Math.min(game.totalSteps, game.currentStep + 1);
  const nextMultiplier = multiplierFor(nextStep, game.difficulty);
  return {
    gameId: game._id,
    bet: game.bet,
    difficulty: game.difficulty,
    totalSteps: game.totalSteps,
    currentStep: game.currentStep,
    hash: game.hash,
    multipliers: multipliersTable(game.difficulty),
    currentMultiplier,
    nextMultiplier,
    potentialPayout: game.currentStep > 0 ? payoutFor(game.bet, currentMultiplier) : game.bet,
  };
};

// Guard against concurrent requests for the same player
const inFlightUsers = new Set();

const start = async (userId, rawBetAmount, difficulty, io) => {
  const betAmount = Number(rawBetAmount);
  if (
    !Number.isFinite(betAmount) ||
    !Number.isInteger(betAmount) ||
    betAmount < MIN_BET ||
    betAmount > MAX_BET
  ) {
    return { status: 400, message: "Invalid bet amount" };
  }

  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) {
    return { status: 400, message: "Invalid difficulty" };
  }

  const userKey = userId.toString();
  if (inFlightUsers.has(userKey)) {
    return { status: 400, message: "Game start already in progress" };
  }

  inFlightUsers.add(userKey);
  try {
    const existing = await RoadGame.findOne({ userId, active: true });
    if (existing) {
      return {
        status: 400,
        message: "You already have an active game",
        game: publicState(existing),
      };
    }

    // Defer XP until round resolution (loss or >= 1.25x cashout)
    const player = await chargeUser(userId, betAmount, { awardXp: false });
    if (!player) {
      return { status: 400, message: "Insufficient balance" };
    }

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const crashStep = computeCrashStep(serverSeed, difficulty);
    const hash = fairnessHash(serverSeed, difficulty, crashStep);

    const game = await RoadGame.create({
      userId,
      bet: betAmount,
      difficulty,
      totalSteps: cfg.totalSteps,
      currentStep: 0,
      crashStep,
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

const step = async (userId, io) => {
  const userKey = userId.toString();
  if (inFlightUsers.has(userKey)) {
    return { status: 400, message: "Action already in progress" };
  }

  inFlightUsers.add(userKey);
  try {
    const game = await RoadGame.findOne({ userId, active: true });
    if (!game) {
      return { status: 400, message: "No active game" };
    }

    const targetStep = game.currentStep + 1;

    // Hit the fire trap!
    if (targetStep >= game.crashStep) {
      const closed = await RoadGame.findOneAndUpdate(
        { _id: game._id, active: true, currentStep: game.currentStep },
        { $set: { active: false } },
        { new: true }
      );
      if (!closed) {
        return { status: 400, message: "No active game" };
      }

      // Burned: player took real risk and lost stake -> award edge-weighted XP (2 XP/$1)
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
        result: "burned",
        step: targetStep,
        crashStep: closed.crashStep,
        serverSeed: closed.serverSeed,
        hash: closed.hash,
      };
    }

    // Reached the final golden chest -> automatic cashout!
    if (targetStep >= game.totalSteps) {
      const closed = await RoadGame.findOneAndUpdate(
        { _id: game._id, active: true, currentStep: game.currentStep },
        { $set: { active: false, currentStep: game.totalSteps } },
        { new: true }
      );
      if (!closed) {
        return { status: 400, message: "No active game" };
      }

      const mult = multiplierFor(closed.totalSteps, closed.difficulty);
      const payout = payoutFor(closed.bet, mult);
      let updatedUser = await creditUser(userId, payout, Math.max(0, payout - closed.bet));
      const xpUser = await awardUserXp(userId, closed.bet * 2);
      if (xpUser) updatedUser = xpUser;
      if (closed.bet >= MIN_MISSION_BET) {
        trackMission(io, userId, "road_cashout");
      }

      if (updatedUser) {
        recordLiveWin(io, {
          username: updatedUser.username,
          userId,
          game: "road",
          multiplier: mult,
          payout,
        });
      }

      io.to(userId.toString()).emit("userDataUpdated", {
        walletBalance: updatedUser.walletBalance,
        xp: updatedUser.xp,
        level: updatedUser.level,
      });

      return {
        status: 200,
        result: "victory",
        step: closed.totalSteps,
        multiplier: mult,
        payout,
        crashStep: closed.crashStep,
        serverSeed: closed.serverSeed,
        hash: closed.hash,
        walletBalance: updatedUser.walletBalance,
      };
    }

    // Safe step -> advance
    const updated = await RoadGame.findOneAndUpdate(
      { _id: game._id, active: true, currentStep: game.currentStep },
      { $set: { currentStep: targetStep } },
      { new: true }
    );
    if (!updated) {
      return { status: 400, message: "No active game" };
    }

    return {
      status: 200,
      result: "safe",
      step: targetStep,
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
    // Atomically close only if active AND at least 1 step cleared
    const game = await RoadGame.findOneAndUpdate(
      { userId, active: true, currentStep: { $gte: 1 } },
      { $set: { active: false } },
      { new: true }
    );

    if (!game) {
      return {
        status: 400,
        message: "No active game to cash out (advance at least one step)",
      };
    }

    const mult = multiplierFor(game.currentStep, game.difficulty);
    const payout = payoutFor(game.bet, mult);
    let updatedUser = await creditUser(userId, payout, Math.max(0, payout - game.bet));

    if (mult >= MIN_XP_MULTIPLIER) {
      const xpUser = await awardUserXp(userId, game.bet * 2);
      if (xpUser) updatedUser = xpUser;
      if (game.bet >= MIN_MISSION_BET) {
        trackMission(io, userId, "road_cashout");
      }
    }

    if (updatedUser) {
      recordLiveWin(io, {
        username: updatedUser.username,
        userId,
        game: "road",
        multiplier: mult,
        payout,
      });
    }

    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: updatedUser.walletBalance,
      xp: updatedUser.xp,
      level: updatedUser.level,
    });

    return {
      status: 200,
      result: "cashout",
      step: game.currentStep,
      multiplier: mult,
      payout,
      crashStep: game.crashStep,
      serverSeed: game.serverSeed,
      hash: game.hash,
      walletBalance: updatedUser.walletBalance,
    };
  } finally {
    inFlightUsers.delete(userKey);
  }
};

const activeGame = async (userId) => {
  const game = await RoadGame.findOne({ userId, active: true });
  return { status: 200, game: game ? publicState(game) : null };
};

module.exports = {
  DIFFICULTIES,
  multiplierFor,
  multipliersTable,
  computeCrashStep,
  fairnessHash,
  start,
  step,
  cashout,
  activeGame,
};

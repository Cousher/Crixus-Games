const crypto = require("crypto");
const MinesGame = require("../models/MinesGame");
const { chargeUser, creditUser, awardUserXp } = require("../utils/economy");
const { trackMission, MIN_MISSION_BET } = require("../utils/missions");
const { recordLiveWin } = require("../utils/liveFeed");

const GRID_SIZE = 25; // 5x5
const HOUSE_EDGE = 0.01; // 1% edge -> 99% RTP
const MIN_BET = 1;
const MAX_BET = 50000;
const MAX_PAYOUT = 500000;
const MIN_XP_MULTIPLIER = 1.25; // blocks 1-mine 1-tile (1.03x) zero-risk XP/mission farming

const payoutFor = (bet, multiplier) =>
  Math.min(MAX_PAYOUT, Math.floor(bet * multiplier * 100) / 100);

// fair multiplier after `revealedCount` safe tiles with `minesCount` mines:
// product of (tiles left) / (safe tiles left) at each step, minus the edge.
const multiplierFor = (revealedCount, minesCount) => {
  let fair = 1;
  for (let i = 0; i < revealedCount; i++) {
    fair *= (GRID_SIZE - i) / (GRID_SIZE - minesCount - i);
  }
  return Math.max(1, Math.floor(fair * (1 - HOUSE_EDGE) * 100) / 100);
};

// crypto-based selection of `count` distinct mine positions
const drawMines = (count) => {
  const positions = Array.from({ length: GRID_SIZE }, (_, i) => i);
  // Fisher-Yates with crypto randomness
  for (let i = positions.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, count);
};

const fairnessHash = (serverSeed, mines) =>
  crypto
    .createHash("sha256")
    .update(`${serverSeed}:${[...mines].sort((a, b) => a - b).join(",")}`)
    .digest("hex");

// public view of a round: never leaks mine positions while active
const publicState = (game) => ({
  gameId: game._id,
  bet: game.bet,
  minesCount: game.minesCount,
  revealed: game.revealed,
  hash: game.hash,
  currentMultiplier: multiplierFor(game.revealed.length, game.minesCount),
  nextMultiplier: multiplierFor(game.revealed.length + 1, game.minesCount),
  potentialPayout: payoutFor(game.bet, multiplierFor(game.revealed.length, game.minesCount)),
});

const startingUsers = new Set();

const start = async (userId, rawBetAmount, minesCount, io) => {
  const betAmount = Number(rawBetAmount);
  if (!Number.isFinite(betAmount) || !Number.isInteger(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
    return { status: 400, message: "Invalid bet amount" };
  }
  if (!Number.isInteger(minesCount) || minesCount < 1 || minesCount > GRID_SIZE - 1) {
    return { status: 400, message: "Invalid mines count" };
  }

  const userKey = userId.toString();
  if (startingUsers.has(userKey)) {
    return { status: 400, message: "Game start already in progress" };
  }

  startingUsers.add(userKey);
  try {
    const existing = await MinesGame.findOne({ userId, active: true });
    if (existing) {
      return { status: 400, message: "You already have an active game", game: publicState(existing) };
    }

    // Do not grant XP upfront: XP is awarded on round resolution (loss or >=1.25x cashout)
    // so 1-mine 1-tile (1.03x) cannot farm XP or level rewards risk-free.
    const player = await chargeUser(userId, betAmount, { awardXp: false });
    if (!player) {
      return { status: 400, message: "Insufficient balance" };
    }

    const mines = drawMines(minesCount);
    const serverSeed = crypto.randomBytes(16).toString("hex");
    const hash = fairnessHash(serverSeed, mines);

    const game = await MinesGame.create({
      userId,
      bet: betAmount,
      minesCount,
      mines,
      serverSeed,
      hash,
    });

    trackMission(io, userId, "bet_total", betAmount);

    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: player.walletBalance,
      xp: player.xp,
      level: player.level,
    });

    return { status: 200, game: publicState(game) };
  } finally {
    startingUsers.delete(userKey);
  }
};


const reveal = async (userId, tileIndex, io) => {
  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= GRID_SIZE) {
    return { status: 400, message: "Invalid tile" };
  }

  // atomic push: the (active, not-yet-revealed) condition prevents a double
  // reveal of the same tile from concurrent requests
  const game = await MinesGame.findOneAndUpdate(
    { userId, active: true, revealed: { $ne: tileIndex } },
    { $push: { revealed: tileIndex } },
    { new: true }
  );

  if (!game) {
    return { status: 400, message: "No active game or tile already revealed" };
  }

  // hit a mine: round over, stake lost -> award edge-weighted XP (1 XP/$1)
  if (game.mines.includes(tileIndex)) {
    game.active = false;
    await game.save();
    const xpUser = await awardUserXp(userId, game.bet * 1);
    if (xpUser) {
      io.to(userId.toString()).emit("userDataUpdated", {
        walletBalance: xpUser.walletBalance,
        xp: xpUser.xp,
        level: xpUser.level,
      });
    }
    return {
      status: 200,
      result: "boom",
      tileIndex,
      mines: game.mines,
      serverSeed: game.serverSeed,
      hash: game.hash,
    };
  }

  const safeTiles = GRID_SIZE - game.minesCount;

  // revealed every safe tile: automatic cashout at the max multiplier
  if (game.revealed.length >= safeTiles) {
    return cashout(userId, io, game);
  }

  return { status: 200, result: "safe", tileIndex, game: publicState(game) };
};

const cashout = async (userId, io, preloadedGame = null) => {
  // atomically close the round so a duplicate cashout can't pay twice
  const game =
    preloadedGame && preloadedGame.active
      ? await MinesGame.findOneAndUpdate(
          { _id: preloadedGame._id, active: true },
          { $set: { active: false } },
          { new: true }
        )
      : await MinesGame.findOneAndUpdate(
          { userId, active: true, "revealed.0": { $exists: true } },
          { $set: { active: false } },
          { new: true }
        );

  if (!game) {
    return { status: 400, message: "No active game to cash out (reveal at least one tile)" };
  }

  const multiplier = multiplierFor(game.revealed.length, game.minesCount);
  const payout = payoutFor(game.bet, multiplier);

  let updatedUser = await creditUser(userId, payout, Math.max(0, payout - game.bet));

  if (multiplier >= MIN_XP_MULTIPLIER) {
    const xpUser = await awardUserXp(userId, game.bet * 1);
    if (xpUser) updatedUser = xpUser;
    if (game.bet >= MIN_MISSION_BET) {
      trackMission(io, userId, "mines_cashout");
    }
  }

  if (updatedUser) {
    recordLiveWin(io, {
      username: updatedUser.username,
      userId,
      game: "mines",
      multiplier,
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
    payout,
    multiplier,
    mines: game.mines,
    revealed: game.revealed,
    serverSeed: game.serverSeed,
    hash: game.hash,
  };
};

const activeGame = async (userId) => {
  const game = await MinesGame.findOne({ userId, active: true });
  if (!game) return { status: 200, game: null };
  return { status: 200, game: publicState(game) };
};

module.exports = { start, reveal, cashout, activeGame, multiplierFor, payoutFor, MAX_PAYOUT, drawMines, fairnessHash };

const crypto = require("crypto");
const {
  DIFFICULTIES,
  multiplierFor,
  multipliersTable,
  computeCrashStep,
  fairnessHash,
} = require("./road");
const { chargeUser, creditUser, awardUserXp } = require("../utils/economy");
const { trackMission, MIN_MISSION_BET } = require("../utils/missions");
const { recordLiveWin } = require("../utils/liveFeed");

const DIFFICULTY = "medium"; // 18 steps, 20% trap/step, 98% RTP -> up to 54.40x
const CFG = DIFFICULTIES[DIFFICULTY];
const MULTIPLIERS = multipliersTable(DIFFICULTY);

const MIN_BET = 1;
const MAX_BET = 50000;
const MAX_PAYOUT = 500000;
const MIN_XP_MULTIPLIER = 1.25;

const BETTING_WINDOW_MS = 10000;
const STEP_INTERVAL_MS = 2200;
const REVEAL_PAUSE_MS = 4500;
const HISTORY_SIZE = 15;

const round2 = (n) => Math.floor(n * 100) / 100;
const payoutFor = (bet, multiplier) => Math.min(MAX_PAYOUT, round2(bet * multiplier));

/**
 * Live Multiplayer Gladiator Road ("Camino del Gladiador — Arena en Vivo").
 * All connected players join the same Colosseum gauntlet round:
 *   1. Betting window (10s) — Provably Fair hash published before bets close.
 *   2. Live run — the Gladiator leaps 1 tile every 2.2s; players cash out at
 *      any safe step (manually or via server-side autoCashoutStep) before the
 *      fire trap erupts.
 *   3. Reveal (4.5s) — seed & crashStep published for verification, then next
 *      round opens automatically.
 */
const roadMultiplayerGame = (io, options = {}) => {
  const bettingWindowMs = options.bettingWindowMs || BETTING_WINDOW_MS;
  const stepIntervalMs = options.stepIntervalMs || STEP_INTERVAL_MS;
  const revealPauseMs = options.revealPauseMs || REVEAL_PAUSE_MS;

  let roundId = 0;
  let phase = "betting"; // "betting" | "running" | "ended"
  let currentStep = 0;
  let serverSeed = null;
  let crashStep = 1;
  let hash = null;
  let phaseEndsAt = Date.now() + bettingWindowMs;
  let lastRoundResult = null;

  // Map<userId, playerRecord>
  let players = new Map();
  // Server-only auto-cashout targets (step number 1..totalSteps)
  let autoCashoutSteps = new Map();
  // Synchronous double-bet guard while chargeUser is in flight
  const pendingBets = new Set();
  const history = [];

  let activeTimer = null;

  const serializePlayers = () =>
    Array.from(players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      profilePicture: p.profilePicture,
      level: p.level,
      bet: p.bet,
      status: p.status,
      cashoutStep: p.cashoutStep,
      cashoutMultiplier: p.cashoutMultiplier,
      payout: p.payout,
    }));

  // Public state: NEVER leaks crashStep or serverSeed while phase !== "ended".
  const buildPublicState = () => {
    const currentMultiplier = multiplierFor(currentStep, DIFFICULTY);
    const nextStep = Math.min(CFG.totalSteps, currentStep + 1);
    const nextMultiplier = multiplierFor(nextStep, DIFFICULTY);
    return {
      roundId,
      phase,
      difficulty: DIFFICULTY,
      totalSteps: CFG.totalSteps,
      trapChance: CFG.trapChance,
      multipliers: MULTIPLIERS,
      currentStep,
      currentMultiplier,
      nextMultiplier,
      hash,
      phaseEndsAt,
      stepIntervalMs,
      bettingWindowMs,
      players: serializePlayers(),
      result: phase === "ended" ? lastRoundResult : null,
      history,
    };
  };

  const broadcastState = () => {
    io.emit("road:state", buildPublicState());
  };

  const cashOutPlayer = async (userId, stepNum, type = "cashout", socket = null) => {
    const player = players.get(userId);
    if (!player || player.status !== "active") return false;

    const mult = multiplierFor(stepNum, DIFFICULTY);
    const payout = payoutFor(player.bet, mult);

    // Mark cashed out synchronously BEFORE async DB writes to prevent double-pay
    player.status = "cashed_out";
    player.cashoutStep = stepNum;
    player.cashoutMultiplier = mult;
    player.payout = payout;
    autoCashoutSteps.delete(userId);

    try {
      let updatedUser = await creditUser(userId, payout, Math.max(0, payout - player.bet));
      if (mult >= MIN_XP_MULTIPLIER) {
        const xpUser = await awardUserXp(userId, player.bet * 2);
        if (xpUser) updatedUser = xpUser;
        if (player.bet >= MIN_MISSION_BET) {
          trackMission(io, userId, "road_cashout");
        }
      }

      if (updatedUser) {
        recordLiveWin(io, {
          username: player.username,
          userId,
          game: "road",
          multiplier: mult,
          payout,
        });
        io.to(userId).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });
      }

      const payload = { userId, step: stepNum, multiplier: mult, payout, type };
      if (socket) {
        socket.emit("road:cashoutSuccess", payload);
      } else {
        io.to(userId).emit("road:cashoutSuccess", payload);
      }
      broadcastState();
      return true;
    } catch (err) {
      console.error("[roadMultiplayer] cashOutPlayer error:", err);
      return false;
    }
  };

  const scheduleNextStep = () => {
    phaseEndsAt = Date.now() + stepIntervalMs;
    broadcastState();
    activeTimer = setTimeout(advanceStep, stepIntervalMs);
  };

  const endRound = async (type, finalStep) => {
    phase = "ended";
    lastRoundResult = {
      type,
      step: finalStep,
      crashStep,
      serverSeed,
      hash,
    };

    const safeSteps = type === "victory" ? CFG.totalSteps : Math.max(0, crashStep - 1);
    history.unshift({
      roundId,
      type,
      safeSteps,
      maxMultiplier: safeSteps > 0 ? multiplierFor(safeSteps, DIFFICULTY) : 0,
      crashStep,
    });
    if (history.length > HISTORY_SIZE) history.pop();

    if (type === "burned") {
      // Mark all remaining active players as burned and award risk XP (2 XP/$1)
      const burnedUsers = [];
      for (const player of players.values()) {
        if (player.status === "active") {
          player.status = "burned";
          burnedUsers.push(player);
        }
      }
      autoCashoutSteps.clear();

      for (const p of burnedUsers) {
        awardUserXp(p.userId, p.bet * 2)
          .then((xpUser) => {
            if (xpUser) {
              io.to(p.userId).emit("userDataUpdated", {
                walletBalance: xpUser.walletBalance,
                xp: xpUser.xp,
                level: xpUser.level,
              });
            }
          })
          .catch(() => {});
      }
    }

    phaseEndsAt = Date.now() + revealPauseMs;
    broadcastState();

    activeTimer = setTimeout(openBettingRound, revealPauseMs);
  };

  const advanceStep = async () => {
    if (phase !== "running") return;

    const targetStep = currentStep + 1;

    // Fire trap erupts!
    if (targetStep >= crashStep) {
      await endRound("burned", targetStep);
      return;
    }

    // Safe step!
    currentStep = targetStep;

    // Trigger server-side auto-cashout for any player targeting this step
    const autoTargets = [];
    for (const [uid, target] of autoCashoutSteps.entries()) {
      const p = players.get(uid);
      if (p && p.status === "active" && currentStep >= target) {
        autoTargets.push(uid);
      }
    }
    for (const uid of autoTargets) {
      await cashOutPlayer(uid, currentStep, "cashout");
    }

    // Reached final golden chest -> all remaining gladiators win automatically!
    if (currentStep >= CFG.totalSteps) {
      const survivors = [];
      for (const p of players.values()) {
        if (p.status === "active") survivors.push(p.userId);
      }
      for (const uid of survivors) {
        await cashOutPlayer(uid, CFG.totalSteps, "victory");
      }
      await endRound("victory", CFG.totalSteps);
      return;
    }

    scheduleNextStep();
  };

  const startRun = () => {
    phase = "running";
    currentStep = 0;
    // First leap happens slightly brisker (1.2s) so players don't wait long after countdown hits 0
    const firstDelay = Math.min(1200, stepIntervalMs);
    phaseEndsAt = Date.now() + firstDelay;
    broadcastState();
    activeTimer = setTimeout(advanceStep, firstDelay);
  };

  const openBettingRound = () => {
    roundId += 1;
    phase = "betting";
    currentStep = 0;
    lastRoundResult = null;
    players = new Map();
    autoCashoutSteps = new Map();
    serverSeed = crypto.randomBytes(32).toString("hex");
    crashStep = computeCrashStep(serverSeed, DIFFICULTY);
    hash = fairnessHash(serverSeed, DIFFICULTY, crashStep);
    phaseEndsAt = Date.now() + bettingWindowMs;
    broadcastState();
    activeTimer = setTimeout(startRun, bettingWindowMs);
  };

  io.on("connection", (socket) => {
    // Late joiners get the current live arena state immediately
    socket.emit("road:state", buildPublicState());

    socket.on("road:requestSync", () => {
      if (socket.isRateLimited && socket.isRateLimited()) return;
      socket.emit("road:state", buildPublicState());
    });

    socket.on("road:bet", async (payload, ack) => {
      const reply = (res) => {
        if (typeof ack === "function") ack(res);
      };
      if (socket.isRateLimited && socket.isRateLimited()) {
        return reply({ ok: false, message: "Too many game actions, please slow down" });
      }
      const userId = socket.userId ? socket.userId.toString() : null;
      if (!userId) {
        return reply({ ok: false, message: "No authorization token provided" });
      }
      if (phase !== "betting") {
        return reply({ ok: false, message: "Wait for next round" });
      }

      const rawBet = payload && typeof payload === "object" ? payload.bet : payload;
      const rawAutoStep = payload && typeof payload === "object" ? payload.autoCashoutStep : null;

      const bet = Number(rawBet);
      if (!Number.isFinite(bet) || !Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET) {
        return reply({ ok: false, message: "Invalid bet amount" });
      }

      let autoStep = null;
      if (rawAutoStep !== null && rawAutoStep !== undefined && rawAutoStep !== "") {
        const parsed = Number(rawAutoStep);
        if (Number.isInteger(parsed) && parsed >= 1 && parsed <= CFG.totalSteps) {
          autoStep = parsed;
        }
      }

      if (pendingBets.has(userId) || players.has(userId)) {
        return reply({ ok: false, message: "You already joined this round" });
      }

      pendingBets.add(userId);
      try {
        // Re-check phase after synchronous guard
        if (phase !== "betting") {
          return reply({ ok: false, message: "Wait for next round" });
        }

        const updatedUser = await chargeUser(userId, bet, { awardXp: false });
        if (!updatedUser) {
          return reply({ ok: false, message: "Insufficient balance" });
        }

        players.set(userId, {
          userId,
          username: updatedUser.username,
          profilePicture: updatedUser.profilePicture || "",
          level: updatedUser.level || 0,
          bet,
          status: "active",
          cashoutStep: null,
          cashoutMultiplier: null,
          payout: null,
        });
        if (autoStep) {
          autoCashoutSteps.set(userId, autoStep);
        }

        trackMission(io, userId, "bet_total", bet);

        io.to(userId).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });

        broadcastState();
        reply({ ok: true, walletBalance: updatedUser.walletBalance });
      } catch (err) {
        console.error("[roadMultiplayer] road:bet error:", err);
        reply({ ok: false, message: "Server error" });
      } finally {
        pendingBets.delete(userId);
      }
    });

    socket.on("road:cashout", async (ack) => {
      const reply = (res) => {
        if (typeof ack === "function") ack(res);
      };
      if (socket.isRateLimited && socket.isRateLimited()) {
        return reply({ ok: false, message: "Too many game actions, please slow down" });
      }
      const userId = socket.userId ? socket.userId.toString() : null;
      if (!userId) {
        return reply({ ok: false, message: "No authorization token provided" });
      }
      // Strictly reject cashout outside running phase or before step 1 (anti-oracle)
      if (phase !== "running" || currentStep < 1) {
        return reply({ ok: false, message: "No active game to cash out (advance at least one step)" });
      }

      const player = players.get(userId);
      if (!player || player.status !== "active") {
        return reply({ ok: false, message: "No active game" });
      }

      const ok = await cashOutPlayer(userId, currentStep, "cashout", socket);
      reply({ ok });
    });
  });

  // Boot the first live arena round immediately
  openBettingRound();

  return {
    stop: () => {
      if (activeTimer) clearTimeout(activeTimer);
    },
    getPublicState: buildPublicState,
  };
};

module.exports = roadMultiplayerGame;

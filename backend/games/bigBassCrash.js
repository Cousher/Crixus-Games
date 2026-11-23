const crypto = require("crypto");
const { chargeUser, creditUser } = require("../utils/economy");
const { GROWTH, multiplierAt, crashPointFromRandom } = require("../utils/crashMath");
const { trackMission } = require("../utils/missions");
const { recordLiveWin } = require("../utils/liveFeed");

const HISTORY_SIZE = 20;
const MIN_BET = 1;
const MAX_BET = 10000;
const MAX_PROFIT = 100000;
const BETTING_WINDOW_MS = 10000;
const REVEAL_PAUSE_MS = 4000;
const CLIENT_SYNC_INTERVAL_MS = 1200;

const round2 = (n) => Math.floor(n * 100) / 100;

/**
 * Big Bass Crash — Crixus Edition (Multiplayer Socket.io live room).
 * Features Pragmatic Play's signature 50% partial cashout ("Retirar 50%"):
 *   - Players can lock in 50% of their active stake at any multiplier > 1.00x
 *     while letting the remaining 50% keep riding in the golden net.
 *   - Supports both manual and server-side auto-cashout (50% and 100%).
 *   - Provably fair: SHA-256 commitment hash published before bets close;
 *     serverSeed + crashPoint revealed only after the net snaps.
 */
const bigBassCrashGame = (io, options = {}) => {
  const bettingWindowMs = options.bettingWindowMs || BETTING_WINDOW_MS;
  const revealPauseMs = options.revealPauseMs || REVEAL_PAUSE_MS;

  let roundId = 0;
  let phase = "betting"; // "betting" | "running" | "crashed"
  let crashPoint = 1.0;
  let gameStartTime = null;
  let serverSeed = null;
  let seedHash = null;
  let phaseEndsAt = Date.now() + bettingWindowMs;
  let lastReveal = null;

  // Map<userId, playerState>
  let players = new Map();
  // Server-only auto-cashout targets: Map<userId, { full: number, half: number | null }>
  let autoTargets = new Map();
  const pendingBets = new Set();
  const history = [];

  let activeTimeout = null;
  let activeInterval = null;

  const calculateMultiplier = () => {
    if (phase !== "running" || !gameStartTime) return 1.0;
    const elapsedSec = Math.max(0, (Date.now() - gameStartTime) / 1000);
    return multiplierAt(elapsedSec, crashPoint);
  };

  const serializePlayers = () =>
    Array.from(players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      profilePicture: p.profilePicture,
      level: p.level,
      bet: p.bet,
      remainingBet: p.remainingBet,
      halfCashedOut: p.halfCashedOut,
      halfMultiplier: p.halfMultiplier,
      halfPayout: p.halfPayout,
      fullCashedOut: p.fullCashedOut,
      fullMultiplier: p.fullMultiplier,
      totalPayout: p.totalPayout,
    }));

  // NEVER expose crashPoint or serverSeed while phase !== "crashed"
  const buildPublicState = () => ({
    roundId,
    phase,
    growth: GROWTH,
    multiplier: phase === "running" ? round2(calculateMultiplier()) : phase === "crashed" ? crashPoint : 1.0,
    elapsedMs: phase === "running" && gameStartTime ? Math.max(0, Date.now() - gameStartTime) : 0,
    gameStartTime: phase === "running" ? gameStartTime : null,
    phaseEndsAt,
    bettingWindowMs,
    hash: seedHash,
    players: serializePlayers(),
    reveal: phase === "crashed" ? lastReveal : null,
    history,
  });

  const broadcastState = () => {
    io.emit("bigbass:state", buildPublicState());
  };

  const cashOutHalf = async (userId, multiplier, socket = null) => {
    const player = players.get(userId);
    if (!player || player.halfCashedOut || player.fullCashedOut || player.remainingBet <= 0) {
      return false;
    }

    const mult = round2(multiplier);
    const halfStake = round2(player.bet / 2);
    if (halfStake <= 0) return false;
    const payout = round2(halfStake * mult);

    // Mutate synchronously BEFORE async DB credit so concurrent calls can never double-pay
    player.halfCashedOut = true;
    player.halfMultiplier = mult;
    player.halfPayout = payout;
    player.remainingBet = round2(Math.max(0, player.bet - halfStake));
    player.totalPayout = round2(player.totalPayout + payout);

    const targets = autoTargets.get(userId);
    if (targets) targets.half = null;

    try {
      const updatedUser = await creditUser(userId, payout, Math.max(0, payout - halfStake));
      if (updatedUser) {
        recordLiveWin(io, {
          username: player.username,
          userId,
          game: "bigbass",
          multiplier: mult,
          payout,
        });
        io.to(userId).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });
      }

      const evt = {
        userId,
        type: "half",
        multiplier: mult,
        payout,
        remainingBet: player.remainingBet,
      };
      if (socket) socket.emit("bigbass:cashoutSuccess", evt);
      else io.to(userId).emit("bigbass:cashoutSuccess", evt);

      broadcastState();
      return true;
    } catch (err) {
      console.error("[bigBassCrash] cashOutHalf error:", err);
      return false;
    }
  };

  const cashOutFull = async (userId, multiplier, socket = null) => {
    const player = players.get(userId);
    if (!player || player.fullCashedOut || player.remainingBet <= 0) {
      return false;
    }

    const mult = round2(multiplier);
    const stake = player.remainingBet;
    const payout = round2(stake * mult);

    // Mutate synchronously BEFORE async DB credit so concurrent calls can never double-pay
    player.fullCashedOut = true;
    player.fullMultiplier = mult;
    player.remainingBet = 0;
    player.totalPayout = round2(player.totalPayout + payout);
    autoTargets.delete(userId);

    try {
      const updatedUser = await creditUser(userId, payout, Math.max(0, payout - stake));
      if (mult >= 2 && player.bet >= 50) {
        trackMission(io, userId, "crash_2x");
      }
      if (updatedUser) {
        recordLiveWin(io, {
          username: player.username,
          userId,
          game: "bigbass",
          multiplier: mult,
          payout,
        });
        io.to(userId).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });
      }

      const evt = {
        userId,
        type: player.halfCashedOut ? "remaining" : "full",
        multiplier: mult,
        payout,
        totalPayout: player.totalPayout,
        remainingBet: 0,
      };
      if (socket) socket.emit("bigbass:cashoutSuccess", evt);
      else io.to(userId).emit("bigbass:cashoutSuccess", evt);

      broadcastState();
      return true;
    } catch (err) {
      console.error("[bigBassCrash] cashOutFull error:", err);
      return false;
    }
  };

  const prepareBettingRound = () => {
    roundId += 1;
    phase = "betting";
    gameStartTime = null;
    lastReveal = null;
    players = new Map();
    autoTargets = new Map();

    serverSeed = crypto.randomBytes(32).toString("hex");
    seedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
    const digest = crypto.createHash("sha256").update(`bigbass:${serverSeed}`).digest("hex");
    const h = parseInt(digest.slice(0, 8), 16);
    crashPoint = crashPointFromRandom(h);

    phaseEndsAt = Date.now() + bettingWindowMs;
    broadcastState();
    activeTimeout = setTimeout(runRound, bettingWindowMs);
  };

  const runRound = () => {
    phase = "running";
    gameStartTime = Date.now();
    phaseEndsAt = 0;
    broadcastState();

    let lastSyncEmit = gameStartTime;

    activeInterval = setInterval(() => {
      const currentMult = calculateMultiplier();

      if (currentMult < crashPoint) {
        for (const [uid, targets] of autoTargets.entries()) {
          const p = players.get(uid);
          if (!p || p.fullCashedOut) continue;

          if (targets.half && !p.halfCashedOut && currentMult >= targets.half) {
            const halfTarget = targets.half;
            targets.half = null;
            cashOutHalf(uid, halfTarget).catch(() => {});
          }
          if (targets.full && currentMult >= targets.full) {
            const fullTarget = targets.full;
            autoTargets.delete(uid);
            cashOutFull(uid, fullTarget).catch(() => {});
          }
        }

        const now = Date.now();
        if (now - lastSyncEmit >= CLIENT_SYNC_INTERVAL_MS) {
          lastSyncEmit = now;
          io.emit("bigbass:tick", {
            roundId,
            elapsedMs: Math.max(0, now - gameStartTime),
            multiplier: round2(currentMult),
          });
        }
      } else {
        // Last-chance server-side auto-cashout if target was strictly below crashPoint
        for (const [uid, targets] of autoTargets.entries()) {
          const p = players.get(uid);
          if (!p || p.fullCashedOut) continue;

          if (targets.half && !p.halfCashedOut && targets.half < crashPoint) {
            const halfTarget = targets.half;
            targets.half = null;
            cashOutHalf(uid, halfTarget).catch(() => {});
          }
          if (targets.full && targets.full < crashPoint) {
            const fullTarget = targets.full;
            autoTargets.delete(uid);
            cashOutFull(uid, fullTarget).catch(() => {});
          }
        }

        clearInterval(activeInterval);
        activeInterval = null;

        phase = "crashed";
        lastReveal = { serverSeed, hash: seedHash, crashPoint };
        history.unshift(crashPoint);
        if (history.length > HISTORY_SIZE) history.pop();

        phaseEndsAt = Date.now() + revealPauseMs;
        broadcastState();

        activeTimeout = setTimeout(prepareBettingRound, revealPauseMs);
      }
    }, 80);
  };

  io.on("connection", (socket) => {
    socket.emit("bigbass:state", buildPublicState());

    socket.on("bigbass:requestSync", () => {
      if (socket.isRateLimited && socket.isRateLimited()) return;
      socket.emit("bigbass:state", buildPublicState());
    });

    socket.on("bigbass:bet", async (payload, ack) => {
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
      const rawAuto = payload && typeof payload === "object" ? payload.autoCashout : null;
      const rawAuto50 = payload && typeof payload === "object" ? payload.autoCashout50 : null;

      const bet = Number(rawBet);
      if (!Number.isFinite(bet) || !Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET) {
        return reply({ ok: false, message: "Invalid bet amount" });
      }

      let autoFull = Number(rawAuto);
      if (!Number.isFinite(autoFull) || autoFull < 1.01 || autoFull > 1000) autoFull = null;

      let autoHalf = Number(rawAuto50);
      if (!Number.isFinite(autoHalf) || autoHalf < 1.01 || autoHalf > 1000) autoHalf = null;
      if (autoHalf && autoFull && autoHalf >= autoFull) autoHalf = null;

      if (pendingBets.has(userId) || players.has(userId)) {
        return reply({ ok: false, message: "You already joined this round" });
      }

      pendingBets.add(userId);
      try {
        if (phase !== "betting") {
          return reply({ ok: false, message: "Wait for next round" });
        }
        const updatedUser = await chargeUser(userId, bet, { xpMultiplier: 3 });
        if (!updatedUser) {
          return reply({ ok: false, message: "Insufficient balance" });
        }

        players.set(userId, {
          userId,
          username: updatedUser.username,
          profilePicture: updatedUser.profilePicture || "",
          level: updatedUser.level || 0,
          bet,
          remainingBet: bet,
          halfCashedOut: false,
          halfMultiplier: null,
          halfPayout: 0,
          fullCashedOut: false,
          fullMultiplier: null,
          totalPayout: 0,
        });

        const forcedCap = round2((MAX_PROFIT + bet) / bet);
        autoTargets.set(userId, {
          full: autoFull ? Math.min(autoFull, forcedCap) : forcedCap,
          half: autoHalf ? Math.min(autoHalf, forcedCap) : null,
        });

        trackMission(io, userId, "bet_total", bet);

        io.to(userId).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });

        broadcastState();
        reply({ ok: true, walletBalance: updatedUser.walletBalance });
      } catch (err) {
        console.error("[bigBassCrash] bet error:", err);
        reply({ ok: false, message: "Server error" });
      } finally {
        pendingBets.delete(userId);
      }
    });

    socket.on("bigbass:cashout50", async (ack) => {
      const reply = (res) => {
        if (typeof ack === "function") ack(res);
      };
      if (socket.isRateLimited && socket.isRateLimited()) {
        return reply({ ok: false, message: "Too many game actions, please slow down" });
      }
      const userId = socket.userId ? socket.userId.toString() : null;
      if (!userId || phase !== "running" || !gameStartTime) {
        return reply({ ok: false, message: "No active game" });
      }

      const mult = calculateMultiplier();
      if (mult <= 1.0 || mult >= crashPoint) {
        return reply({ ok: false, message: "Too late" });
      }

      const ok = await cashOutHalf(userId, mult, socket);
      reply({ ok });
    });

    socket.on("bigbass:cashout", async (ack) => {
      const reply = (res) => {
        if (typeof ack === "function") ack(res);
      };
      if (socket.isRateLimited && socket.isRateLimited()) {
        return reply({ ok: false, message: "Too many game actions, please slow down" });
      }
      const userId = socket.userId ? socket.userId.toString() : null;
      if (!userId || phase !== "running" || !gameStartTime) {
        return reply({ ok: false, message: "No active game" });
      }

      const mult = calculateMultiplier();
      if (mult <= 1.0 || mult >= crashPoint) {
        return reply({ ok: false, message: "Too late" });
      }

      const ok = await cashOutFull(userId, mult, socket);
      reply({ ok });
    });
  });

  prepareBettingRound();

  return {
    stop: () => {
      if (activeTimeout) clearTimeout(activeTimeout);
      if (activeInterval) clearInterval(activeInterval);
    },
    getPublicState: buildPublicState,
    // exposed for unit tests
    _test: {
      forceRun: (forcedCrashPoint = 5.0) => {
        if (activeTimeout) clearTimeout(activeTimeout);
        if (activeInterval) clearInterval(activeInterval);
        crashPoint = forcedCrashPoint;
        phase = "running";
        gameStartTime = Date.now() - 12000; // ~2.05x
      },
      addPlayer: (p) => players.set(p.userId, p),
      cashOutHalf,
      cashOutFull,
    },
  };
};

module.exports = bigBassCrashGame;

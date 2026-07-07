const crypto = require("crypto");
const { chargeUser, creditUser } = require("../utils/economy");
const { multiplierAt, crashPointFromRandom } = require("../utils/crashMath");
const { trackMission } = require("../utils/missions");

const HISTORY_SIZE = 20;

const freshState = () => ({
  gameBets: {},
  gamePlayers: {},
  crashPoint: 1.0,
  gameStartTime: null,
});

// what clients are allowed to see. NEVER include crashPoint: anyone with
// devtools open on the websocket would know where the round ends before
// betting. Auto-cashout targets are each player's own strategy, so they
// stay server-side too.
const publicView = (state) => ({
  gameBets: state.gameBets,
  gamePlayers: state.gamePlayers,
  gameStartTime: state.gameStartTime,
});

const crashGame = (io) => {
  let gameState = freshState();
  // bets are only accepted in the window between rounds
  let bettingOpen = true;
  // auto-cashout targets per user for the current round
  let autoCashouts = {};
  // provably fair: the crash point is derived from a server seed whose hash
  // is published BEFORE bets open, and the seed is revealed after the round
  let serverSeed = null;
  let seedHash = null;
  // last N crash points, sent to everyone (and to new connections)
  const history = [];

  const prepareRound = () => {
    serverSeed = crypto.randomBytes(32).toString("hex");
    seedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
    // first 8 hex chars of the seed's own hash -> 32-bit int -> crash point
    const digest = crypto.createHash("sha256").update(`crash:${serverSeed}`).digest("hex");
    const h = parseInt(digest.slice(0, 8), 16);
    gameState.crashPoint = crashPointFromRandom(h);
    io.emit("crash:hash", seedHash);
  };

  io.on("connection", (socket) => {
    // late joiners get the current history and round hash right away
    socket.emit("crash:history", history);
    if (seedHash) socket.emit("crash:hash", seedHash);

    socket.on("crash:bet", async (payload, maybeAuto) => {
      try {
        const userId = socket.userId;
        if (!userId) return; // unauthenticated sockets can't bet
        if (!bettingOpen) return; // round already running

        // accept both the legacy number payload and { bet, autoCashout }
        let bet = payload;
        let autoCashout = maybeAuto;
        if (payload && typeof payload === "object") {
          bet = payload.bet;
          autoCashout = payload.autoCashout;
        }

        if (isNaN(bet) || bet < 1 || bet > 1000000) {
          return;
        }

        autoCashout = Number(autoCashout);
        if (isNaN(autoCashout) || autoCashout < 1.01 || autoCashout > 1000) {
          autoCashout = null;
        }

        // one bet per round
        if (gameState.gameBets.hasOwnProperty(userId)) {
          return;
        }

        // atomically take the stake from the real balance (crash grants no xp)
        const updatedUser = await chargeUser(userId, bet, { awardXp: false });
        if (!updatedUser) {
          return; // insufficient funds
        }

        gameState.gameBets[userId] = bet;
        gameState.gamePlayers[userId] = {
          _id: updatedUser._id,
          username: updatedUser.username,
          profilePicture: updatedUser.profilePicture,
          level: updatedUser.level,
          fixedItem: updatedUser.fixedItem,
          payout: null,
        };
        if (autoCashout) autoCashouts[userId] = autoCashout;

        trackMission(io, userId, "bet_total", bet);

        io.to(userId.toString()).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });

        io.emit("crash:gameState", publicView(gameState));
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("crash:cashout", async (callback) => {
      try {
        const userId = socket.userId;
        const player = userId && gameState.gamePlayers[userId];

        // must have an active, not-yet-cashed-out bet
        if (!userId || !player || player.payout != null) {
          if (typeof callback === "function") callback();
          return;
        }

        const multiplier = calculateMultiplier();
        if (multiplier < gameState.crashPoint) {
          await cashOutPlayer(userId, multiplier, socket);
        }

        if (typeof callback === "function") callback();
      } catch (err) {
        console.log(err);
        if (typeof callback === "function") callback();
      }
    });
  });

  // pays a player out at `multiplier` and broadcasts the update. Guarded by
  // the payout==null check so a player can only be paid once per round.
  const cashOutPlayer = async (userId, multiplier, socket = null) => {
    const player = gameState.gamePlayers[userId];
    if (!player || player.payout != null) return;

    const betAmount = gameState.gameBets[userId];
    const payout = betAmount * multiplier;

    // mark as paid BEFORE the async credit so the auto-cashout loop can't
    // double-pay while the DB write is in flight
    player.payout = multiplier;

    const updatedUser = await creditUser(userId, payout, payout - betAmount);

    if (multiplier >= 2) {
      trackMission(io, userId, "crash_2x");
    }

    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: updatedUser.walletBalance,
      xp: updatedUser.xp,
      level: updatedUser.level,
    });

    io.emit("crash:gameState", publicView(gameState));

    const cashoutEvent = { userId, payout, multiplier };
    if (socket) {
      socket.emit("crash:cashoutSuccess", cashoutEvent);
    } else {
      // auto-cashout: notify through the user's private room
      io.to(userId.toString()).emit("crash:cashoutSuccess", cashoutEvent);
    }
  };

  const calculateMultiplier = () => {
    if (!gameState.gameStartTime) return 1.0; // no round running

    const timeElapsed = (Date.now() - gameState.gameStartTime) / 1000; // seconds
    return multiplierAt(timeElapsed, gameState.crashPoint);
  };

  const runRound = () => {
    bettingOpen = false;
    io.emit("crash:start");

    gameState.gameStartTime = Date.now();

    const multiplierInterval = setInterval(async () => {
      const currentMultiplier = calculateMultiplier();

      // server-side auto-cashout: fires even if the player's tab lags
      if (currentMultiplier < gameState.crashPoint) {
        for (const userId of Object.keys(autoCashouts)) {
          const target = autoCashouts[userId];
          const player = gameState.gamePlayers[userId];
          if (player && player.payout == null && currentMultiplier >= target) {
            delete autoCashouts[userId];
            cashOutPlayer(userId, target).catch((err) => console.log(err));
          }
        }
      }

      if (currentMultiplier >= gameState.crashPoint) {
        // last chance for auto-cashouts: a single 80ms tick can jump past a
        // player's target AND the crash point at once. If the target was
        // strictly below the crash point, the player earned that payout.
        for (const userId of Object.keys(autoCashouts)) {
          const target = autoCashouts[userId];
          const player = gameState.gamePlayers[userId];
          if (player && player.payout == null && target < gameState.crashPoint) {
            delete autoCashouts[userId];
            cashOutPlayer(userId, target).catch((err) => console.log(err));
          }
        }

        clearInterval(multiplierInterval);
        io.emit("crash:result", gameState.crashPoint);
        // reveal the seed so anyone can verify hash + crash point
        io.emit("crash:reveal", { serverSeed, crashPoint: gameState.crashPoint });

        history.unshift(gameState.crashPoint);
        if (history.length > HISTORY_SIZE) history.pop();
        io.emit("crash:history", history);

        // reset and reopen betting for the next round
        gameState = freshState();
        autoCashouts = {};
        bettingOpen = true;
        prepareRound();
        io.emit("crash:gameState", publicView(gameState));

        setTimeout(runRound, 12000); // betting window before the next round
      } else {
        io.emit("crash:multiplier", currentMultiplier);
      }
    }, 80);
  };

  // open an initial betting window, then start the first round
  prepareRound();
  setTimeout(runRound, 12000);
};

module.exports = crashGame;

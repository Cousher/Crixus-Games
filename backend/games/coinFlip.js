const crypto = require("crypto");
const { chargeUser, creditUser } = require("../utils/economy");
const { trackMission } = require("../utils/missions");

// winners are paid 1.95x (5% edge): fichas need a sink so the economy keeps
// its scarcity — a 0% edge game slowly devalues every item and balance.
const PAYOUT_MULTIPLIER = 1.95;

const freshState = () => ({
  heads: { players: {}, bets: {} },
  tails: { players: {}, bets: {} },
});

const coinFlip = (io) => {
  let gameState = freshState();
  // bets are only accepted in the window between flips
  let bettingOpen = true;

  io.on("connection", (socket) => {
    socket.on("coinFlip:bet", async (bet, choice) => {
      try {
        const userId = socket.userId;
        if (!userId) return; // unauthenticated sockets can't bet
        if (!bettingOpen) return;

        if (choice !== 0 && choice !== 1) return;
        if (isNaN(bet) || bet < 1 || bet > 1000000) return;

        const side = choice === 0 ? "heads" : "tails";
        const other = choice === 0 ? "tails" : "heads";

        // one bet per round, on a single side
        if (gameState[side].bets[userId] || gameState[other].bets[userId]) {
          return;
        }

        // atomically take the stake from the real balance
        const updatedUser = await chargeUser(userId, bet);
        if (!updatedUser) return; // insufficient funds

        trackMission(io, userId, "bet_total", bet);

        gameState[side].bets[userId] = bet;
        gameState[side].players[userId] = {
          _id: updatedUser._id,
          username: updatedUser.username,
          profilePicture: updatedUser.profilePicture,
          level: updatedUser.level,
          fixedItem: updatedUser.fixedItem,
        };

        io.to(userId.toString()).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });

        io.emit("coinFlip:gameState", gameState);
      } catch (err) {
        console.log(err);
      }
    });
  });

  const calculatePayout = async (result) => {
    const winningSide = result === 0 ? "heads" : "tails";

    for (const userId in gameState[winningSide].bets) {
      try {
        const betAmount = gameState[winningSide].bets[userId];
        const updatedUser = await creditUser(
          userId,
          betAmount * PAYOUT_MULTIPLIER,
          betAmount * (PAYOUT_MULTIPLIER - 1)
        );

        trackMission(io, userId, "coinflip_win");

        io.to(userId.toString()).emit("userDataUpdated", {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        });
      } catch (err) {
        console.log(err);
      }
    }
  };

  const runRound = async () => {
    bettingOpen = false;
    io.emit("coinFlip:start");

    const result = crypto.randomInt(0, 2);

    setTimeout(async () => {
      io.emit("coinFlip:result", result);

      await calculatePayout(result);

      gameState = freshState();
      io.emit("coinFlip:gameState", gameState);
      bettingOpen = true;

      setTimeout(runRound, 10000); // betting window before the next flip
    }, 5000);
  };

  // open an initial betting window, then start the first flip
  setTimeout(runRound, 10000);
};

module.exports = coinFlip;

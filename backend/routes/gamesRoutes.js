const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");
const { gamesLimiter } = require("../middleware/rateLimits");

const User = require("../models/User");
const Case = require("../models/Case");
const upgradeItems = require("../games/upgrade");
const SlotGameController = require("../games/slot");
const { calculateLevelFromXp } = require("../utils/economy");
const { processReferralLevelProgress } = require("../utils/referrals");
const { getWinningItem, addUniqueInfoToItem } = require("../utils/caseOpening");
const { trackMission } = require("../utils/missions");
const mines = require("../games/mines");
const road = require("../games/road");
const duel = require("../games/duel");
const { getRecentWins, recordLiveWin } = require("../utils/liveFeed");

// Exports
module.exports = (io) => {
  // Routes
  router.post("/openCase/:id", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const quantityToOpen = req.body.quantity;
      const winningItems = [];

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ message: "Case not found" });
      }

      const caseData = await Case.findById(id).populate("items");


      if (!caseData || !user) {
        if (!caseData) {
          return res.status(404).json({ message: "Case not found" });
        } else {
          return res.status(404).json({ message: "User not found" });
        }
      }

      if (!Number.isInteger(quantityToOpen)) {
        return res.status(400).json({ message: "Quantity to open must be an integer" });
      }

      if (quantityToOpen > 5) {
        return res.status(400).json({ message: "You can only open up to 5 cases at a time" });
      }

      if (quantityToOpen < 1) {
        return res.status(400).json({ message: "You need to open at least 1 case" });
      }

      const cost = caseData.price * quantityToOpen;

      for (let i = 0; i < quantityToOpen; i++) {
        const winningItem = getWinningItem(caseData);
        const itemWithUniqueId = addUniqueInfoToItem(winningItem);
        winningItems.push(itemWithUniqueId);
      }

      // atomically charge the cost and add the items only if the balance covers it
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, walletBalance: { $gte: cost } },
        {
          $inc: { walletBalance: -cost, xp: cost * 5 },
          $push: { inventory: { $each: winningItems } },
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      trackMission(io, user._id, "bet_total", cost);
      trackMission(io, user._id, "case_open", quantityToOpen);

      const newLevel = calculateLevelFromXp(updatedUser.xp);
      if (newLevel > updatedUser.level) {
        updatedUser.level = newLevel;
        await User.updateOne({ _id: user._id, level: { $lt: newLevel } }, { $set: { level: newLevel } });
        processReferralLevelProgress(user._id, newLevel, io).catch(() => {});
      }

      const winnerUser = {
        name: user.username,
        id: user._id,
        profilePicture: user.profilePicture
      }

      // Emit the caseOpened event + record rare drops (R3+) in the live win ticker
      io.emit("caseOpened", {
        winningItems: winningItems,
        user: winnerUser,
        caseImage: caseData.image,
      });

      for (const dropped of winningItems) {
        if (Number(dropped.rarity) >= 3) {
          recordLiveWin(io, {
            username: user.username,
            userId: user._id,
            game: "case",
            payout: caseData.price,
            itemName: dropped.name,
            itemRarity: dropped.rarity,
          });
        }
      }

      res.json({ items: winningItems });

      const userDataPayload = {
        walletBalance: updatedUser.walletBalance,
        xp: updatedUser.xp,
        level: updatedUser.level,
      }
      io.to(user._id.toString()).emit('userDataUpdated', userDataPayload);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upgrade items
  router.post("/upgrade", isAuthenticated, gamesLimiter, async (req, res) => {
    const { selectedItemIds, targetItemId } = req.body;
    const user = req.user._id;


    const result = await upgradeItems(user, selectedItemIds, targetItemId);
    if (result.status === 200) {
      trackMission(io, user, "upgrade_try");
    }
    res.status(result.status).json(result);
  });

  // Spin the slot machine
  router.post('/slots', isAuthenticated, gamesLimiter, async (req, res) => {
    const user = req.user;

    try {
      const { betAmount } = req.body;

      const result = await SlotGameController.spin(user._id, betAmount, io);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });


  // -------------------------------------------------------------------------
  // Mines (5x5 grid, 1% edge, provably fair — see games/mines.js)
  // -------------------------------------------------------------------------
  router.get("/mines/active", isAuthenticated, async (req, res) => {
    try {
      const result = await mines.activeGame(req.user._id);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/mines/start", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const { betAmount, minesCount } = req.body;
      const result = await mines.start(req.user._id, betAmount, minesCount, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/mines/reveal", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const { tileIndex } = req.body;
      const result = await mines.reveal(req.user._id, tileIndex, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/mines/cashout", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const result = await mines.cashout(req.user._id, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // -------------------------------------------------------------------------
  // Gladiator Road (Crixus Chicken Road, 2% edge, provably fair — games/road.js)
  // -------------------------------------------------------------------------
  router.get("/road/active", isAuthenticated, async (req, res) => {
    try {
      const result = await road.activeGame(req.user._id);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/road/start", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const { betAmount, difficulty } = req.body;
      const result = await road.start(req.user._id, betAmount, difficulty, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/road/step", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const result = await road.step(req.user._id, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/road/cashout", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const result = await road.cashout(req.user._id, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // -------------------------------------------------------------------------
  // Live Win Feed (recent big wins across all games)
  // -------------------------------------------------------------------------
  router.get("/live-feed", (req, res) => {
    res.json({ wins: getRecentWins(20) });
  });

  // -------------------------------------------------------------------------
  // 1v1 Private Arena Duels (shareable via WhatsApp link)
  // -------------------------------------------------------------------------
  router.get("/duel/mine", isAuthenticated, async (req, res) => {
    try {
      const result = await duel.listMyDuels(req.user._id);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/duel/:code", async (req, res) => {
    try {
      const result = await duel.getDuel(req.params.code);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/duel/create", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const { betAmount, side } = req.body;
      const result = await duel.createDuel(req.user._id, betAmount, side, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/duel/:code/join", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const result = await duel.joinDuel(req.user._id, req.params.code, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/duel/:code/cancel", isAuthenticated, gamesLimiter, async (req, res) => {
    try {
      const result = await duel.cancelDuel(req.user._id, req.params.code, io);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return router;
};
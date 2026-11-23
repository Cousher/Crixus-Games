const { authLimiter, rewardsLimiter } = require("../middleware/rateLimits");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");

const User = require("../models/User");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");
const getRandomPlaceholderImage = require("../utils/placeholderImages");
const { ObjectId } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { resolvePassword } = require("../utils/password");
const { dayString, ensureDailyMissions } = require("../utils/missions");
const { applyReferralOnSignup } = require("../utils/referrals");
const { getLeagueInfo, getNextWednesdayReset, LEAGUES } = require("../utils/leagues");
const { isValidImageBase64 } = require("../middleware/security");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const USERNAME_REGEX = /^[\p{L}\p{N}_ .-]{3,24}$/u;

const BONUS_COOLDOWN_MINUTES = 15;
const MAX_DAILY_BONUS_CLAIMS = 12;
const MAX_BONUS_AMOUNT = 400;

// Register user
router.post(
  "/register",
  authLimiter,
  [
    check("email", "Please include a valid email").isString().isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isString().isLength({ min: 6, max: 256 }),
    check(
      "username",
      "Username must be 3-24 characters (letters, numbers, spaces, . _ -)"
    ).isString().trim().matches(USERNAME_REGEX),
  ],
  async (req, res) => {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password, profilePicture, referralCode } = req.body;
    const normalizedEmail = String(req.body.email).trim().toLowerCase();
    const cleanUsername = String(req.body.username).trim();

    try {
      // Check if user already exists (case-insensitive)
      const userMail = await User.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") },
      });
      if (userMail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const userName = await User.findOne({
        username: { $regex: new RegExp(`^${escapeRegex(cleanUsername)}$`, "i") },
      });
      if (userName) {
        return res.status(400).json({ message: "Username already registered" });
      }

      const pic = typeof profilePicture === "string" ? profilePicture : "";
      if (pic !== "" && !isValidImageBase64(pic)) {
        return res.status(400).json({ message: "Invalid profile picture" });
      }

      // Create new user. accept the password as plain text; for backwards
      // compatibility, decrypt a legacy AES-wrapped value if detected.
      const originalPassword = resolvePassword(password);
      const user = new User({
        email: normalizedEmail,
        username: cleanUsername,
        profilePicture: pic || getRandomPlaceholderImage(),
        isAdmin: false,
      });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(originalPassword, salt);

      // Save user to the database
      await user.save();

      // Link referral (if valid & passes anti-smurf shield); non-fatal
      await applyReferralOnSignup(user, referralCode, req.ip);

      // Generate and send JWT
      const payload = { userId: user.id };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "30d", algorithm: "HS256" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Login user
router.post(
  "/login",
  authLimiter,
  [
    check("email", "Please include a valid email").isString().isEmail(),
    check("password", "Password is required").isString().notEmpty(),
  ],
  async (req, res) => {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const normalizedEmail = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;

    try {
      // Check if user exists (case-insensitive to remain compatible with legacy emails)
      const user = await User.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") },
      });
      if (!user) {
        return res.status(400).json({ message: "Email not found" });
      }

      // accounts created via Google sign-in have no password set
      if (!user.password) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Compare passwords (plain text, decrypting legacy AES-wrapped values)
      const originalPassword = resolvePassword(password);

      const isMatch = await bcrypt.compare(originalPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Generate and send JWT
      const payload = { userId: user.id };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "30d", algorithm: "HS256" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Google login
router.post('/googlelogin', authLimiter, async (req, res) => {
  const { token, referralCode } = req.body;
  if (typeof token !== "string" || token.length < 10) {
    return res.status(400).json({ message: 'Error in Google Authentication' });
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const googlePayload = ticket.getPayload();
    if (!googlePayload || !googlePayload.email || googlePayload.email_verified !== true) {
      return res.status(400).json({ message: 'Google email is not verified' });
    }

    const normalizedEmail = String(googlePayload.email).trim().toLowerCase();

    // Check if user exists in your DB or create a new one
    let user = await User.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i") },
    });

    if (user) {
      // Prevent pre-hijacking: if an unverified password account already claimed
      // this email without Google linkage, require password login instead of
      // silently merging an attacker-controlled password with Google OAuth.
      if (user.password && (!user.googleId || user.googleId !== googlePayload.sub)) {
        return res.status(400).json({
          message: "This email is registered with a password. Please sign in with your password.",
        });
      }
      if (!user.googleId && googlePayload.sub) {
        user.googleId = googlePayload.sub;
        await user.save();
      }
    } else {
      const baseName = String(googlePayload.name || "Gladiator")
        .replace(/[^\p{L}\p{N}_ .-]/gu, "")
        .trim()
        .slice(0, 18) || "Gladiator";
      let username = baseName.length >= 3 ? baseName : `Gladiator${Math.floor(Math.random() * 1000)}`;
      let existingUser = await User.findOne({
        username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") },
      });
      while (existingUser) {
        username = `${baseName.slice(0, 16)}${Math.floor(100 + Math.random() * 900)}`;
        existingUser = await User.findOne({
          username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") },
        });
      }
      user = new User({
        googleId: googlePayload.sub || "",
        email: normalizedEmail,
        username: username,
        profilePicture: googlePayload.picture || getRandomPlaceholderImage(),
      });
      await user.save();
      await applyReferralOnSignup(user, referralCode, req.ip);
    }

    // Generate and send JWT
    const payload = { userId: user.id };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "30d", algorithm: "HS256" },
      (err, signedToken) => {
        if (err) throw err;
        res.json({ token: signedToken });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error in Google Authentication' });
  }
});

// Get notifications
router.get("/notifications", authMiddleware.isAuthenticated, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const notifications = await Notification.find({ receiverId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json(notifications);

    // set all notifications as read
    await Notification.updateMany({ receiverId: req.user._id, read: false }, { read: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get logged-in user data
router.get("/me", authMiddleware.isAuthenticated, async (req, res) => {
  try {
    // Ensure today's daily missions are rolled as soon as the player logs in
    ensureDailyMissions(req.user._id).catch(() => {});

    const {
      _id: id,
      username,
      profilePicture,
      xp,
      level,
      walletBalance,
      nextBonus,
      league,
    } = req.user;

    // verify in Notification model if there are unread notifications for the user
    const unreadNotifications = await Notification.find({ receiverId: req.user._id, read: false });
    const hasUnreadNotifications = unreadNotifications.length > 0;

    res.json({
      id,
      username,
      profilePicture,
      xp,
      level,
      walletBalance,
      nextBonus,
      league: league || "bronze",
      hasUnreadNotifications,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Fetch top players
router.get('/topPlayers', async (req, res) => {
  try {
    const topPlayers = await User.find({})
      .sort({ weeklyWinnings: -1 })
      .limit(10) // Top 10 players
      .select('username weeklyWinnings profilePicture level fixedItem league');

    res.json(topPlayers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch private Friends Leaderboard ("Tu Coliseo")
router.get('/friendsLeaderboard', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const friendIds = Array.isArray(req.user.friends) ? req.user.friends : [];
    const ids = [req.user._id, ...friendIds];
    const players = await User.find({ _id: { $in: ids } })
      .sort({ weeklyWinnings: -1, _id: 1 })
      .limit(30)
      .select('username weeklyWinnings profilePicture level fixedItem league');

    res.json({
      players,
      friendsCount: friendIds.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch Weekly League Leaderboard for the logged-in user's current tier
router.get('/leagueLeaderboard', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const myLeagueId = req.user.league || "bronze";
    const leagueInfo = getLeagueInfo(myLeagueId);
    const leagueFilter =
      myLeagueId === "bronze"
        ? { $or: [{ league: "bronze" }, { league: { $exists: false } }, { league: null }] }
        : { league: myLeagueId };

    const players = await User.find(leagueFilter)
      .sort({ weeklyWinnings: -1, _id: 1 })
      .limit(20)
      .select('username weeklyWinnings profilePicture level fixedItem league');

    const myWinnings = req.user.weeklyWinnings || 0;
    const myRank =
      (await User.countDocuments({
        ...leagueFilter,
        $or: [
          { weeklyWinnings: { $gt: myWinnings } },
          { weeklyWinnings: myWinnings, _id: { $lt: req.user._id } },
        ],
      })) + 1;

    res.json({
      league: leagueInfo,
      allLeagues: LEAGUES,
      myRank,
      players,
      nextResetAt: getNextWednesdayReset().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch user ranking (uses indexed count + bounded slice instead of loading all users)
router.get('/ranking', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const myWinnings = req.user.weeklyWinnings || 0;
    const higherCount = await User.countDocuments({
      $or: [
        { weeklyWinnings: { $gt: myWinnings } },
        { weeklyWinnings: myWinnings, _id: { $lt: req.user._id } },
      ],
    });
    const totalUsers = await User.countDocuments({});
    const userIndex = higherCount;

    let start = userIndex - 3;
    let end = userIndex + 4;
    if (start < 0) {
      start = 0;
      end = Math.min(7, totalUsers);
    }
    if (end > totalUsers) {
      end = totalUsers;
      start = Math.max(0, end - 7);
    }

    const surroundingUsers = await User.find({})
      .sort({ weeklyWinnings: -1, _id: 1 })
      .skip(start)
      .limit(Math.max(0, end - start))
      .select('username weeklyWinnings');

    res.json({ ranking: userIndex + 1, users: surroundingUsers });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});



// Update wallet balance
// router.put("/wallet", authMiddleware.isAuthenticated, async (req, res) => {
//   try {
//     const { amount } = req.body;

//     const user = await User.findById(req.user._id);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Update wallet balance
//     user.walletBalance += amount;
//     await user.save();

//     res.json(user.walletBalance);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server error");
//   }
// });

// NOTE: Direct inventory mutation endpoints (POST /inventory, DELETE /inventory/:itemId)
// were removed to prevent arbitrary item injection. Inventory changes happen
// exclusively through server-verified game and marketplace actions.

// Set fixed item
router.put("/fixedItem", authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { item } = req.body;
    if (!item || (typeof item !== "string" && typeof item !== "object")) {
      return res.status(400).json({ message: "Invalid item identifier" });
    }
    const targetId = String(item);

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if item is in user's inventory
    const inventoryItemIndex = user.inventory.find((inventoryItem) => {
      return inventoryItem && inventoryItem._id && inventoryItem._id.toString() === targetId;
    });

    if (!inventoryItemIndex) {
      return res.status(404).json({ message: "Item not found in inventory" });
    }

    // Update fixed item, keeping the same description
    user.fixedItem = {
      name: inventoryItemIndex.name,
      image: inventoryItemIndex.image,
      rarity: inventoryItemIndex.rarity,
      description: user.fixedItem?.description || "",
    };
    await user.save();

    res.json(user.fixedItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// update fixed item description
router.put(
  "/fixedItem/description",
  authMiddleware.isAuthenticated,
  async (req, res) => {
    try {
      const { description } = req.body;
      if (typeof description !== "string") {
        return res.status(400).json({ message: "Invalid description" });
      }

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.fixedItem) {
        return res.status(400).json({ message: "No fixed item selected" });
      }

      // Update fixed item description (crop to 50 characters)
      user.fixedItem.description = description.substring(0, 50);

      await user.save();

      res.json(user.fixedItem);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

router.post('/claimBonus', authMiddleware.isAuthenticated, rewardsLimiter, async (req, res) => {
  try {
    const currentTime = new Date();
    const today = dayString(currentTime);
    const sameDay = req.user.bonusClaimsDate === today;
    const claimsToday = sameDay ? (req.user.bonusClaimsToday || 0) : 0;

    if (claimsToday >= MAX_DAILY_BONUS_CLAIMS) {
      return res.status(400).json({ message: 'Daily bonus limit reached, come back tomorrow' });
    }

    // Cap existing/legacy bonusAmount too (while allowing the initial $500 welcome claim)
    const currentBonus = Math.min(500, Math.max(0, req.user.bonusAmount || 150));
    const nextBonus = new Date(currentTime.getTime() + BONUS_COOLDOWN_MINUTES * 60000);
    const nextBonusAmount = Math.min(
      MAX_BONUS_AMOUNT,
      Math.floor(150 * (1 + 0.05 * Math.min(req.user.level || 0, 35)))
    );

    // Claim atomically: nextBonus + daily counter guards ensure only one concurrent
    // request succeeds and the daily cap can never be bypassed.
    const filter = sameDay
      ? {
          _id: req.user._id,
          nextBonus: { $lte: currentTime },
          bonusClaimsDate: today,
          bonusClaimsToday: { $lt: MAX_DAILY_BONUS_CLAIMS },
        }
      : {
          _id: req.user._id,
          nextBonus: { $lte: currentTime },
          bonusClaimsDate: { $ne: today },
        };

    const update = sameDay
      ? {
          $inc: { walletBalance: currentBonus, bonusClaimsToday: 1 },
          $set: { nextBonus, bonusAmount: nextBonusAmount },
        }
      : {
          $inc: { walletBalance: currentBonus },
          $set: {
            nextBonus,
            bonusAmount: nextBonusAmount,
            bonusClaimsDate: today,
            bonusClaimsToday: 1,
          },
        };

    const updated = await User.findOneAndUpdate(filter, update, { new: true });

    if (!updated) {
      return res.status(400).json({ message: 'Bonus not yet available' });
    }

    res.json({
      message: `Claimed $${currentBonus}!`,
      value: currentBonus,
      nextBonus: updated.nextBonus,
      claimsRemainingToday: Math.max(0, MAX_DAILY_BONUS_CLAIMS - updated.bonusClaimsToday),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



router.put('/profilePicture', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const newProfilePicture = req.body.image;

    if (!isValidImageBase64(newProfilePicture)) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = newProfilePicture;

    await user.save();

    res.json({ message: 'Profile picture updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get user by id (public profile: only non-sensitive fields)
router.get("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(
      await User.findById(req.params.id)
        .select("username profilePicture xp level fixedItem nextBonus weeklyWinnings")
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});


// These routes need to be at the end of the file, otherwise they will override other routes

// Get user inventory
const ITEMS_PER_PAGE = 18;
const ALLOWED_RARITIES = new Set(["1", "2", "3", "4", "5"]);


router.get("/inventory/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, rarity, sortBy, caseId } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    if (!ObjectId.isValid(userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = { _id: user._id };  // Default to filtering by user ID

    // guard optional filters so malformed input can't throw or inject operators
    const caseFilter = typeof caseId === "string" && ObjectId.isValid(caseId) ? new ObjectId(caseId) : null;
    const sanitizedName = typeof name === "string" ? name.trim().slice(0, 64) : "";
    const nameRegex = sanitizedName
      ? new RegExp(sanitizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : null;
    const rarityFilter = typeof rarity === "string" && ALLOWED_RARITIES.has(rarity) ? rarity : null;

    // Count Pipeline
    let countPipeline = [
      { $match: query },
      { $project: { inventory: 1 } },
      { $unwind: "$inventory" }
    ];

    if (caseFilter) {
      countPipeline.push({ $match: { "inventory.case": caseFilter } });
    }

    if (nameRegex) {
      countPipeline.push({ $match: { "inventory.name": nameRegex } });
    }
    if (rarityFilter) {
      countPipeline.push({ $match: { "inventory.rarity": rarityFilter } });
    }

    countPipeline.push({ $count: "totalItems" });

    const totalCount = await User.aggregate(countPipeline);
    const totalItems = totalCount.length ? totalCount[0].totalItems : 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Main Pipeline
    let pipeline = [
      { $match: query },
      { $project: { inventory: 1 } },
      { $unwind: "$inventory" }
    ];

    if (caseFilter) {
      pipeline.push({ $match: { "inventory.case": caseFilter } });
    }

    if (nameRegex) {
      pipeline.push({ $match: { "inventory.name": nameRegex } });
    }
    if (rarityFilter) {
      pipeline.push({ $match: { "inventory.rarity": rarityFilter } });
    }

    if (typeof sortBy === "string") {
      switch (sortBy) {
        case "older":
          pipeline.push({ $sort: { "inventory.createdAt": 1 } });
          break;
        case "newer":
          pipeline.push({ $sort: { "inventory.createdAt": -1 } });
          break;
        case "mostRare":
          pipeline.push({ $sort: { "inventory.rarity": -1 } });
          break;
        case "mostCommon":
          pipeline.push({ $sort: { "inventory.rarity": 1 } });
          break;
        default:
          break;
      }
    }
    pipeline.push(
      { $group: { _id: null, inventory: { $push: "$inventory" } } },
      { $project: { inventory: { $slice: ["$inventory", (page - 1) * ITEMS_PER_PAGE, ITEMS_PER_PAGE] } } }
    );

    const inventoryItems = await User.aggregate(pipeline);

    res.json({
      items: inventoryItems[0]?.inventory || [],
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;


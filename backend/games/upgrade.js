const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Item = require("../models/Item");

// Derived directly from caseOpening.js drop rates (R1: 79.92%, R2: 15.98%,
// R3: 3.20%, R4: 0.64%, R5: 0.26%) with a 10% forge sink (0.90 retention).
// Guarantees EV <= 0.90 for every single-item or multi-item upgrade path.
const RARITY_DROP_WEIGHTS = {
  "1": 0.7992,
  "2": 0.1598,
  "3": 0.032,
  "4": 0.0064,
  "5": 0.0026,
};
const FORGE_RETENTION = 0.9; // 10% item sink

const baseChances = {
  "1": {
    "1": 0.5,
    "2": Number(((RARITY_DROP_WEIGHTS["2"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
    "3": Number(((RARITY_DROP_WEIGHTS["3"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
    "4": Number(((RARITY_DROP_WEIGHTS["4"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
    "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
  },
  "2": {
    "2": 0.5,
    "3": Number(((RARITY_DROP_WEIGHTS["3"] / RARITY_DROP_WEIGHTS["2"]) * FORGE_RETENTION).toFixed(4)),
    "4": Number(((RARITY_DROP_WEIGHTS["4"] / RARITY_DROP_WEIGHTS["2"]) * FORGE_RETENTION).toFixed(4)),
    "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["2"]) * FORGE_RETENTION).toFixed(4)),
  },
  "3": {
    "3": 0.5,
    "4": Number(((RARITY_DROP_WEIGHTS["4"] / RARITY_DROP_WEIGHTS["3"]) * FORGE_RETENTION).toFixed(4)),
    "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["3"]) * FORGE_RETENTION).toFixed(4)),
  },
  "4": {
    "4": 0.5,
    "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["4"]) * FORGE_RETENTION).toFixed(4)),
  },
  "5": {
    "5": 0.5,
  },
};

const rarityCaps = { "1": 0.8, "2": 0.7, "3": 0.6, "4": 0.5, "5": 0.45 };
const diminishingRate = 0.9; // 90% effectiveness for each subsequent item

// success rate uses 1 - product(1 - chance), so each item can only help. the
// per-item contributions are sorted strongest-first before the diminishing
// factor is applied, which makes the result independent of selection order and
// keeps it monotonic (adding an item never lowers the rate).
const calculateSuccessRate = (selectedItems, targetRarity) => {
  const contributions = selectedItems
    .map((item) => {
      return (baseChances[String(item.rarity)] || {})[String(targetRarity)] || 0;
    })
    .sort((a, b) => b - a);

  let failChance = 1;
  contributions.forEach((chance, index) => {
    failChance *= 1 - chance * Math.pow(diminishingRate, index);
  });

  const successRate = 1 - failChance;
  const cap = rarityCaps[String(targetRarity)] !== undefined ? rarityCaps[String(targetRarity)] : 0.8;
  return Math.min(successRate, cap);
};

// Helper function to validate if all items belong to the same case
const allItemsFromSameCase = (items) => {
  const caseId = items[0].case;
  if (!caseId) return false;
  return items.every((item) => item.case && item.case.toString() === caseId.toString());
};

const verifyLesserRarity = (selectedItems, targetItem) => {
  for (const item of selectedItems) {
    if (Number(item.rarity) > Number(targetItem.rarity)) {
      return false;
    }
  }
  return true;
}

const upgradeItems = async (userId, selectedItemIds, targetItemId) => {
  try {
    if (!Array.isArray(selectedItemIds)) {
      return { status: 400, message: "No items selected" };
    }

    const uniqueSelectedIds = [
      ...new Set(
        selectedItemIds.filter((id) => typeof id === "string" && id.trim().length > 0)
      ),
    ];

    if (uniqueSelectedIds.length === 0) {
      return { status: 400, message: "No items selected" };
    }

    if (uniqueSelectedIds.length > 20) {
      return { status: 400, message: "You can select up to 20 items at a time" };
    }

    if (!targetItemId || typeof targetItemId !== "string" || !mongoose.Types.ObjectId.isValid(targetItemId)) {
      return { status: 400, message: "No target item selected" };
    }


    // Fetch the user
    const user = await User.findById(userId);
    if (!user) {
      return { status: 404, message: "User not found" };
    }

    // Fetch the selected items and target item
    const selectedItems = user.inventory.filter((invItem) =>
      uniqueSelectedIds.includes(invItem.uniqueId)
    );
    const targetItem = await Item.findById(targetItemId);

    // Validation checks
    if (!targetItem) {
      return { status: 400, message: "No target item selected" };
    }

    if (selectedItems.length !== uniqueSelectedIds.length) {
      return { status: 400, message: "Items no longer available" };
    }

    // backfill case for items that lost it (e.g. bought before case was preserved)
    for (const item of selectedItems) {
      if (!item.case) {
        const sourceItem = await Item.findById(item._id);
        if (sourceItem) item.case = sourceItem.case;
      }
    }

    if (!allItemsFromSameCase([...selectedItems, targetItem])) {
      return { status: 400, message: "All items must be from the same case" };
    }

    if (!verifyLesserRarity(selectedItems, targetItem)) {
      return { status: 400, message: "You can't upgrade to a lesser rarity" };
    }

    // atomically consume the selected items only if ALL of them are still present;
    // this prevents partial consumption or double-spending on concurrent requests
    const before = await User.findOneAndUpdate(
      { _id: userId, "inventory.uniqueId": { $all: uniqueSelectedIds } },
      { $pull: { inventory: { uniqueId: { $in: uniqueSelectedIds } } } }
    );
    if (!before) {
      return { status: 400, message: "Items no longer available" };
    }


    // Calculate the success rate and attempt the upgrade
    const successRate = calculateSuccessRate(selectedItems, targetItem.rarity);
    // crypto RNG: 2^32-grained uniform in [0, 1)
    const isSuccess = crypto.randomInt(0, 2 ** 32) / 2 ** 32 < successRate;

    if (isSuccess) {
      // Add the target item to the user's inventory
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            inventory: {
              _id: targetItem._id,
              name: targetItem.name,
              image: targetItem.image,
              rarity: targetItem.rarity,
              case: targetItem.case,
              createdAt: new Date(),
              uniqueId: require("crypto").randomUUID(),
            },
          },
        }
      );
    }

    return { status: 200, success: isSuccess, item: isSuccess ? targetItem : null };
  } catch (error) {
    console.error(error);
    return { status: 500, message: "Internal server error" };
  }
};

module.exports = upgradeItems;
// exposed for unit testing
module.exports.calculateSuccessRate = calculateSuccessRate;
module.exports.baseChances = baseChances;

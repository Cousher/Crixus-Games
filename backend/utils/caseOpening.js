const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// cryptographically secure float in [0, 1) - Math.random() is predictable
const secureRandom = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;
const secureIndex = (length) => crypto.randomInt(0, length);

// drop-rate weights per rarity
const Rarities = [
  { id: "1", chance: 0.7992 },
  { id: "2", chance: 0.1598 },
  { id: "3", chance: 0.032 },
  { id: "4", chance: 0.0064 },
  { id: "5", chance: 0.0026 },
];

function groupItemsByRarity(items) {
  const itemsByRarity = {};
  items.forEach((item) => {
    if (!itemsByRarity[item.rarity]) {
      itemsByRarity[item.rarity] = [];
    }
    itemsByRarity[item.rarity].push(item);
  });
  return itemsByRarity;
}

function getRandomWeightedItem(items, weightPropertyName) {
  const randomNumber = secureRandom();
  let cumulativeWeight = 0;
  for (const item of items) {
    cumulativeWeight += item[weightPropertyName];
    if (randomNumber <= cumulativeWeight) {
      return item;
    }
  }
  return items[items.length - 1];
}

function getRandomItemFromRarity(itemsByRarity, rarity) {
  const items = itemsByRarity[rarity];
  if (!items || items.length === 0) {
    return null;
  }
  return items[secureIndex(items.length)];
}

const getWinningItem = (caseData) => {
  const itemsByRarity = groupItemsByRarity(caseData.items);
  const winningRarity = getRandomWeightedItem(Rarities, "chance");
  let winningItem = getRandomItemFromRarity(itemsByRarity, winningRarity.id);

  if (!winningItem) {
    const existingRarities = Object.keys(itemsByRarity);
    const randomExistingRarity = existingRarities[secureIndex(existingRarities.length)];
    winningItem = getRandomItemFromRarity(itemsByRarity, randomExistingRarity);
  }
  return winningItem;
};

const addUniqueInfoToItem = (item) => {
  return {
    _id: item._id,
    name: item.name,
    image: item.image,
    rarity: item.rarity,
    case: item.case,
    uniqueId: uuidv4(),
  };
};

module.exports = {
  Rarities,
  getWinningItem,
  addUniqueInfoToItem,
};

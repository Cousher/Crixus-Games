const {
  calculateLevelFromXp,
  calculateXPForLevel,
  xpDeltaForLevel,
} = require("../../utils/economy");
const { pendingLevelReward } = require("../../utils/missions");
const { getPriceBounds } = require("../../routes/marketplaceRoutes");

describe("level calculation", () => {
  test("level is 0 below the first threshold", () => {
    expect(calculateLevelFromXp(0)).toBe(0);
    expect(calculateLevelFromXp(999)).toBe(0);
  });

  test("known cumulative boundaries", () => {
    expect(calculateXPForLevel(1)).toBe(1000);
    expect(calculateXPForLevel(2)).toBe(1000 + xpDeltaForLevel(2)); // 2250
    expect(calculateLevelFromXp(calculateXPForLevel(1))).toBe(1);
    expect(calculateLevelFromXp(calculateXPForLevel(1) - 1)).toBe(0);
    expect(calculateLevelFromXp(calculateXPForLevel(2))).toBe(2);
    expect(calculateLevelFromXp(calculateXPForLevel(2) - 1)).toBe(1);
  });

  test("level is non-decreasing in xp", () => {
    let prev = 0;
    for (let xp = 0; xp <= 200000; xp += 137) {
      const lvl = calculateLevelFromXp(xp);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });

  test("level rewards are strictly negative-EV (never exceed expected house edge)", () => {
    // 100 XP = $1 expected house edge across every game
    for (let lvl = 1; lvl <= 50; lvl++) {
      const expectedEdgePaid = calculateXPForLevel(lvl) / 100;
      const cumulativeRewards = pendingLevelReward(0, lvl);
      expect(cumulativeRewards).toBeLessThanOrEqual(expectedEdgePaid * 0.55);
    }
  });
});

describe("marketplace rarity price bands", () => {
  test("blocks overpriced common items used for alt-account laundering", () => {
    const common = getPriceBounds("1", 500);
    expect(common.minPrice).toBeGreaterThanOrEqual(10);
    expect(common.maxPrice).toBeLessThanOrEqual(1000);
    expect(50000).toBeGreaterThan(common.maxPrice);
  });

  test("scales bounds monotonically with rarity", () => {
    const r1 = getPriceBounds("1", 500);
    const r2 = getPriceBounds("2", 500);
    const r3 = getPriceBounds("3", 500);
    const r4 = getPriceBounds("4", 500);
    const r5 = getPriceBounds("5", 500);
    expect(r1.maxPrice).toBeLessThan(r2.maxPrice);
    expect(r2.maxPrice).toBeLessThan(r3.maxPrice);
    expect(r3.maxPrice).toBeLessThan(r4.maxPrice);
    expect(r4.maxPrice).toBeLessThan(r5.maxPrice);
  });
});

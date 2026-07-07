const {
  dayString,
  isYesterday,
  streakReward,
  levelReward,
  pendingLevelReward,
  drawDailyMissions,
  MISSION_POOL,
  MISSIONS_PER_DAY,
  STREAK_REWARDS,
} = require("../../utils/missions");

describe("day boundaries (UTC-3)", () => {
  it("formats YYYY-MM-DD", () => {
    expect(dayString(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("detects yesterday", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isYesterday(yesterday)).toBe(true);
    expect(isYesterday(new Date())).toBe(false);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(isYesterday(threeDaysAgo)).toBe(false);
  });
});

describe("streak rewards", () => {
  it("grows day by day and caps at day 7", () => {
    for (let d = 1; d < STREAK_REWARDS.length; d++) {
      expect(streakReward(d + 1)).toBeGreaterThan(streakReward(d));
    }
    expect(streakReward(7)).toBe(5000);
    expect(streakReward(30)).toBe(5000); // day 7+ keeps the max
  });
});

describe("level rewards", () => {
  it("grows with level", () => {
    expect(levelReward(2)).toBeGreaterThan(levelReward(1));
  });

  it("sums every unclaimed level", () => {
    // claimed up to 1, current level 3 => levels 2 and 3
    expect(pendingLevelReward(1, 3)).toBe(levelReward(2) + levelReward(3));
    expect(pendingLevelReward(3, 3)).toBe(0);
    expect(pendingLevelReward(5, 3)).toBe(0);
  });
});

describe("daily mission draw", () => {
  it("draws the configured number of distinct missions", () => {
    for (let i = 0; i < 50; i++) {
      const missions = drawDailyMissions();
      expect(missions).toHaveLength(MISSIONS_PER_DAY);
      const keys = missions.map((m) => m.key);
      expect(new Set(keys).size).toBe(MISSIONS_PER_DAY);
      missions.forEach((m) => {
        expect(m.progress).toBe(0);
        expect(m.claimed).toBe(false);
        expect(MISSION_POOL.some((p) => p.key === m.key)).toBe(true);
      });
    }
  });
});

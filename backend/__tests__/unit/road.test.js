const road = require("../../games/road");

describe("gladiator road math and provably fair determinism", () => {
  test("multipliers increase strictly with step and difficulty", () => {
    for (const diff of Object.keys(road.DIFFICULTIES)) {
      const table = road.multipliersTable(diff);
      expect(table.length).toBe(road.DIFFICULTIES[diff].totalSteps);
      for (let i = 1; i < table.length; i++) {
        expect(table[i]).toBeGreaterThan(table[i - 1]);
      }
    }
    expect(road.multiplierFor(1, "hardcore")).toBeGreaterThan(road.multiplierFor(1, "hard"));
    expect(road.multiplierFor(1, "hard")).toBeGreaterThan(road.multiplierFor(1, "medium"));
    expect(road.multiplierFor(1, "medium")).toBeGreaterThan(road.multiplierFor(1, "easy"));
  });

  test("expected value at every step stays at or below 98% RTP", () => {
    for (const [diff, cfg] of Object.entries(road.DIFFICULTIES)) {
      const survive = 1 - cfg.trapChance;
      for (let step = 1; step <= cfg.totalSteps; step++) {
        const mult = road.multiplierFor(step, diff);
        const ev = Math.pow(survive, step) * mult;
        expect(ev).toBeLessThanOrEqual(0.985);
        expect(ev).toBeGreaterThan(0.95);
      }
    }
  });

  test("computeCrashStep is deterministic for a given seed and within valid bounds", () => {
    const seed = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    for (const [diff, cfg] of Object.entries(road.DIFFICULTIES)) {
      const a = road.computeCrashStep(seed, diff);
      const b = road.computeCrashStep(seed, diff);
      expect(a).toBe(b);
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(cfg.totalSteps + 1);
    }
  });

  test("fairnessHash matches seed, difficulty and crashStep", () => {
    const h1 = road.fairnessHash("seed-a", "medium", 4);
    const h2 = road.fairnessHash("seed-a", "medium", 4);
    const h3 = road.fairnessHash("seed-a", "medium", 5);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(64);
  });
});

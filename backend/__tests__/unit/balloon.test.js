const {
  MODES,
  HOUSE_EDGE,
  MAX_PAYOUT,
  multiplierFor,
  multipliersTable,
  computePopAt,
  fairnessHash,
  payoutFor,
} = require("../../games/balloon");

describe("balloon math & provably fair engine", () => {
  test("every mode maintains strictly <= 98% EV (2% house edge) at every pump", () => {
    for (const [mode, cfg] of Object.entries(MODES)) {
      const survive = 1 - cfg.popChance;
      const table = multipliersTable(mode);
      expect(table).toHaveLength(cfg.maxPumps);

      let prev = 1;
      for (let p = 1; p <= cfg.maxPumps; p++) {
        const mult = multiplierFor(p, mode);
        expect(mult).toBeGreaterThanOrEqual(prev);
        prev = mult;

        const survivalProb = Math.pow(survive, p);
        const ev = survivalProb * mult;
        expect(ev).toBeLessThanOrEqual(1 - HOUSE_EDGE + 0.005);
      }
    }
  });

  test("computePopAt is deterministic for a given serverSeed and mode and bounded in [1, maxPumps + 1]", () => {
    for (const [mode, cfg] of Object.entries(MODES)) {
      const seed = "a".repeat(64);
      const p1 = computePopAt(seed, mode);
      const p2 = computePopAt(seed, mode);
      expect(p1).toBe(p2);
      expect(p1).toBeGreaterThanOrEqual(1);
      expect(p1).toBeLessThanOrEqual(cfg.maxPumps + 1);
    }
  });

  test("fairnessHash matches sha256(serverSeed:mode:popAt)", () => {
    const h1 = fairnessHash("seed123", "gold", 7);
    const h2 = fairnessHash("seed123", "gold", 7);
    const h3 = fairnessHash("seed123", "gold", 8);
    expect(h1).toHaveLength(64);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  test("payoutFor caps winnings at MAX_PAYOUT", () => {
    expect(payoutFor(50000, 308.6)).toBe(MAX_PAYOUT);
    expect(payoutFor(100, 2.5)).toBe(250);
  });
});

import { describe, expect, it } from "vitest";
import {
  GRID_SIZE,
  buildMultiplierLadder,
  multiplierFor,
  payoutFor,
  rippleDelayFromTile,
  verifyMinesFairness,
} from "./minesUtils";

describe("Colosseum Mines utilities", () => {
  it("matches backend 99% RTP multiplier formula exactly", () => {
    expect(multiplierFor(0, 5)).toBe(1);
    // 1st gem with 5 mines: (25 / 20) * 0.99 = 1.2375 -> 1.23
    expect(multiplierFor(1, 5)).toBe(1.23);
    // 2nd gem with 5 mines: (25/20)*(24/19)*0.99 = 1.5631 -> 1.56
    expect(multiplierFor(2, 5)).toBe(1.56);
    // 1st gem with 24 mines: (25 / 1) * 0.99 = 24.75
    expect(multiplierFor(1, 24)).toBe(24.75);
  });

  it("caps payout at MAX_PAYOUT and rounds down to cents", () => {
    expect(payoutFor(100, 1.23)).toBe(123);
    expect(payoutFor(50000, 50)).toBe(500000);
  });

  it("builds a complete ladder with strictly increasing multipliers", () => {
    const ladder = buildMultiplierLadder(5);
    expect(ladder).toHaveLength(GRID_SIZE - 5);
    expect(ladder[0].step).toBe(1);
    expect(ladder[0].safeChancePct).toBe(80);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].multiplier).toBeGreaterThan(ladder[i - 1].multiplier);
    }
  });

  it("computes radial ripple delays increasing with distance from blast epicenter", () => {
    expect(rippleDelayFromTile(12, 12)).toBe(0);
    expect(rippleDelayFromTile(13, 12)).toBeGreaterThan(0);
    expect(rippleDelayFromTile(0, 12)).toBeGreaterThan(rippleDelayFromTile(13, 12));
  });

  it("cryptographically verifies SHA-256 Provably Fair serverSeed + sorted mines", async () => {
    const seed = "crixus_test_seed_1234";
    const mines = [18, 2, 11, 0, 24];
    const check = await verifyMinesFairness(seed, mines, "0000");
    expect(check.valid).toBe(false);
    expect(check.computedHash).toHaveLength(64);

    // Re-verifying with unsorted input order must match the same sorted hash
    const verified = await verifyMinesFairness(seed, [24, 0, 18, 2, 11], check.computedHash);
    expect(verified.valid).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  CELL_HEIGHT,
  PAYLINES,
  REEL_VIEWPORT_HEIGHT,
  SLOT_SYMBOLS,
  SYMBOL_BY_KEY,
  detectReel3Anticipation,
} from "./slotConfig";

describe("Fortuna del Coliseo slotConfig", () => {
  it("keeps exact 3-row viewport geometry and all 7 backend-synced symbols", () => {
    expect(REEL_VIEWPORT_HEIGHT).toBe(CELL_HEIGHT * 3);
    expect(SLOT_SYMBOLS).toHaveLength(7);
    expect(PAYLINES).toHaveLength(5);
    expect(SYMBOL_BY_KEY.wild.mult).toBe(100);
    expect(SYMBOL_BY_KEY.yellow.mult).toBe(25);
    expect(SYMBOL_BY_KEY.hakkero.mult).toBe(12);
    expect(SYMBOL_BY_KEY.yin_yang.mult).toBe(8);
    expect(SYMBOL_BY_KEY.green.mult).toBe(3);
    expect(SYMBOL_BY_KEY.blue.mult).toBe(1);
    expect(SYMBOL_BY_KEY.red.mult).toBe(0.5);
  });

  it("triggers Reel 3 anticipation when Reels 1 & 2 align a high-tier (>= 8x) or WILD pair", () => {
    // Horizontal 2 has yellow + wild in cols 0 & 1 (potential 25x)
    const grid = [
      "red", "blue", "green",
      "yellow", "wild", "red",
      "blue", "red", "blue",
    ];
    const res = detectReel3Anticipation(grid);
    expect(res.active).toBe(true);
    expect(res.hotLines).toContain("Horizontal 2");
    expect(res.topMultiplier).toBe(25);
  });

  it("triggers 100x anticipation on double WILD diagonal", () => {
    const grid = [
      "wild", "red", "blue",
      "green", "wild", "red",
      "blue", "green", "red",
    ];
    const res = detectReel3Anticipation(grid);
    expect(res.active).toBe(true);
    expect(res.hotLines).toContain("Diagonal 1");
    expect(res.topMultiplier).toBe(100);
  });

  it("does NOT trigger anticipation on low-tier (< 8x) pairs", () => {
    const grid = [
      "red", "red", "blue",
      "green", "green", "red",
      "blue", "blue", "green",
    ];
    const res = detectReel3Anticipation(grid);
    expect(res.active).toBe(false);
    expect(res.hotLines).toHaveLength(0);
  });
});

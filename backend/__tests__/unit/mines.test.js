const { multiplierFor, drawMines, fairnessHash } = require("../../games/mines");
const crypto = require("crypto");

describe("mines multiplier", () => {
  it("is 1 with zero reveals", () => {
    expect(multiplierFor(0, 3)).toBe(1);
    expect(multiplierFor(0, 24)).toBe(1);
  });

  it("grows with each reveal and with more mines", () => {
    expect(multiplierFor(2, 3)).toBeGreaterThan(multiplierFor(1, 3));
    expect(multiplierFor(1, 10)).toBeGreaterThan(multiplierFor(1, 3));
  });

  it("keeps RTP at ~99% for every configuration", () => {
    for (const mines of [1, 3, 5, 10, 15, 20, 24]) {
      for (let k = 1; k <= 25 - mines; k++) {
        let survive = 1;
        for (let i = 0; i < k; i++) survive *= (25 - mines - i) / (25 - i);
        const rtp = survive * multiplierFor(k, mines);
        expect(rtp).toBeLessThanOrEqual(0.995);
        expect(rtp).toBeGreaterThan(0.9);
      }
    }
  });

  it("24 mines, 1 safe tile pays ~24.75x", () => {
    expect(multiplierFor(1, 24)).toBeCloseTo(24.75, 1);
  });
});

describe("mines draw", () => {
  it("draws distinct positions inside the grid", () => {
    for (let n = 1; n <= 24; n++) {
      const mines = drawMines(n);
      expect(mines).toHaveLength(n);
      expect(new Set(mines).size).toBe(n);
      mines.forEach((m) => {
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThan(25);
      });
    }
  });
});

describe("mines fairness hash", () => {
  it("is deterministic and order-independent", () => {
    const seed = "abc123";
    expect(fairnessHash(seed, [5, 1, 9])).toBe(fairnessHash(seed, [9, 5, 1]));
  });

  it("matches a manual sha256 of seed:sortedMines", () => {
    const seed = "deadbeef";
    const mines = [7, 2, 20];
    const expected = crypto
      .createHash("sha256")
      .update("deadbeef:2,7,20")
      .digest("hex");
    expect(fairnessHash(seed, mines)).toBe(expected);
  });
});

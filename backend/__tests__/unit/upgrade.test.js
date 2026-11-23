const { calculateSuccessRate } = require("../../games/upgrade");

const items = (...rarities) => rarities.map((rarity) => ({ rarity }));

describe("upgrade success rate", () => {
  test("a single item targeting its own rarity is below the cap", () => {
    expect(calculateSuccessRate(items("3"), "3")).toBeGreaterThan(0);
    expect(calculateSuccessRate(items("3"), "3")).toBeLessThanOrEqual(0.6);
  });

  test("adding an item never lowers the rate (monotonic)", () => {
    for (const target of ["2", "3", "4", "5"]) {
      let prev = 0;
      const pool = ["1", "2", "3", "1", "2", "1"];
      for (let n = 1; n <= pool.length; n++) {
        const rate = calculateSuccessRate(items(...pool.slice(0, n)), target);
        expect(rate + 1e-9).toBeGreaterThanOrEqual(prev);
        prev = rate;
      }
    }
  });

  test("the regression case no longer shrinks (target 4: r3 vs r3+r1)", () => {
    const one = calculateSuccessRate(items("3"), "4");
    const two = calculateSuccessRate(items("3", "1"), "4");
    expect(two).toBeGreaterThanOrEqual(one);
  });

  test("order of items does not change the result", () => {
    const a = calculateSuccessRate(items("1", "3", "2"), "4");
    const b = calculateSuccessRate(items("3", "2", "1"), "4");
    expect(a).toBeCloseTo(b, 10);
  });

  test("caps are enforced per target rarity", () => {
    const many = items("4", "4", "4", "4", "4", "4", "4", "4");
    expect(calculateSuccessRate(many, "5")).toBeLessThanOrEqual(0.45);
    expect(calculateSuccessRate(many, "4")).toBeLessThanOrEqual(0.5);
    expect(calculateSuccessRate(many, "3")).toBeLessThanOrEqual(0.6);
    expect(calculateSuccessRate(many, "2")).toBeLessThanOrEqual(0.7);
  });

  test("no single-item upgrade path has positive EV relative to case drop rates", () => {
    const drop = { "1": 0.7992, "2": 0.1598, "3": 0.032, "4": 0.0064, "5": 0.0026 };
    for (const from of ["1", "2", "3", "4"]) {
      for (const to of ["2", "3", "4", "5"]) {
        if (Number(to) <= Number(from)) continue;
        const rate = calculateSuccessRate(items(from), to);
        const fairRatio = drop[to] / drop[from];
        expect(rate).toBeLessThanOrEqual(fairRatio * 0.905);
        expect(rate).toBeGreaterThan(0);
      }
    }
  });
});

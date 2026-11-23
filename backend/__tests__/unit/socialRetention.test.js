const { recordLiveWin, getRecentWins, clearRecentWins } = require("../../utils/liveFeed");
const {
  LEAGUES,
  getLeagueInfo,
  nextLeagueId,
  prevLeagueId,
  getNextWednesdayReset,
} = require("../../utils/leagues");
const { generateDuelCode, sanitizeCode, MIN_BET, MAX_BET, PAYOUT_MULTIPLIER } = require("../../games/duel");

describe("live win feed", () => {
  beforeEach(() => clearRecentWins());

  test("records notable wins, broadcasts via io, and ignores tiny wins", () => {
    const emitted = [];
    const mockIo = { emit: (ev, payload) => emitted.push({ ev, payload }) };

    // Tiny low-mult win should be ignored
    expect(recordLiveWin(mockIo, { username: "a", game: "mines", multiplier: 1.03, payout: 10 })).toBeNull();
    expect(getRecentWins()).toHaveLength(0);

    // Big win should be recorded and emitted
    const item = recordLiveWin(mockIo, {
      username: "Gladiador",
      game: "road",
      multiplier: 12.5,
      payout: 1250,
    });
    expect(item).not.toBeNull();
    expect(getRecentWins()).toHaveLength(1);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].ev).toBe("liveFeed:win");
  });

  test("caps the in-memory ring buffer at 25 entries", () => {
    for (let i = 0; i < 40; i++) {
      recordLiveWin(null, { username: `u${i}`, game: "crash", multiplier: 3, payout: 300 });
    }
    expect(getRecentWins(50)).toHaveLength(25);
    expect(getRecentWins(1)[0].username).toBe("u39");
  });
});

describe("weekly leagues", () => {
  test("defines 5 ordered tiers with strictly increasing top prizes", () => {
    expect(LEAGUES).toHaveLength(5);
    for (let i = 1; i < LEAGUES.length; i++) {
      expect(LEAGUES[i].order).toBe(i);
      expect(LEAGUES[i].prizes[0]).toBeGreaterThan(LEAGUES[i - 1].prizes[0]);
    }
  });

  test("clamps promotion/demotion cleanly at boundaries", () => {
    expect(prevLeagueId("bronze")).toBe("bronze");
    expect(nextLeagueId("bronze")).toBe("silver");
    expect(nextLeagueId("emperor")).toBe("emperor");
    expect(prevLeagueId("emperor")).toBe("legion");
    expect(getLeagueInfo("unknown").id).toBe("bronze");
  });

  test("next Wednesday reset is always in the future at 23:00 UTC (20:00 ARG)", () => {
    const sampleDates = [
      new Date("2026-11-23T15:00:00Z"), // Monday
      new Date("2026-11-25T22:59:00Z"), // Wednesday 19:59 ARG
      new Date("2026-11-25T23:01:00Z"), // Wednesday 20:01 ARG -> next week
    ];
    for (const d of sampleDates) {
      const reset = getNextWednesdayReset(d);
      expect(reset.getTime()).toBeGreaterThan(d.getTime());
      expect(reset.getUTCDay()).toBe(3); // Wednesday
      expect(reset.getUTCHours()).toBe(23);
    }
  });
});

describe("1v1 arena duels helpers", () => {
  test("generates clean 6-char codes and sanitizes user input", () => {
    const code = generateDuelCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    expect(sanitizeCode("  ab-12!cd  ")).toBe("AB12CD");
    expect(sanitizeCode(null)).toBe("");
  });

  test("enforces 2.5% sink and sane bet limits", () => {
    expect(PAYOUT_MULTIPLIER).toBe(1.95);
    expect(MIN_BET).toBeGreaterThanOrEqual(10);
    expect(MAX_BET).toBeLessThanOrEqual(50000);
  });
});

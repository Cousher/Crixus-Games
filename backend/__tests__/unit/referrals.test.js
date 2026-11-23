const {
  INVITEE_UNLOCK_LEVEL,
  INVITEE_BONUS,
  REFERRER_UNLOCK_LEVEL,
  REFERRER_BONUS,
  REFERRAL_MILESTONES,
  normalizeReferralCode,
  hashIp,
} = require("../../utils/referrals");
const { calculateXPForLevel } = require("../../utils/economy");

describe("referral system configuration & helpers", () => {
  test("normalizes and clamps referral codes safely", () => {
    expect(normalizeReferralCode("  CrixusKing  ")).toBe("CrixusKing");
    expect(normalizeReferralCode("")).toBe("");
    expect(normalizeReferralCode(null)).toBe("");
    expect(normalizeReferralCode("a".repeat(100)).length).toBe(40);
  });

  test("hashes client IPs deterministically without exposing raw IP", () => {
    const h1 = hashIp("190.244.10.22");
    const h2 = hashIp("190.244.10.22");
    const h3 = hashIp("190.244.10.23");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toContain("190.244");
    expect(h1.length).toBe(32);
    expect(hashIp("")).toBe("");
  });

  test("milestones are strictly increasing in count and reward", () => {
    expect(REFERRAL_MILESTONES.length).toBe(4);
    for (let i = 1; i < REFERRAL_MILESTONES.length; i++) {
      expect(REFERRAL_MILESTONES[i].count).toBeGreaterThan(REFERRAL_MILESTONES[i - 1].count);
      expect(REFERRAL_MILESTONES[i].reward).toBeGreaterThan(REFERRAL_MILESTONES[i - 1].reward);
    }
  });

  test("unlock thresholds require real gameplay progression (anti-ghost accounts)", () => {
    expect(INVITEE_UNLOCK_LEVEL).toBeGreaterThanOrEqual(3);
    expect(REFERRER_UNLOCK_LEVEL).toBeGreaterThanOrEqual(5);
    expect(INVITEE_BONUS).toBeGreaterThan(0);
    expect(REFERRER_BONUS).toBeGreaterThan(INVITEE_BONUS);
    // Reaching Level 5 requires real wagered XP (cumulative > 7000 XP)
    expect(calculateXPForLevel(REFERRER_UNLOCK_LEVEL)).toBeGreaterThan(7000);
  });
});

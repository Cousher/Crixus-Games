import { describe, it, expect, beforeEach } from "vitest";
import {
  buildReferralLink,
  buildWhatsAppInviteUrl,
  clearStoredReferral,
  getStoredReferral,
} from "./referral";
import { buildWinShareText } from "./shareWinCanvas";

describe("referral & viral share helpers", () => {
  beforeEach(() => {
    clearStoredReferral();
  });

  it("builds referral links and WhatsApp invite URLs containing the username", () => {
    const link = buildReferralLink("GladiadorAR");
    expect(link).toContain("?ref=GladiadorAR");

    const wa = buildWhatsAppInviteUrl("GladiadorAR", true);
    expect(wa.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(wa)).toContain("?ref=GladiadorAR");
    expect(decodeURIComponent(wa)).toContain("Crixus Games");
  });

  it("reads and clears stored referral code cleanly", () => {
    localStorage.setItem("crixus_ref_code", "CrixusBoss");
    expect(getStoredReferral()).toBe("CrixusBoss");
    clearStoredReferral();
    expect(getStoredReferral()).toBe("");
  });

  it("builds persuasive share text for Big Wins including referral link", () => {
    const text = buildWinShareText({
      gameName: "Camino del Gladiador",
      multiplier: 18.4,
      payout: 14720,
      username: "LucasAR",
      level: 12,
      isEs: true,
    });
    expect(text).toContain("18.40x");
    expect(text).toContain("Camino del Gladiador");
    expect(text).toContain("?ref=LucasAR");
  });
});

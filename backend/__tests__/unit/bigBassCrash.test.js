jest.mock("../../utils/economy", () => ({
  chargeUser: jest.fn(),
  creditUser: jest.fn(async (_uid, payout) => ({
    walletBalance: 1000 + payout,
    xp: 100,
    level: 2,
  })),
}));

jest.mock("../../utils/missions", () => ({
  trackMission: jest.fn(),
}));

jest.mock("../../utils/liveFeed", () => ({
  recordLiveWin: jest.fn(),
}));

const { creditUser } = require("../../utils/economy");
const bigBassCrash = require("../../games/bigBassCrash");

describe("Big Bass Crash multiplayer engine & 50% partial cashout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("starts in betting phase, publishes hash without leaking crashPoint/serverSeed, and rejects pre-round cashouts", async () => {
    const handlers = {};
    const fakeIo = {
      emit: jest.fn(),
      to: () => ({ emit: jest.fn() }),
      on: (ev, fn) => {
        handlers[ev] = fn;
      },
    };

    const room = bigBassCrash(fakeIo, { bettingWindowMs: 60000, revealPauseMs: 5000 });
    try {
      const state = room.getPublicState();
      expect(state.phase).toBe("betting");
      expect(state.hash).toHaveLength(64);
      expect(state.reveal).toBeNull();
      expect(state.crashPoint).toBeUndefined();
      expect(state.serverSeed).toBeUndefined();

      const sockEvents = {};
      const fakeSocket = {
        userId: "507f1f77bcf86cd799439011",
        emit: jest.fn(),
        on: (ev, fn) => {
          sockEvents[ev] = fn;
        },
      };
      handlers.connection(fakeSocket);

      let ack50 = null;
      await sockEvents["bigbass:cashout50"]((res) => {
        ack50 = res;
      });
      expect(ack50.ok).toBe(false);

      let ackFull = null;
      await sockEvents["bigbass:cashout"]((res) => {
        ackFull = res;
      });
      expect(ackFull.ok).toBe(false);
    } finally {
      room.stop();
    }
  });

  test("50% partial cashout locks half stake and remaining cashout pays only the other half without double-payout", async () => {
    const fakeIo = {
      emit: jest.fn(),
      to: () => ({ emit: jest.fn() }),
      on: jest.fn(),
    };

    const room = bigBassCrash(fakeIo, { bettingWindowMs: 60000, revealPauseMs: 5000 });
    try {
      room._test.forceRun(10.0);
      room._test.addPlayer({
        userId: "u1",
        username: "Angler",
        profilePicture: "",
        level: 5,
        bet: 200,
        remainingBet: 200,
        halfCashedOut: false,
        halfMultiplier: null,
        halfPayout: 0,
        fullCashedOut: false,
        fullMultiplier: null,
        totalPayout: 0,
      });

      // Cash out 50% at 2.00x -> pays 100 * 2.00 = 200, leaves remainingBet = 100
      const okHalf = await room._test.cashOutHalf("u1", 2.0);
      expect(okHalf).toBe(true);
      expect(creditUser).toHaveBeenCalledTimes(1);
      expect(creditUser).toHaveBeenLastCalledWith("u1", 200, 100);

      // Second 50% cashout must be rejected
      const okHalfAgain = await room._test.cashOutHalf("u1", 3.0);
      expect(okHalfAgain).toBe(false);

      // Remaining 50% cashout at 4.50x -> pays 100 * 4.50 = 450, totalPayout = 650
      const okRest = await room._test.cashOutFull("u1", 4.5);
      expect(okRest).toBe(true);
      expect(creditUser).toHaveBeenCalledTimes(2);
      expect(creditUser).toHaveBeenLastCalledWith("u1", 450, 350);

      // Any further cashout must be rejected
      expect(await room._test.cashOutFull("u1", 6.0)).toBe(false);

      const p = room.getPublicState().players.find((x) => x.userId === "u1");
      expect(p.remainingBet).toBe(0);
      expect(p.totalPayout).toBe(650);
    } finally {
      room.stop();
    }
  });
});

export const GRID_SIZE = 25;
export const GRID_DIM = 5;
export const HOUSE_EDGE = 0.01; // 1% edge -> 99% RTP (exact match with backend/games/mines.js)
export const MIN_BET = 1;
export const MAX_BET = 50000;
export const MAX_PAYOUT = 500000;
export const MINES_PRESETS = [1, 3, 5, 10, 15, 20, 24];

export const MINES_ASSETS = {
  backdrop: "/images/mines/hypogeum_bg.webp",
  stoneTile: "/images/mines/tile_stone.webp",
  gem: "/images/mines/gem_imperial.webp",
  mine: "/images/mines/mine_bomb.webp",
};

/** Exact parity with backend/games/mines.js `multiplierFor` */
export function multiplierFor(revealedCount: number, minesCount: number): number {
  if (revealedCount <= 0) return 1;
  const maxSafe = GRID_SIZE - minesCount;
  const clamped = Math.min(revealedCount, maxSafe);
  let fair = 1;
  for (let i = 0; i < clamped; i++) {
    fair *= (GRID_SIZE - i) / (GRID_SIZE - minesCount - i);
  }
  return Math.max(1, Math.floor(fair * (1 - HOUSE_EDGE) * 100) / 100);
}

/** Exact parity with backend/games/mines.js `payoutFor` */
export function payoutFor(bet: number, multiplier: number): number {
  return Math.min(MAX_PAYOUT, Math.floor(bet * multiplier * 100) / 100);
}

export interface LadderStep {
  step: number;
  multiplier: number;
  safeChancePct: number;
}

/** Builds the complete step-by-step multiplier ladder for a chosen mines count */
export function buildMultiplierLadder(minesCount: number): LadderStep[] {
  const safeTotal = Math.max(1, GRID_SIZE - minesCount);
  const steps: LadderStep[] = [];
  for (let step = 1; step <= safeTotal; step++) {
    const tilesBefore = GRID_SIZE - (step - 1);
    const safeBefore = safeTotal - (step - 1);
    steps.push({
      step,
      multiplier: multiplierFor(step, minesCount),
      safeChancePct: Math.round((safeBefore / tilesBefore) * 100),
    });
  }
  return steps;
}

/** Euclidean grid distance delay (in seconds) from an epicenter tile for radial shockwave reveals */
export function rippleDelayFromTile(tileIndex: number, epicenterIndex: number | null): number {
  if (epicenterIndex === null || epicenterIndex < 0) {
    // Gentle diagonal wave across the board on cashout
    const r = Math.floor(tileIndex / GRID_DIM);
    const c = tileIndex % GRID_DIM;
    return (r + c) * 0.032;
  }
  const r1 = Math.floor(tileIndex / GRID_DIM);
  const c1 = tileIndex % GRID_DIM;
  const r2 = Math.floor(epicenterIndex / GRID_DIM);
  const c2 = epicenterIndex % GRID_DIM;
  const dist = Math.hypot(r1 - r2, c1 - c2);
  return Math.min(0.42, dist * 0.075);
}

/** Client-side cryptographic SHA-256 verification matching backend `fairnessHash(serverSeed, mines)` */
export async function verifyMinesFairness(
  serverSeed: string,
  mines: number[],
  expectedHash: string
): Promise<{ valid: boolean; computedHash: string }> {
  const payload = `${serverSeed}:${[...mines].sort((a, b) => a - b).join(",")}`;
  const encoded = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const computedHash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return {
    valid: computedHash.toLowerCase() === expectedHash.trim().toLowerCase(),
    computedHash,
  };
}

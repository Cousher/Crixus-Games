import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CELL_HEIGHT,
  REEL_VIEWPORT_HEIGHT,
  SYMBOL_BY_KEY,
  getRandomSymbolKey,
} from "./slotConfig";

interface SlotColumnProps {
  columnIndex: 0 | 1 | 2;
  targetSymbols: [string, string, string];
  spinId: number;
  resultReady: boolean;
  stopDelayMs: number;
  turbo: boolean;
  slamStopSeq: number;
  anticipation: boolean;
  winningRows: Set<number>;
  previewRows: Set<number>;
  hasAnyWin: boolean;
  onReelStopped: (colIndex: 0 | 1 | 2, landedWild: boolean) => void;
}

const FILLER_COUNT = 16;
// Layout: [topBuffer(0), target0(1), target1(2), target2(3), filler(4..19), prev0(20), prev1(21), prev2(22)]
// Keeping 1 buffer cell above target0 guarantees zero empty gap during mechanical overshoot bounce!
const STRIP_LEN = 1 + 3 + FILLER_COUNT + 3; // 23 cells
const REST_TOP_Y = -CELL_HEIGHT; // -112px (frames indices 1, 2, 3 cleanly inside the 336px viewport)
const REST_BOTTOM_Y = -(STRIP_LEN - 3) * CELL_HEIGHT; // -2240px (frames prev0..2 at indices 20..22)
const LOOP_SPAN = FILLER_COUNT * CELL_HEIGHT; // 1792px seamless cruise loop

const buildStrip = (
  topThree: [string, string, string],
  bottomThree: [string, string, string]
): string[] => {
  const arr: string[] = [getRandomSymbolKey(), topThree[0], topThree[1], topThree[2]];
  for (let i = 0; i < FILLER_COUNT; i++) {
    arr.push(getRandomSymbolKey());
  }
  arr.push(bottomThree[0], bottomThree[1], bottomThree[2]);
  return arr;
};

type ReelPhase = "idle" | "kickback" | "cruise" | "brake";

/**
 * Calibrated overshoot ease-out curve for heavy mechanical drum slam + spring settle.
 * Peaks at ~1.0266 around t=0.69 (~18px weighted bounce on a 6-cell runway), then locks to 1.000.
 */
function easeOutBackReel(t: number): number {
  const c1 = 0.85;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const SlotColumn: React.FC<SlotColumnProps> = ({
  columnIndex,
  targetSymbols,
  spinId,
  resultReady,
  stopDelayMs,
  turbo,
  slamStopSeq,
  anticipation,
  winningRows,
  previewRows,
  hasAnyWin,
  onReelStopped,
}) => {
  const [strip, setStrip] = useState<string[]>(() =>
    buildStrip(targetSymbols, targetSymbols)
  );
  const [isMovingFast, setIsMovingFast] = useState(false);
  const [justLanded, setJustLanded] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<ReelPhase>("idle");
  const posYRef = useRef<number>(REST_TOP_Y);
  const phaseStartRef = useRef<number>(0);
  const resultReadyAtRef = useRef<number | null>(null);
  const stopDelayRef = useRef<number>(stopDelayMs);
  const turboRef = useRef<boolean>(turbo);
  const targetRef = useRef<[string, string, string]>(targetSymbols);
  const displayedRef = useRef<[string, string, string]>(targetSymbols);
  const brakeDistanceRef = useRef<number>(6 * CELL_HEIGHT);
  const brakeDurRef = useRef<number>(370);
  const slamTriggeredRef = useRef<boolean>(false);
  const stopCallbackFiredRef = useRef<boolean>(false);
  const onStoppedRef = useRef(onReelStopped);
  const prevSpinIdRef = useRef<number>(spinId);
  const prevSlamSeqRef = useRef<number>(slamStopSeq);

  onStoppedRef.current = onReelStopped;
  stopDelayRef.current = stopDelayMs;
  turboRef.current = turbo;
  targetRef.current = targetSymbols;

  // Keep landing cells [1, 2, 3] synchronized as soon as authoritative server grid arrives
  useEffect(() => {
    if (resultReady) {
      if (resultReadyAtRef.current === null && phaseRef.current !== "idle") {
        resultReadyAtRef.current = performance.now();
      }
      setStrip((prev) => {
        if (
          prev[1] === targetSymbols[0] &&
          prev[2] === targetSymbols[1] &&
          prev[3] === targetSymbols[2]
        ) {
          return prev;
        }
        const next = prev.slice();
        next[1] = targetSymbols[0];
        next[2] = targetSymbols[1];
        next[3] = targetSymbols[2];
        return next;
      });
    }
  }, [resultReady, targetSymbols]);

  // Trigger a new spin whenever spinId increments
  useEffect(() => {
    if (spinId === prevSpinIdRef.current) return;
    prevSpinIdRef.current = spinId;

    const prevShown = displayedRef.current;
    const nextStrip = buildStrip(targetRef.current, prevShown);
    setStrip(nextStrip);

    // Position seamlessly at REST_BOTTOM_Y so previously visible symbols wind up & plunge naturally
    posYRef.current = REST_BOTTOM_Y;
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(0, ${REST_BOTTOM_Y}px, 0)`;
    }

    phaseRef.current = "kickback";
    phaseStartRef.current = performance.now() + columnIndex * (turboRef.current ? 30 : 65);
    resultReadyAtRef.current = resultReady ? performance.now() : null;
    slamTriggeredRef.current = false;
    stopCallbackFiredRef.current = false;
    setJustLanded(false);
    setIsMovingFast(false);
  }, [spinId, columnIndex, resultReady]);

  // Instant Slam-Stop when player taps Spin / Spacebar mid-spin
  useEffect(() => {
    if (slamStopSeq === prevSlamSeqRef.current) return;
    prevSlamSeqRef.current = slamStopSeq;
    if (phaseRef.current === "kickback" || phaseRef.current === "cruise") {
      slamTriggeredRef.current = true;
    }
  }, [slamStopSeq]);

  // Frame initial resting symbols [1, 2, 3] cleanly on mount
  useEffect(() => {
    if (trackRef.current && phaseRef.current === "idle") {
      trackRef.current.style.transform = `translate3d(0, ${REST_TOP_Y}px, 0)`;
    }
  }, []);

  // 60fps physical reel cylinder solver (zero React re-renders during cruise & settle)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const phase = phaseRef.current;
      const el = trackRef.current;

      if (el && phase !== "idle") {
        if (phase === "kickback") {
          const elapsed = now - phaseStartRef.current;
          if (elapsed < 0) {
            el.style.transform = `translate3d(0, ${REST_BOTTOM_Y}px, 0)`;
          } else {
            const kickDur = turboRef.current ? 58 : 100;
            const p = Math.min(1, elapsed / kickDur);
            const recoil = Math.sin(p * Math.PI) * -15;
            posYRef.current = REST_BOTTOM_Y + recoil;
            el.style.transform = `translate3d(0, ${posYRef.current.toFixed(1)}px, 0)`;

            if (p >= 1) {
              phaseRef.current = "cruise";
              phaseStartRef.current = now;
              setIsMovingFast(true);
            }
          }
        } else if (phase === "cruise") {
          const speed = turboRef.current ? 3200 : 2550;
          posYRef.current += speed * dt;

          const readyAt = resultReadyAtRef.current;
          const canBrake =
            readyAt !== null &&
            (slamTriggeredRef.current || now - readyAt >= stopDelayRef.current);

          if (canBrake) {
            const runwayCells = slamTriggeredRef.current || turboRef.current ? 4 : 6;
            brakeDistanceRef.current = runwayCells * CELL_HEIGHT;
            brakeDurRef.current =
              slamTriggeredRef.current ? 190 : turboRef.current ? 245 : 375;
            posYRef.current = REST_TOP_Y - brakeDistanceRef.current;
            phaseRef.current = "brake";
            phaseStartRef.current = now;
            setIsMovingFast(false);
          } else if (posYRef.current > REST_TOP_Y - 3.5 * CELL_HEIGHT) {
            posYRef.current -= LOOP_SPAN;
          }

          el.style.transform = `translate3d(0, ${posYRef.current.toFixed(1)}px, 0)`;
        } else if (phase === "brake") {
          const elapsed = now - phaseStartRef.current;
          const dur = brakeDurRef.current;
          const p = Math.min(1, elapsed / dur);
          const eased = easeOutBackReel(p);

          // Travels from (REST_TOP_Y - distance) -> (REST_TOP_Y + ~18px overshoot) -> REST_TOP_Y exact lock
          posYRef.current = REST_TOP_Y - brakeDistanceRef.current * (1 - eased);
          el.style.transform = `translate3d(0, ${posYRef.current.toFixed(1)}px, 0)`;

          // Trigger weighted mechanical thud & flash right at peak slam (~p = 0.68)
          if (!stopCallbackFiredRef.current && p >= 0.68) {
            stopCallbackFiredRef.current = true;
            displayedRef.current = [
              targetRef.current[0],
              targetRef.current[1],
              targetRef.current[2],
            ];
            setJustLanded(true);
            const hasWild = targetRef.current.includes("wild");
            onStoppedRef.current(columnIndex, hasWild);
          }

          if (p >= 1) {
            posYRef.current = REST_TOP_Y;
            el.style.transform = `translate3d(0, ${REST_TOP_Y}px, 0)`;
            phaseRef.current = "idle";
            if (!stopCallbackFiredRef.current) {
              stopCallbackFiredRef.current = true;
              displayedRef.current = [
                targetRef.current[0],
                targetRef.current[1],
                targetRef.current[2],
              ];
              setJustLanded(true);
              const hasWild = targetRef.current.includes("wild");
              onStoppedRef.current(columnIndex, hasWild);
            }
          }
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [columnIndex]);

  useEffect(() => {
    if (!justLanded) return;
    const t = setTimeout(() => setJustLanded(false), 360);
    return () => clearTimeout(t);
  }, [justLanded]);

  return (
    <div
      style={{ height: `${REEL_VIEWPORT_HEIGHT}px` }}
      className="w-full overflow-hidden relative flex justify-center select-none"
    >
      {/* Dramatic Golden Anticipation Energy Aura on Column 3 */}
      {anticipation && (
        <div
          className="slot-anticipation-beam absolute inset-0 z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,215,0,0.34) 0%, rgba(255,140,0,0.08) 50%, rgba(255,215,0,0.34) 100%)",
            boxShadow:
              "inset 0 0 26px rgba(255,200,50,0.92), inset 0 0 8px rgba(255,250,200,0.85)",
          }}
        />
      )}

      {/* Subtle golden slam-impact flash when this reel locks into place */}
      {justLanded && (
        <motion.div
          initial={{ opacity: 0.72 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,233,168,0.48) 0%, rgba(212,175,55,0.12) 55%, transparent 100%)",
          }}
        />
      )}

      {/* GPU-composited physical reel track */}
      <div
        ref={trackRef}
        className="will-change-transform w-full"
        style={{
          filter: isMovingFast ? "url(#slotVerticalBlur)" : undefined,
        }}
      >
        {strip.map((symbolKey, idx) => {
          const spec = SYMBOL_BY_KEY[symbolKey] || SYMBOL_BY_KEY.red;
          const isLandedRow = idx >= 1 && idx <= 3;
          const rowIndex = idx - 1;
          const isWin = isLandedRow && hasAnyWin && winningRows.has(rowIndex);
          const isDimmed = isLandedRow && hasAnyWin && !isWin;
          const isPreview = isLandedRow && !hasAnyWin && previewRows.has(rowIndex);
          const isWild = spec.wild;
          const isHighTier = spec.tier === "legendary" || spec.tier === "epic";

          return (
            <div
              key={idx}
              style={{ height: `${CELL_HEIGHT}px` }}
              className="w-full max-w-[118px] mx-auto px-1.5 py-1.5 flex items-center justify-center relative"
            >
              <motion.div
                className="relative w-full h-full"
                animate={
                  isWin
                    ? {
                        scale: [1, 1.09, 1.02, 1.08, 1],
                        filter: [
                          "brightness(1.08)",
                          "brightness(1.38)",
                          "brightness(1.12)",
                        ],
                      }
                    : {
                        scale: isDimmed ? 0.91 : isPreview ? 1.04 : 1,
                        filter: isDimmed
                          ? "brightness(0.42) saturate(0.55)"
                          : isPreview
                          ? "brightness(1.18)"
                          : "brightness(1)",
                      }
                }
                transition={
                  isWin
                    ? { duration: 1.05, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.28 }
                }
              >
                {/* Inlaid Roman obsidian medallion tile */}
                <div
                  className={`relative w-full h-full rounded-xl overflow-hidden transition-shadow duration-300 bg-[#090806] ${
                    isWin
                      ? "ring-2 ring-[#fff3c4]"
                      : isPreview
                      ? "ring-2 ring-[#ffd966]/85 shadow-[0_0_16px_rgba(255,217,102,0.55)]"
                      : isWild
                      ? "ring-[1.5px] ring-[#ffd966]/75 shadow-[0_0_14px_rgba(255,215,0,0.32),inset_0_0_12px_rgba(255,233,168,0.22)]"
                      : isHighTier
                      ? "ring-1 ring-[#d4af37]/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]"
                      : "ring-1 ring-[#d4af37]/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]"
                  }`}
                  style={
                    isWin
                      ? {
                          boxShadow: `0 0 26px ${spec.glow}, inset 0 0 14px rgba(255,245,200,0.5)`,
                        }
                      : undefined
                  }
                >
                  <img
                    src={spec.img}
                    alt={spec.es}
                    draggable={false}
                    className="w-full h-full object-cover select-none"
                  />

                  {/* Crisp glass bezel lighting */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.11] via-transparent to-black/35 pointer-events-none" />

                  {/* Living golden sheen sweep on Golden Lion WILD symbols */}
                  {isWild && !isMovingFast && isLandedRow && (
                    <div
                      className="slot-wild-sheen absolute inset-y-0 -left-1/2 w-1/2 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,248,200,0.55), transparent)",
                      }}
                    />
                  )}

                  {/* Subtle WILD badge micro-tag on bottom rim */}
                  {isWild && isLandedRow && !isMovingFast && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded bg-gradient-to-b from-[#ffe999] to-[#b58316] text-[#1a1102] text-[8px] font-black tracking-[0.18em] uppercase shadow-[0_2px_6px_rgba(0,0,0,0.9)] border border-[#fff6d6]/70">
                      WILD
                    </span>
                  )}

                  {/* Winning cell glowing corner brackets & radiant inner pulse */}
                  {isWin && (
                    <>
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,242,190,0.32) 0%, rgba(212,175,55,0.08) 62%, transparent 100%)",
                        }}
                      />
                      <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#fff7d6] rounded-tl-sm pointer-events-none" />
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#fff7d6] rounded-tr-sm pointer-events-none" />
                      <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#fff7d6] rounded-bl-sm pointer-events-none" />
                      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#fff7d6] rounded-br-sm pointer-events-none" />
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SlotColumn;

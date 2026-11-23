import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SlotColumn from "./SlotColumn";
import { SlotWinLine } from "./Types";
import {
  PAYLINES,
  REEL_VIEWPORT_HEIGHT,
} from "./slotConfig";

interface SlotMachineProps {
  grid: string[];
  spinId: number;
  resultReady: boolean;
  isSpinning: boolean;
  turbo: boolean;
  slamStopSeq: number;
  reel3Anticipation: boolean;
  stopDelays: [number, number, number];
  winLines: SlotWinLine[];
  hoveredPayline: string | null;
  onHoverPayline: (lineId: string | null) => void;
  onReelStopped: (colIndex: 0 | 1 | 2, landedWild: boolean) => void;
  onPullLever: () => void;
  leverPulledSeq: number;
  es: boolean;
}

const MARQUEE_BULB_COUNT = 13;

const Game: React.FC<SlotMachineProps> = ({
  grid,
  spinId,
  resultReady,
  isSpinning,
  turbo,
  slamStopSeq,
  reel3Anticipation,
  stopDelays,
  winLines,
  hoveredPayline,
  onHoverPayline,
  onReelStopped,
  onPullLever,
  leverPulledSeq,
  es,
}) => {
  const hasWin = !isSpinning && winLines.length > 0;
  const [cycleIdx, setCycleIdx] = useState<number>(-1); // -1 = show all winning lines together first

  // When multiple paylines win, celebrate all simultaneously for 1.6s then smoothly spotlight each line
  useEffect(() => {
    if (!hasWin) {
      setCycleIdx(-1);
      return;
    }
    setCycleIdx(-1);
    if (winLines.length <= 1) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startDelay = setTimeout(() => {
      setCycleIdx(0);
      intervalId = setInterval(() => {
        setCycleIdx((prev) => (prev + 1) % winLines.length);
      }, 1500);
    }, 1700);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [hasWin, winLines]);

  const activeWinLineIds = useMemo(() => {
    if (!hasWin) return new Set<string>();
    if (cycleIdx < 0 || winLines.length <= 1) {
      return new Set(winLines.map((w) => w.line));
    }
    const focused = winLines[cycleIdx];
    return new Set(focused ? [focused.line] : []);
  }, [hasWin, winLines, cycleIdx]);

  const allWinLineIds = useMemo(
    () => new Set(hasWin ? winLines.map((w) => w.line) : []),
    [hasWin, winLines]
  );

  const payoutByLineId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of winLines) map[w.line] = w.payout;
    return map;
  }, [winLines]);

  // Compute highlighted rows per column for win celebration and hover preview
  const winningRowsByCol = useMemo<[Set<number>, Set<number>, Set<number>]>(() => {
    const sets: [Set<number>, Set<number>, Set<number>] = [new Set(), new Set(), new Set()];
    if (!hasWin) return sets;
    for (const pl of PAYLINES) {
      if (activeWinLineIds.has(pl.id)) {
        sets[0].add(pl.rowsByCol[0]);
        sets[1].add(pl.rowsByCol[1]);
        sets[2].add(pl.rowsByCol[2]);
      }
    }
    return sets;
  }, [hasWin, activeWinLineIds]);

  const previewRowsByCol = useMemo<[Set<number>, Set<number>, Set<number>]>(() => {
    const sets: [Set<number>, Set<number>, Set<number>] = [new Set(), new Set(), new Set()];
    if (!hoveredPayline || isSpinning) return sets;
    const pl = PAYLINES.find((p) => p.id === hoveredPayline);
    if (pl) {
      sets[0].add(pl.rowsByCol[0]);
      sets[1].add(pl.rowsByCol[1]);
      sets[2].add(pl.rowsByCol[2]);
    }
    return sets;
  }, [hoveredPayline, isSpinning]);

  const bulbSpeed = hasWin ? 0.42 : reel3Anticipation ? 0.34 : isSpinning ? 0.55 : 1.7;

  const renderPaylinePip = (lineId: string, label: string, topClass: string) => {
    const isWinLine = allWinLineIds.has(lineId);
    const isFocusedWin = activeWinLineIds.has(lineId);
    const isHovered = hoveredPayline === lineId;
    const lit = isFocusedWin || isHovered;

    return (
      <button
        key={lineId}
        type="button"
        data-no-sfx
        onMouseEnter={() => onHoverPayline(lineId)}
        onMouseLeave={() => onHoverPayline(null)}
        onFocus={() => onHoverPayline(lineId)}
        onBlur={() => onHoverPayline(null)}
        onClick={() => onHoverPayline(hoveredPayline === lineId ? null : lineId)}
        title={`${es ? "Línea" : "Line"} #${label}`}
        aria-label={`${es ? "Línea" : "Line"} ${label}`}
        className={`absolute left-1/2 -translate-x-1/2 ${topClass} w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black transition-all duration-200 z-20 cursor-pointer ${
          lit
            ? "bg-gradient-to-b from-[#fff8d6] via-[#ffd966] to-[#b8860b] text-[#1a1204] scale-125 shadow-[0_0_14px_rgba(255,217,102,0.95)] ring-1 ring-white"
            : isWinLine
            ? "bg-[#7a5a12] text-[#ffe9a8] border border-[#ffd966] scale-110"
            : "bg-[#1a140a] text-[#c7a444]/85 border border-[#7c5e18] hover:border-[#ffe9a8] hover:text-[#ffe9a8] shadow-inner"
        }`}
      >
        {label}
      </button>
    );
  };

  const renderColumnPillar = (side: "left" | "right") => (
    <div
      style={{ height: `${REEL_VIEWPORT_HEIGHT}px` }}
      className="relative flex flex-col items-center justify-between w-6 sm:w-7 md:w-8 shrink-0 z-10 bg-gradient-to-r from-[#5e4610] via-[#eccf70] to-[#4e3809] border-x border-[#3a2a07] shadow-[inset_0_0_12px_rgba(0,0,0,0.5)]"
    >
      {/* Classical fluted grooves */}
      <div className="absolute inset-y-3 left-[20%] w-[10%] bg-black/28 rounded-full pointer-events-none" />
      <div className="absolute inset-y-3 left-[45%] w-[10%] bg-black/22 rounded-full pointer-events-none" />
      <div className="absolute inset-y-3 left-[70%] w-[10%] bg-black/28 rounded-full pointer-events-none" />

      {/* Top gilded Corinthian capital */}
      <div className="w-[126%] h-3.5 bg-gradient-to-b from-[#fff2c2] via-[#c79d2e] to-[#6b5012] rounded-b-sm border-b border-[#2b1f05] shadow-md z-10" />

      {/* Interactive Payline Number Pips embedded in the pillars */}
      {side === "left" ? (
        <>
          {renderPaylinePip("Diagonal 1", "4", "top-[6%]")}
          {renderPaylinePip("Horizontal 1", "1", "top-[16.5%]")}
          {renderPaylinePip("Horizontal 2", "2", "top-1/2 -translate-y-1/2")}
          {renderPaylinePip("Horizontal 3", "3", "bottom-[16.5%]")}
          {renderPaylinePip("Diagonal 2", "5", "bottom-[6%]")}
        </>
      ) : (
        <>
          {renderPaylinePip("Diagonal 2", "5", "top-[6%]")}
          {renderPaylinePip("Horizontal 1", "1", "top-[16.5%]")}
          {renderPaylinePip("Horizontal 2", "2", "top-1/2 -translate-y-1/2")}
          {renderPaylinePip("Horizontal 3", "3", "bottom-[16.5%]")}
          {renderPaylinePip("Diagonal 1", "4", "bottom-[6%]")}
        </>
      )}

      {/* Bottom gilded base plinth */}
      <div className="w-[126%] h-3.5 bg-gradient-to-t from-[#fff2c2] via-[#c79d2e] to-[#6b5012] rounded-t-sm border-t border-[#2b1f05] shadow-md z-10" />
    </div>
  );

  const renderBeam = (position: "top" | "bottom") => (
    <div
      className={`w-full h-9 sm:h-10 z-20 relative flex items-center justify-center bg-gradient-to-r from-[#1c150a] via-[#3e2f15] to-[#1c150a] border-y-[2px] border-[#d4af37] shadow-[0_6px_18px_rgba(0,0,0,0.88)] ${
        position === "top" ? "rounded-t-xl" : "rounded-b-xl"
      }`}
    >
      {/* Metallic bevel sheen */}
      <div className="absolute inset-x-3 top-1 h-[1px] bg-gradient-to-r from-transparent via-[#fff2c2]/65 to-transparent pointer-events-none" />
      <div className="absolute inset-x-3 bottom-1 h-[1px] bg-gradient-to-r from-transparent via-[#8a6b18]/65 to-transparent pointer-events-none" />

      {/* Chasing Golden Marquee Bulbs + Engraved Roman Medallion */}
      <div className="flex w-full items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3">
          {Array.from({ length: Math.floor(MARQUEE_BULB_COUNT / 2) }).map((_, i) => (
            <span
              key={`l-${i}`}
              className="slot-marquee-bulb w-2 h-2 rounded-full"
              style={{
                animationDuration: `${bulbSpeed}s`,
                animationDelay: `${(i * bulbSpeed) / 6}s`,
                background: hasWin
                  ? "radial-gradient(circle, #ffffff 0%, #ffd966 55%, #b45309 100%)"
                  : reel3Anticipation
                  ? "radial-gradient(circle, #fff3c4 0%, #fb923c 60%, #9a3412 100%)"
                  : "radial-gradient(circle, #fff6cf 0%, #e0b341 60%, #7a5b14 100%)",
                boxShadow: hasWin
                  ? "0 0 10px rgba(255,217,102,0.95)"
                  : "0 0 6px rgba(212,175,55,0.65)",
              }}
            />
          ))}
        </div>

        <div className="px-3 py-0.5 rounded-full bg-[#110d07] border border-[#d4af37]/50 text-[9px] sm:text-[10px] font-black tracking-[0.26em] uppercase text-[#f3d87a] shadow-[inset_0_1px_4px_rgba(0,0,0,0.9)]">
          {position === "top"
            ? reel3Anticipation
              ? es
                ? "⚡ ¡ATENCIÓN! ⚡"
                : "⚡ TEASE! ⚡"
              : "V · LINEAE"
            : "CRIXUS · IMPERIUM"}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {Array.from({ length: Math.floor(MARQUEE_BULB_COUNT / 2) }).map((_, i) => (
            <span
              key={`r-${i}`}
              className="slot-marquee-bulb w-2 h-2 rounded-full"
              style={{
                animationDuration: `${bulbSpeed}s`,
                animationDelay: `${((5 - i) * bulbSpeed) / 6}s`,
                background: hasWin
                  ? "radial-gradient(circle, #ffffff 0%, #ffd966 55%, #b45309 100%)"
                  : reel3Anticipation
                  ? "radial-gradient(circle, #fff3c4 0%, #fb923c 60%, #9a3412 100%)"
                  : "radial-gradient(circle, #fff6cf 0%, #e0b341 60%, #7a5b14 100%)",
                boxShadow: hasWin
                  ? "0 0 10px rgba(255,217,102,0.95)"
                  : "0 0 6px rgba(212,175,55,0.65)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // Determine which paylines to draw on the SVG overlay (winning lines OR hovered preview line)
  const visibleWinSpecs = hasWin
    ? PAYLINES.filter((p) => activeWinLineIds.has(p.id))
    : [];
  const previewSpec =
    !isSpinning && !hasWin && hoveredPayline
      ? PAYLINES.find((p) => p.id === hoveredPayline) || null
      : null;

  return (
    <div className="flex flex-col justify-center items-center w-full max-w-[426px] mx-auto relative">
      {/* Hidden SVG filter for directional vertical-only reel motion blur (never display:none) */}
      <svg
        aria-hidden="true"
        className="absolute w-0 h-0 overflow-hidden pointer-events-none"
      >
        <defs>
          <filter id="slotVerticalBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0 4.2" />
          </filter>
        </defs>
      </svg>

      {renderBeam("top")}

      <div className="flex relative items-stretch w-full justify-center">
        {renderColumnPillar("left")}

        {/* 3x3 Cylindrical Reel Viewport */}
        <motion.div
          style={{ height: `${REEL_VIEWPORT_HEIGHT}px` }}
          className="flex flex-1 relative z-0 overflow-hidden bg-[#060504]"
          animate={{
            boxShadow: reel3Anticipation
              ? [
                  "inset 0px 0px 36px rgba(0,0,0,0.92), inset 0px 0px 26px rgba(255,190,40,0.75)",
                  "inset 0px 0px 36px rgba(0,0,0,0.92), inset 0px 0px 44px rgba(255,120,20,0.95)",
                  "inset 0px 0px 36px rgba(0,0,0,0.92), inset 0px 0px 26px rgba(255,190,40,0.75)",
                ]
              : isSpinning
              ? [
                  "inset 0px 0px 38px rgba(0,0,0,0.92), inset 0px 0px 14px rgba(236,168,35,0.35)",
                  "inset 0px 0px 38px rgba(0,0,0,0.92), inset 0px 0px 24px rgba(236,168,35,0.65)",
                  "inset 0px 0px 38px rgba(0,0,0,0.92), inset 0px 0px 14px rgba(236,168,35,0.35)",
                ]
              : hasWin
              ? "inset 0px 0px 32px rgba(0,0,0,0.82), inset 0px 0px 46px rgba(255,215,0,0.48)"
              : "inset 0px 0px 38px rgba(0,0,0,0.94)",
          }}
          transition={{
            duration: reel3Anticipation ? 0.32 : isSpinning ? 0.55 : 0.7,
            repeat: isSpinning ? Infinity : 0,
          }}
        >
          {([
            [grid[0], grid[3], grid[6]],
            [grid[1], grid[4], grid[7]],
            [grid[2], grid[5], grid[8]],
          ] as [string, string, string][]).map((colSymbols, colIdx) => (
            <div className="flex flex-1 relative" key={colIdx}>
              <SlotColumn
                columnIndex={colIdx as 0 | 1 | 2}
                targetSymbols={colSymbols}
                spinId={spinId}
                resultReady={resultReady}
                stopDelayMs={stopDelays[colIdx]}
                turbo={turbo}
                slamStopSeq={slamStopSeq}
                anticipation={colIdx === 2 && reel3Anticipation}
                winningRows={winningRowsByCol[colIdx]}
                previewRows={previewRowsByCol[colIdx]}
                hasAnyWin={hasWin}
                onReelStopped={onReelStopped}
              />
              {colIdx !== 2 && (
                <div className="absolute right-0 inset-y-0 w-[2px] bg-gradient-to-b from-[#332508] via-[#d4af37]/80 to-[#332508] z-10 pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.9)]" />
              )}
            </div>
          ))}

          {/* 3D Cylindrical Drum Top & Bottom Curvature Shadows + Glass Specular Band */}
          <div
            className="absolute inset-x-0 top-0 h-12 pointer-events-none z-20"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.38) 48%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none z-20"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.38) 48%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 top-[24%] h-[14%] pointer-events-none z-20 opacity-45"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(255,244,210,0.06), transparent)",
            }}
          />

          {/* Interactive Hover Payline Preview Overlay */}
          {previewSpec && (
            <svg
              viewBox="0 0 300 300"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none z-30"
            >
              <line
                x1={previewSpec.x1}
                y1={previewSpec.y1}
                x2={previewSpec.x2}
                y2={previewSpec.y2}
                stroke="#ffd966"
                strokeWidth="4"
                strokeDasharray="8 6"
                strokeLinecap="round"
                strokeOpacity="0.88"
              />
              {previewSpec.nodes.map(([cx, cy], idx) => (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill="#1a1204"
                  stroke="#ffe9a8"
                  strokeWidth="2.5"
                />
              ))}
            </svg>
          )}

          {/* Crisp Animated Golden Winning Payline Beams + Per-Line Multiplier Badges */}
          <AnimatePresence>
            {visibleWinSpecs.length > 0 && (
              <svg
                key={`win-svg-${cycleIdx}`}
                viewBox="0 0 300 300"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none z-30"
              >
                <defs>
                  <filter id="slotGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {visibleWinSpecs.map((g, idx) => (
                  <g key={g.id}>
                    <motion.line
                      x1={g.x1}
                      y1={g.y1}
                      x2={g.x2}
                      y2={g.y2}
                      stroke="#f59e0b"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeOpacity="0.45"
                      filter="url(#slotGoldGlow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.32, delay: idx * 0.06 }}
                    />
                    <motion.line
                      x1={g.x1}
                      y1={g.y1}
                      x2={g.x2}
                      y2={g.y2}
                      stroke={g.color}
                      strokeWidth="4.8"
                      strokeLinecap="round"
                      filter="url(#slotGoldGlow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.32, delay: idx * 0.06 }}
                    />
                    <motion.line
                      x1={g.x1}
                      y1={g.y1}
                      x2={g.x2}
                      y2={g.y2}
                      stroke="#fffef5"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.32, delay: idx * 0.06 }}
                    />
                    {g.nodes.map(([cx, cy], nIdx) => (
                      <motion.circle
                        key={nIdx}
                        cx={cx}
                        cy={cy}
                        r="5.5"
                        fill="#fffbeb"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.35, 1], opacity: 1 }}
                        transition={{ duration: 0.32, delay: idx * 0.06 + nIdx * 0.05 }}
                      />
                    ))}
                  </g>
                ))}
              </svg>
            )}
          </AnimatePresence>

          {/* Floating Per-Line Multiplier Pills centered over active winning lines */}
          <AnimatePresence>
            {visibleWinSpecs.map((g, idx) => {
              const mult = payoutByLineId[g.id];
              if (!mult) return null;
              // Offset diagonal badges slightly vertically if multiple lines share center [150, 150]
              const topPct =
                g.id === "Horizontal 1"
                  ? 16.5
                  : g.id === "Horizontal 3"
                  ? 83.5
                  : g.id === "Diagonal 1" && visibleWinSpecs.length > 1
                  ? 38
                  : g.id === "Diagonal 2" && visibleWinSpecs.length > 1
                  ? 62
                  : 50;

              return (
                <div
                  key={`badge-${g.id}-${cycleIdx}`}
                  style={{
                    left: "50%",
                    top: `${topPct}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="absolute z-[35] pointer-events-none"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.45, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18, delay: idx * 0.06 }}
                    className="px-2.5 py-0.5 rounded-full bg-gradient-to-b from-[#3d2909]/95 to-[#160e03]/95 border border-[#ffe9a8] shadow-[0_0_18px_rgba(255,215,0,0.85),0_4px_12px_rgba(0,0,0,0.9)] flex items-center gap-1"
                  >
                    <span className="text-[9px] font-black text-[#d4af37]">#{g.num}</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-[#fff5cc]">
                      {mult}x
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {renderColumnPillar("right")}

        {/* Interactive 3D Mechanical Roman Golden Lever (desktop/tablet) */}
        <div className="hidden sm:flex flex-col items-center justify-center absolute -right-11 top-1/2 -translate-y-1/2 z-20">
          {/* Bronze mounting hub attached to right pillar */}
          <div className="relative w-7 h-16 rounded-r-xl bg-gradient-to-b from-[#7a5b14] via-[#d4af37] to-[#4e3709] border-y-2 border-r-2 border-[#ffe9a8]/60 shadow-[4px_6px_14px_rgba(0,0,0,0.85)] flex items-center justify-center">
            <div className="w-2.5 h-8 rounded-full bg-[#1a1204] shadow-inner" />

            {/* Pivoting Golden Arm + Crimson Ruby Knob */}
            <motion.button
              type="button"
              data-no-sfx
              disabled={isSpinning}
              onClick={onPullLever}
              title={es ? "Tirar de la palanca" : "Pull lever to spin"}
              aria-label={es ? "Tirar de la palanca" : "Pull lever to spin"}
              key={`lever-${leverPulledSeq}`}
              initial={leverPulledSeq > 0 ? { rotate: 0 } : false}
              animate={
                leverPulledSeq > 0
                  ? { rotate: [0, 56, -8, 0] }
                  : { rotate: 0 }
              }
              transition={{ duration: 0.62, times: [0, 0.38, 0.78, 1], ease: "easeInOut" }}
              style={{ transformOrigin: "6px 82px" }}
              className="absolute left-3 bottom-6 w-8 h-24 flex flex-col items-center cursor-pointer disabled:cursor-not-allowed group focus:outline-none"
            >
              {/* Crimson imperial pommel orb */}
              <span
                className="w-8 h-8 rounded-full border-2 border-[#ffe9a8] transition-transform group-hover:scale-110 shrink-0 relative"
                style={{
                  background:
                    "radial-gradient(circle at 32% 28%, #ff6b6b 0%, #c0262d 48%, #5e090d 100%)",
                  boxShadow:
                    "0 0 18px rgba(220,38,38,0.65), inset 0 -3px 6px rgba(0,0,0,0.65)",
                }}
              >
                <span className="absolute top-1 left-1.5 w-2.5 h-1.5 rounded-full bg-white/55 blur-[0.5px]" />
              </span>
              {/* Fluted solid gold shaft */}
              <span className="w-2.5 flex-1 -mt-1 rounded-b-full bg-gradient-to-r from-[#6b4f10] via-[#fff2c2] to-[#5e440c] shadow-[2px_4px_10px_rgba(0,0,0,0.75)]" />
            </motion.button>
          </div>
        </div>
      </div>

      {renderBeam("bottom")}
    </div>
  );
};

export default Game;

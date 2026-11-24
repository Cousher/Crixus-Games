import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MINES_ASSETS } from "./minesUtils";

export type TileState = "hidden" | "gem" | "unrevealedGem" | "mine" | "mineHit";

interface MineTileProps {
  index: number;
  state: TileState;
  inRound: boolean;
  roundOver: boolean;
  isRevealing: boolean;
  isTargeted: boolean;
  rippleDelay: number;
  popMultiplier?: number | null;
  onSelect: (index: number) => void;
}

const GEM_SHARDS = [
  { id: 0, dx: -26, dy: -26 },
  { id: 1, dx: 26, dy: -24 },
  { id: 2, dx: -30, dy: 8 },
  { id: 3, dx: 30, dy: 10 },
  { id: 4, dx: -14, dy: 28 },
  { id: 5, dx: 16, dy: 26 },
];

const BLAST_SPARKS = [
  { id: 0, dx: -34, dy: -32 },
  { id: 1, dx: 0, dy: -38 },
  { id: 2, dx: 34, dy: -30 },
  { id: 3, dx: -38, dy: 2 },
  { id: 4, dx: 38, dy: 4 },
  { id: 5, dx: -30, dy: 34 },
  { id: 6, dx: 4, dy: 38 },
  { id: 7, dx: 32, dy: 32 },
];

const MineTile: React.FC<MineTileProps> = ({
  index,
  state,
  inRound,
  roundOver,
  isRevealing,
  isTargeted,
  rippleDelay,
  popMultiplier,
  onSelect,
}) => {
  const isHidden = state === "hidden";
  const isGem = state === "gem";
  const isUnrevealedGem = state === "unrevealedGem";
  const isMine = state === "mine";
  const isMineHit = state === "mineHit";

  const interactive = inRound && isHidden && !isRevealing;

  return (
    <div className="aspect-square relative" style={{ perspective: "600px" }}>
      <motion.button
        type="button"
        disabled={!interactive}
        data-no-sfx
        onClick={() => onSelect(index)}
        aria-label={`Tile ${index + 1}`}
        whileHover={interactive ? { y: -3, scale: 1.03 } : undefined}
        whileTap={interactive ? { y: 1, scale: 0.96 } : undefined}
        animate={
          isMineHit
            ? { x: [0, -7, 7, -5, 5, -2, 2, 0], scale: [1, 1.08, 1] }
            : isTargeted
            ? { scale: [1, 1.07, 1] }
            : { x: 0, scale: 1 }
        }
        transition={
          isMineHit
            ? { duration: 0.45 }
            : isTargeted
            ? { duration: 0.35 }
            : { duration: 0.2 }
        }
        className={`w-full h-full relative rounded-xl sm:rounded-2xl flex items-center justify-center select-none overflow-hidden transition-shadow duration-200 ${
          isGem
            ? "ring-2 ring-emerald-300/95 shadow-[0_0_24px_rgba(16,185,129,0.58),inset_0_0_16px_rgba(110,231,183,0.35)] bg-[#061810]"
            : isUnrevealedGem
            ? "ring-1 ring-emerald-500/30 bg-[#07120d]"
            : isMineHit
            ? "mines-fuse-pulse ring-2 ring-[#fecaca] bg-[#2a0709]"
            : isMine
            ? "ring-1 ring-[#ef4444]/65 shadow-[0_0_16px_rgba(220,38,38,0.3)] bg-[#190708]"
            : `border border-[#5a451f] border-b-[4px] border-b-[#0a0704] bg-[#16110b] shadow-[0_6px_14px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,233,168,0.2)] ${
                interactive
                  ? "cursor-pointer hover:border-[#ffd966] hover:shadow-[0_0_22px_rgba(212,175,55,0.42),0_10px_18px_rgba(0,0,0,0.85)]"
                  : roundOver
                  ? "opacity-45 cursor-default"
                  : "opacity-90 cursor-default"
              } ${isRevealing ? "border-[#ffe9a8] shadow-[0_0_24px_rgba(255,217,102,0.7)]" : ""}`
        }`}
      >
        {/* HIDDEN CARVED ROMAN STONE SLAB */}
        {isHidden && (
          <>
            <img
              src={MINES_ASSETS.stoneTile}
              alt=""
              draggable={false}
              className={`w-full h-full object-cover select-none transition-transform duration-300 ${
                interactive ? "group-hover:scale-105" : ""
              } ${isRevealing ? "brightness-125 scale-95" : ""}`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/35 pointer-events-none" />

            {/* Subtle pulsing torchlock highlight when revealing or random-targeted */}
            {(isRevealing || isTargeted) && (
              <motion.div
                initial={{ opacity: 0.25 }}
                animate={{ opacity: [0.35, 0.9, 0.35] }}
                transition={{ duration: 0.45, repeat: Infinity }}
                className="absolute inset-0 border-2 border-[#ffe9a8] rounded-xl sm:rounded-2xl pointer-events-none"
                style={{
                  boxShadow: "inset 0 0 18px rgba(255,217,102,0.6)",
                }}
              />
            )}
          </>
        )}

        {/* REVEALED IMPERIAL EMERALD GEM (USER PICKED) */}
        {isGem && (
          <motion.div
            key={`gem-${index}`}
            initial={{ scale: 0.35, rotateY: -78, opacity: 0.3 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="relative w-full h-full"
          >
            <img
              src={MINES_ASSETS.gem}
              alt="Gem"
              draggable={false}
              className="w-full h-full object-cover select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 via-transparent to-white/15 pointer-events-none" />

            {/* Living Emerald Specular Sheen */}
            <div
              className="mines-gem-sheen absolute inset-y-0 -left-1/2 w-1/2 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(220,255,238,0.55), transparent)",
              }}
            />

            {/* Gilded corner filigree brackets */}
            <span className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-emerald-200/90 rounded-tl-sm pointer-events-none" />
            <span className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-emerald-200/90 rounded-tr-sm pointer-events-none" />
            <span className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-emerald-200/90 rounded-bl-sm pointer-events-none" />
            <span className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-emerald-200/90 rounded-br-sm pointer-events-none" />
          </motion.div>
        )}

        {/* UNREVEALED SAFE GEM (SOLVED END-OF-ROUND PEEK) */}
        {isUnrevealedGem && (
          <motion.div
            key={`unrev-gem-${index}`}
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 0.94, opacity: 0.36 }}
            transition={{ duration: 0.3, delay: rippleDelay, ease: "easeOut" }}
            className="relative w-full h-full"
          >
            <img
              src={MINES_ASSETS.gem}
              alt=""
              draggable={false}
              className="w-full h-full object-cover select-none saturate-75"
            />
          </motion.div>
        )}

        {/* DETONATED MINE (EPICENTER BLAST) */}
        {isMineHit && (
          <motion.div
            key={`hit-${index}`}
            initial={{ scale: 0.4, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 16 }}
            className="relative w-full h-full"
          >
            <img
              src={MINES_ASSETS.mine}
              alt="Mine"
              draggable={false}
              className="w-full h-full object-cover select-none brightness-115 contrast-110"
            />
            {/* Blazing initial flash */}
            <motion.div
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-orange-500 to-red-700 pointer-events-none"
            />
          </motion.div>
        )}

        {/* OTHER REVEALED MINES (STAGGERED RADIAL RIPPLE) */}
        {isMine && (
          <motion.div
            key={`mine-${index}`}
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.85 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: rippleDelay,
            }}
            className="relative w-full h-full"
          >
            <img
              src={MINES_ASSETS.mine}
              alt="Mine"
              draggable={false}
              className="w-full h-full object-cover select-none brightness-90"
            />
            <div className="absolute inset-0 bg-red-950/25 pointer-events-none" />
          </motion.div>
        )}
      </motion.button>

      {/* OVERFLOWING VFX LAYER: Emerald Shards + Expanding Shockwave Ring + Floating Multiplier */}
      <AnimatePresence>
        {isGem && popMultiplier != null && (
          <div
            key={`gem-vfx-${index}-${popMultiplier}`}
            className="absolute inset-0 pointer-events-none z-30 overflow-visible flex items-center justify-center"
          >
            {/* Radial Emerald Shockwave Ring */}
            <motion.span
              initial={{ scale: 0.45, opacity: 0.9 }}
              animate={{ scale: 1.65, opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="absolute w-full h-full rounded-2xl border-2 border-emerald-300"
            />

            {/* Sparkling Emerald & Gold Shards */}
            {GEM_SHARDS.map((s) => (
              <motion.span
                key={s.id}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: s.dx, y: s.dy, scale: 0, opacity: 0 }}
                transition={{ duration: 0.52, ease: "easeOut" }}
                className={`absolute w-1.5 h-1.5 rounded-full ${
                  s.id % 2 === 0
                    ? "bg-emerald-300 shadow-[0_0_6px_#34d399]"
                    : "bg-[#ffe999] shadow-[0_0_6px_#ffd966]"
                }`}
              />
            ))}

            {/* Floating Step Multiplier Tag */}
            <motion.div
              initial={{ y: 4, scale: 0.6, opacity: 0 }}
              animate={{ y: -30, scale: 1, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.95, times: [0, 0.2, 0.72, 1], ease: "easeOut" }}
              className="px-2 py-0.5 rounded-full bg-[#062015]/95 border border-emerald-300/90 shadow-[0_0_14px_rgba(16,185,129,0.75)] text-[10px] sm:text-xs font-black font-mono text-emerald-200 whitespace-nowrap"
            >
              x{popMultiplier.toFixed(2)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERFLOWING BLAST VFX ON MINE HIT */}
      <AnimatePresence>
        {isMineHit && (
          <div
            key={`blast-vfx-${index}`}
            className="absolute inset-0 pointer-events-none z-40 overflow-visible flex items-center justify-center"
          >
            <motion.span
              initial={{ scale: 0.35, opacity: 1 }}
              animate={{ scale: 2.35, opacity: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="absolute w-full h-full rounded-full border-[3px] border-orange-400 shadow-[0_0_24px_rgba(239,68,68,0.9)]"
            />
            {BLAST_SPARKS.map((s) => (
              <motion.span
                key={s.id}
                initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                animate={{ x: s.dx, y: s.dy, scale: 0, opacity: 0 }}
                transition={{ duration: 0.58, ease: "easeOut" }}
                className={`absolute w-2 h-2 rounded-full ${
                  s.id % 2 === 0
                    ? "bg-orange-400 shadow-[0_0_8px_#f97316]"
                    : "bg-yellow-200 shadow-[0_0_8px_#fde047]"
                }`}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MineTile;

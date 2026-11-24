import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import SpinningLogic from "./SpinningLogic";

interface ClockPointerProps {
  successRate: number;
  spinning: boolean;
  success: boolean;
  stopAngle: number;
  finished: boolean;
  totalDuration?: number;
}

const ROMAN_NUMERALS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

const FORGE_BURST_SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const r = 115 + (i % 3) * 32;
  return { id: i, tx: Math.cos(angle) * r, ty: Math.sin(angle) * r, size: 4 + (i % 2) * 2.5 };
});

const ClockPointer: React.FC<ClockPointerProps> = ({
  successRate,
  spinning,
  success,
  stopAngle,
  finished,
  totalDuration = 5500,
}) => {
  const { t } = useTranslation();

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const clampedRate = Math.max(0, Math.min(1, successRate));
  const strokeLength = circumference * clampedRate;

  // Exact SVG coordinates of the clockwise boundary edge so near-misses are crystal clear
  const endAngleRad = ((clampedRate * 360 - 90) * Math.PI) / 180;
  const endMarkerX = 100 + radius * Math.cos(endAngleRad);
  const endMarkerY = 100 + radius * Math.sin(endAngleRad);

  return (
    <div className="relative w-[264px] h-[264px] sm:w-[314px] sm:h-[314px] md:w-[356px] md:h-[356px] flex items-center justify-center select-none">
      {/* Ambient molten-forge halo behind the wheel */}
      <div
        className={`absolute inset-2 rounded-full blur-2xl sm:blur-3xl transition-all duration-700 pointer-events-none ${
          finished
            ? success
              ? "bg-emerald-400/40 scale-110"
              : "bg-red-600/40 scale-105"
            : spinning
            ? "bg-[#f59e0b]/42 scale-110"
            : clampedRate > 0
            ? "bg-[#d4af37]/24"
            : "bg-[#d4af37]/12"
        }`}
      />

      {/* Slowly orbiting outer forged rune halo */}
      <svg
        viewBox="0 0 220 220"
        className="forge-rune-spin absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] pointer-events-none opacity-45"
        style={{ animationDuration: spinning ? "11s" : "44s" }}
      >
        <circle
          cx="110"
          cy="110"
          r="105"
          fill="none"
          stroke={finished ? (success ? "#34d399" : "#ef4444") : "#d4af37"}
          strokeWidth="1.2"
          strokeDasharray="6 10 2 10"
        />
      </svg>

      {/* Impact Shockwave & Forge Sparks Burst on Completion */}
      <AnimatePresence>
        {finished && (
          <div
            key={`wheel-burst-${stopAngle}-${success}`}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0.95 }}
              animate={{ scale: 1.55, opacity: 0 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className={`absolute w-56 h-56 rounded-full border-[3px] ${
                success
                  ? "border-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.9)]"
                  : "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.85)]"
              }`}
            />
            {FORGE_BURST_SPARKS.map((s) => (
              <motion.span
                key={s.id}
                initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                animate={{ x: s.tx, y: s.ty, scale: 0, opacity: 0 }}
                transition={{ duration: 0.78, ease: "easeOut" }}
                style={{ width: s.size, height: s.size }}
                className={`absolute rounded-full ${
                  success
                    ? s.id % 2 === 0
                      ? "bg-emerald-300 shadow-[0_0_8px_#34d399]"
                      : "bg-[#fff3b0] shadow-[0_0_8px_#ffd966]"
                    : s.id % 2 === 0
                    ? "bg-orange-400 shadow-[0_0_8px_#f97316]"
                    : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                }`}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Colosseum Imperial Fortune Wheel SVG */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 w-full h-full drop-shadow-[0_20px_42px_rgba(0,0,0,0.94)]"
      >
        <defs>
          <linearGradient id="bezelGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF5C8" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#8A5A10" />
            <stop offset="100%" stopColor="#F5C451" />
          </linearGradient>
          <radialGradient id="dialBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#231a10" />
            <stop offset="68%" stopColor="#100c07" />
            <stop offset="100%" stopColor="#060503" />
          </radialGradient>
          <linearGradient id="successArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF4B8" />
            <stop offset="48%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>

        {/* Outer Forged Bronze & Gold Bezel */}
        <circle cx="100" cy="100" r="97" fill="url(#dialBg)" stroke="url(#bezelGold)" strokeWidth="4" />
        <circle cx="100" cy="100" r="91.5" fill="none" stroke="#63420e" strokeWidth="1" strokeDasharray="3 2" />
        <circle cx="100" cy="100" r="81" fill="none" stroke="url(#bezelGold)" strokeWidth="1.3" opacity="0.68" />

        {/* 12 Roman Numerals & Perimeter Gold Rivets */}
        {ROMAN_NUMERALS.map((num, i) => {
          const deg = i * 30 - 90;
          const rad = (deg * Math.PI) / 180;
          const nx = 100 + 86.5 * Math.cos(rad);
          const ny = 100 + 86.5 * Math.sin(rad);
          const sx = 100 + 95 * Math.cos(((i * 30 - 75) * Math.PI) / 180);
          const sy = 100 + 95 * Math.sin(((i * 30 - 75) * Math.PI) / 180);
          return (
            <g key={num}>
              <text
                x={nx}
                y={ny}
                textAnchor="middle"
                dominantBaseline="central"
                fill={i === 0 ? "#FFF5C8" : "#D4A642"}
                fontSize="6.3"
                fontWeight="800"
                fontFamily="serif"
                transform={`rotate(${i * 30}, ${nx}, ${ny})`}
              >
                {num}
              </text>
              <circle cx={sx} cy={sy} r="1.2" fill="#FFEBA3" opacity="0.78" />
            </g>
          );
        })}

        {/* 60 Fine Tick Marks inside the dial */}
        {Array.from({ length: 60 }).map((_, i) => {
          const deg = i * 6;
          const isMajor = i % 5 === 0;
          return (
            <line
              key={i}
              x1="100"
              y1={isMajor ? "35.5" : "37.5"}
              x2="100"
              y2="40"
              stroke={isMajor ? "#E5BE4B" : "#4a3818"}
              strokeWidth={isMajor ? "1.2" : "0.6"}
              opacity={isMajor ? "0.85" : "0.5"}
              transform={`rotate(${deg} 100 100)`}
            />
          );
        })}

        {/* Probability Track Background (Molten Crimson Burn Zone) */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(220, 38, 38, 0.22)"
          strokeWidth="11"
        />

        {/* Active Success Probability Arc (Sweeps clockwise from 12 o'clock) */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#successArcGrad)"
          strokeWidth="11"
          strokeLinecap={clampedRate > 0.01 ? "butt" : "round"}
          strokeDasharray={`${strokeLength} ${circumference}`}
          transform="rotate(-90 100 100)"
          style={{
            transition: "stroke-dasharray 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
            filter:
              clampedRate > 0
                ? "drop-shadow(0 0 8px rgba(245, 158, 11, 0.78))"
                : "none",
          }}
        />

        {/* Crisp Glowing Threshold Pip at the exact end of the Win Arc */}
        {clampedRate > 0.005 && clampedRate < 0.995 && (
          <circle
            cx={endMarkerX}
            cy={endMarkerY}
            r="3.2"
            fill="#FFFCE6"
            stroke="#10B981"
            strokeWidth="1.4"
          />
        )}

        {/* Top 12 o'clock Origin Crown Marker */}
        <polygon
          points="100,19 95.5,11 104.5,11"
          fill="#FFF5C8"
          stroke="#784B06"
          strokeWidth="0.7"
        />

        {/* Inner Ornamental Gilded Ring */}
        <circle cx="100" cy="100" r="56" fill="none" stroke="url(#bezelGold)" strokeWidth="1.6" opacity="0.78" />
      </svg>

      {/* Spinning Golden Gladiator Spear Pointer */}
      <SpinningLogic stopAngle={stopAngle} spinning={spinning} totalDuration={totalDuration} />

      {/* Center Imperial Forge Core Medallion */}
      <div
        className={`relative z-30 w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center text-center px-3 border-2 transition-all duration-500 shadow-[0_0_32px_rgba(0,0,0,0.96),inset_0_0_22px_rgba(0,0,0,0.92)] ${
          finished
            ? success
              ? "bg-gradient-to-b from-[#133220] to-[#07140c] border-emerald-300 shadow-[0_0_40px_rgba(37,209,96,0.65)]"
              : "bg-gradient-to-b from-[#341112] to-[#130606] border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.62)]"
            : spinning
            ? "bg-gradient-to-b from-[#2f210c] via-[#181006] to-[#0a0703] border-[#ffe28a] shadow-[0_0_34px_rgba(245,158,11,0.5)]"
            : "bg-gradient-to-b from-[#241b10] via-[#140f09] to-[#090704] border-[#d4af37]/80"
        }`}
      >
        <div className="absolute inset-1.5 rounded-full border border-[#d4af37]/30 pointer-events-none" />

        {finished ? (
          <div className="flex flex-col items-center justify-center gap-1">
            <span
              className={`text-xs sm:text-sm md:text-base font-black uppercase tracking-wider leading-tight ${
                success
                  ? "text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.95)]"
                  : "text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.9)]"
              }`}
            >
              {success ? t("games.upgradeSuccess") : t("games.upgradeFailed")}
            </span>
            <span className="text-[11px] text-[#cbb88b] font-mono font-bold tabular-nums">
              {`${(clampedRate * 100).toFixed(2)}%`}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <span
              className="text-xl sm:text-2xl md:text-3xl font-black font-mono tabular-nums tracking-tight text-[#FFF5C8]"
              style={{ textShadow: "0 0 18px rgba(245, 178, 45, 0.7)" }}
            >
              {`${(clampedRate * 100).toFixed(2)}%`}
            </span>
            <span className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#d4a642] font-black mt-1">
              {spinning ? t("games.spinning") : t("upg.chance")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockPointer;

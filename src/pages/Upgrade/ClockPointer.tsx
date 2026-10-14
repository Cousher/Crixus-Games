import React from "react";
import { useTranslation } from "react-i18next";
import SpinningLogic from "./SpinningLogic";

interface ClockPointerProps {
    successRate: number;
    spinning: boolean;
    success: boolean;
    stopAngle: number;
    finished: boolean;
}

const ROMAN_NUMERALS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

const ClockPointer: React.FC<ClockPointerProps> = ({
    successRate,
    spinning,
    success,
    stopAngle,
    finished,
}) => {
    const { t } = useTranslation();

    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const clampedRate = Math.max(0, Math.min(1, successRate));
    const strokeLength = circumference * clampedRate;

    return (
        <div className="relative w-[320px] h-[320px] md:w-[370px] md:h-[370px] flex items-center justify-center select-none">
            {/* Ambient radial glow behind the wheel */}
            <div
                className={`absolute inset-4 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
                    finished
                        ? success
                            ? "bg-emerald-500/25"
                            : "bg-red-600/25"
                        : spinning
                        ? "bg-[#ECA823]/30 scale-105"
                        : "bg-[#ECA823]/15"
                }`}
            />

            {/* Colosseum Fortune Wheel SVG */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
                <defs>
                    <linearGradient id="bezelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FCE79C" />
                        <stop offset="35%" stopColor="#D4AF37" />
                        <stop offset="70%" stopColor="#8A5A10" />
                        <stop offset="100%" stopColor="#F5C451" />
                    </linearGradient>
                    <radialGradient id="dialBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#1e170f" />
                        <stop offset="70%" stopColor="#0f0b07" />
                        <stop offset="100%" stopColor="#070503" />
                    </radialGradient>
                    <linearGradient id="successArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FDE68A" />
                        <stop offset="50%" stopColor="#ECA823" />
                        <stop offset="100%" stopColor="#25D160" />
                    </linearGradient>
                </defs>

                {/* Outer Metallic Gold & Bronze Bezel */}
                <circle cx="100" cy="100" r="97" fill="url(#dialBg)" stroke="url(#bezelGold)" strokeWidth="3.5" />
                <circle cx="100" cy="100" r="92" fill="none" stroke="#5c3d0c" strokeWidth="1" strokeDasharray="3 2" />
                <circle cx="100" cy="100" r="81" fill="none" stroke="url(#bezelGold)" strokeWidth="1.2" opacity="0.6" />

                {/* 12 Roman Numerals & Perimeter Studs */}
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
                                fill={i === 0 ? "#FCE79C" : "#C89D3C"}
                                fontSize="6.2"
                                fontWeight="800"
                                fontFamily="serif"
                                transform={`rotate(${i * 30}, ${nx}, ${ny})`}
                            >
                                {num}
                            </text>
                            <circle cx={sx} cy={sy} r="1.1" fill="#FCE79C" opacity="0.7" />
                        </g>
                    );
                })}

                {/* 60 Fine Tick Marks inside the track */}
                {Array.from({ length: 60 }).map((_, i) => {
                    const deg = i * 6;
                    const isMajor = i % 5 === 0;
                    return (
                        <line
                            key={i}
                            x1="100"
                            y1={isMajor ? "36" : "37.5"}
                            x2="100"
                            y2="40"
                            stroke={isMajor ? "#D4AF37" : "#4a3818"}
                            strokeWidth={isMajor ? "1.1" : "0.6"}
                            opacity={isMajor ? "0.8" : "0.5"}
                            transform={`rotate(${deg} 100 100)`}
                        />
                    );
                })}

                {/* Probability Track Background (Risk Zone) */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="rgba(220, 38, 38, 0.14)"
                    strokeWidth="10"
                />

                {/* Active Success Probability Arc (Starts at 12 o'clock and sweeps clockwise) */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="url(#successArcGrad)"
                    strokeWidth="10"
                    strokeLinecap={clampedRate > 0.01 ? "butt" : "round"}
                    strokeDasharray={`${strokeLength} ${circumference}`}
                    transform="rotate(-90 100 100)"
                    style={{
                        transition: "stroke-dasharray 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                        filter: clampedRate > 0 ? "drop-shadow(0 0 6px rgba(236, 168, 35, 0.65))" : "none",
                    }}
                />

                {/* Top 12 o'clock Origin Crown Marker */}
                <polygon
                    points="100,19 96,12 104,12"
                    fill="#FCE79C"
                    stroke="#784B06"
                    strokeWidth="0.6"
                />

                {/* Inner Ornamental Ring */}
                <circle cx="100" cy="100" r="56" fill="none" stroke="url(#bezelGold)" strokeWidth="1.5" opacity="0.7" />
            </svg>

            {/* Spinning Golden Gladiator Spear Pointer */}
            <SpinningLogic stopAngle={stopAngle} spinning={spinning} />

            {/* Center Imperial Medallion */}
            <div
                className={`relative z-30 w-36 h-36 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center text-center px-3 border-2 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.95),inset_0_0_20px_rgba(0,0,0,0.9)] ${
                    finished
                        ? success
                            ? "bg-gradient-to-b from-[#132a1c] to-[#08120c] border-emerald-400 shadow-[0_0_35px_rgba(37,209,96,0.45)]"
                            : "bg-gradient-to-b from-[#2d1212] to-[#120606] border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.45)]"
                        : "bg-gradient-to-b from-[#231b11] via-[#140f09] to-[#090704] border-[#d4af37]/70"
                }`}
            >
                {/* Subtle inner gold ring */}
                <div className="absolute inset-1.5 rounded-full border border-[#d4af37]/25 pointer-events-none" />

                {finished ? (
                    <div className="flex flex-col items-center justify-center gap-1 animate-fade-in">
                        <span
                            className={`text-sm md:text-base font-black uppercase tracking-wider leading-tight ${
                                success
                                    ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                                    : "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]"
                            }`}
                        >
                            {success ? t("games.upgradeSuccess") : t("games.upgradeFailed")}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold tabular-nums">
                            {`${(clampedRate * 100).toFixed(2)}%`}
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center">
                        <span
                            className="text-2xl md:text-3xl font-black tabular-nums tracking-tight text-[#FCE79C]"
                            style={{ textShadow: "0 0 15px rgba(236, 168, 35, 0.55)" }}
                        >
                            {`${(clampedRate * 100).toFixed(2)}%`}
                        </span>
                        <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#c89d3c] font-bold mt-1">
                            {spinning ? t("games.spinning") : t("upg.chance")}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClockPointer;



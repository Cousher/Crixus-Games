import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface GameContainerProps {
    crashPoint: number | null;
    multiplier: number;
    gameEnded: boolean;
    countDown: number;
    history: { crashPoint: number }[];
    userCashedOut?: boolean;
    userMultiplier?: number;
}

type Phase = "flying" | "crashed" | "waiting";

// Chariot position (in % of the arena) for a given multiplier.
// Fast climb at the beginning, then cruises smoothly near the shield — Spaceman style.
const chariotPosition = (m: number) => {
    const p = 1 - 1 / (1 + Math.max(m - 1, 0) * 0.9);
    return {
        x: 13 + p * 45, // 13% -> 58%
        y: 80 - p * 38, // 80% -> 42%
    };
};

const GameContainer: React.FC<GameContainerProps> = React.memo(
    ({ crashPoint, multiplier, gameEnded, countDown, history, userCashedOut, userMultiplier }) => {
        const { t } = useTranslation();

        const phase: Phase = !gameEnded ? "flying" : countDown > 9.2 ? "crashed" : "waiting";
        const shownMultiplier = gameEnded ? (crashPoint ?? multiplier) : multiplier;
        const pos = chariotPosition(phase === "waiting" ? 1 : shownMultiplier);

        // Coarse speed tiers keep CSS loops smooth without constant restarts
        const speedTier = phase !== "flying" ? 0 : multiplier < 2 ? 1 : multiplier < 5 ? 2 : 3;
        const bgDuration = [95, 42, 24, 14][speedTier];
        const starDuration = [5, 2.2, 1.4, 0.9][speedTier];

        // Camera rises smoothly while flying, capped safely so sky never separates
        const cameraRise = phase === "flying" ? Math.min((multiplier - 1) * 28, 120) : 0;

        // 10 GPU-composited CSS streaks (lightweight on mobile)
        const stars = useMemo(
            () =>
                Array.from({ length: 10 }, (_, i) => ({
                    id: i,
                    top: 6 + ((i * 9.3) % 82),
                    left: 35 + ((i * 19) % 70),
                    size: 1.5 + (i % 3) * 0.7,
                    delay: -(i * 0.37),
                    len: 26 + (i % 4) * 14,
                })),
            []
        );

        const multiplierColor = () => {
            if (gameEnded) return "#ff4d5a";
            if (multiplier >= 10) return "#ffe27a";
            if (multiplier >= 2) return "#4ade80";
            return "#ffffff";
        };

        // Trail from bottom-left to the rear of the chariot (viewBox 0..100)
        const trailEndX = pos.x - 8;
        const trailEndY = pos.y + 8;
        const trailPath = `M -2 102 Q ${trailEndX * 0.55} 100 ${trailEndX} ${trailEndY}`;

        const recentHistory = history.slice(-18);

        return (
            <div className="flex flex-col relative w-full min-w-0 flex-1">
                <div className="flex p-3 sm:p-5 w-full">
                    {/* Screen shake on crash */}
                    <motion.div
                        animate={
                            phase === "crashed"
                                ? { x: [-10, 10, -7, 7, -3, 3, 0], y: [-4, 4, -3, 3, 0] }
                                : { x: 0, y: 0 }
                        }
                        transition={{ duration: 0.4 }}
                        className="flex rounded-2xl sm:rounded-3xl w-full h-[310px] sm:h-[380px] md:h-[430px] relative overflow-hidden bg-[#06040b] border-2 border-[#d4af37]/55 ring-1 ring-[#d4af37]/20 shadow-[inset_0_0_50px_rgba(0,0,0,0.85),0_12px_40px_rgba(0,0,0,0.65)]"
                    >
                        {/* Countdown bar along top when waiting */}
                        {phase === "waiting" && countDown > 0 && (
                            <div className="absolute top-0 inset-x-0 z-30 h-1.5 bg-black/50">
                                <div
                                    className="h-full bg-gradient-to-r from-[#b8901f] via-[#ffe9a8] to-[#b8901f] shadow-[0_0_12px_rgba(255,217,102,0.75)] transition-[width] duration-100 ease-linear"
                                    style={{ width: `${Math.max(0, Math.min(100, (countDown / 11.5) * 100))}%` }}
                                />
                            </div>
                        )}

                        {/* Deep space sky backdrop (prevents any seam when camera rises high) */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background:
                                    "radial-gradient(80% 60% at 50% 15%, rgba(64,28,74,0.55), transparent 70%), linear-gradient(180deg, #05040b 0%, #14091e 55%, #2a1026 100%)",
                            }}
                        />

                        {/* ===== Layer 1: GPU-composited seamless parallax arena sky ===== */}
                        <div
                            className="absolute inset-x-0 -top-[140px] bottom-0 transition-transform duration-500 ease-out will-change-transform"
                            style={{ transform: `translate3d(0, ${cameraRise}px, 0)` }}
                        >
                            <div
                                className="crash-sky-loop absolute inset-y-0 left-0 flex h-full w-[200%]"
                                style={{ animationDuration: `${bgDuration}s` }}
                            >
                                <img
                                    src="/images/crash/arena_sky.jpg"
                                    alt=""
                                    className="h-full w-1/2 object-cover object-bottom select-none"
                                    draggable={false}
                                />
                                <img
                                    src="/images/crash/arena_sky.jpg"
                                    alt=""
                                    className="h-full w-1/2 object-cover object-bottom select-none -scale-x-100"
                                    draggable={false}
                                />
                            </div>
                            {/* Top feather gradient so sky merges smoothly into deep cosmos */}
                            <div
                                className="absolute inset-x-0 top-0 h-36 pointer-events-none"
                                style={{
                                    background:
                                        "linear-gradient(to bottom, #06040b 0%, rgba(12,6,20,0.7) 45%, transparent 100%)",
                                }}
                            />
                        </div>

                        {/* Darken vignette on crash/waiting */}
                        <div
                            className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-500"
                            style={{ opacity: phase === "flying" ? 0.14 : 0.48 }}
                        />

                        {/* ===== Layer 2: Lightweight GPU speed streaks ===== */}
                        {phase === "flying" && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {stars.map((s) => (
                                    <span
                                        key={s.id}
                                        className="crash-streak absolute rounded-full bg-gradient-to-r from-transparent via-[#e6ca6a] to-white"
                                        style={{
                                            top: `${s.top}%`,
                                            left: `${s.left}%`,
                                            height: s.size,
                                            width: s.len,
                                            animationDuration: `${starDuration}s`,
                                            animationDelay: `${s.delay}s`,
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* ===== Layer 3: GPU sunburst + golden shield with live multiplier ===== */}
                        <div className="absolute left-1/2 top-[25%] sm:top-[24%] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                            <div
                                className="crash-sunburst absolute left-1/2 top-1/2 h-[360px] w-[360px] sm:h-[480px] sm:w-[480px] rounded-full transition-opacity duration-500"
                                style={{
                                    opacity: phase === "flying" ? 0.9 : 0.3,
                                    background:
                                        phase === "crashed"
                                            ? "repeating-conic-gradient(from 0deg, rgba(220,38,38,0.28) 0deg 9deg, transparent 9deg 18deg)"
                                            : "repeating-conic-gradient(from 0deg, rgba(212,175,55,0.24) 0deg 9deg, transparent 9deg 18deg)",
                                    WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 65%)",
                                    maskImage: "radial-gradient(circle, black 15%, transparent 65%)",
                                }}
                            />
                            <div
                                className={`relative flex items-center justify-center w-[132px] h-[132px] sm:w-[168px] sm:h-[168px] md:w-[188px] md:h-[188px] transition-transform duration-300 ${
                                    phase === "crashed" ? "scale-110" : "scale-100"
                                }`}
                            >
                                <img
                                    src="/images/crash/gold_shield.png"
                                    alt=""
                                    draggable={false}
                                    className="absolute inset-0 w-full h-full select-none transition-[filter] duration-500"
                                    style={{
                                        filter:
                                            phase === "flying"
                                                ? "drop-shadow(0 0 22px rgba(212,175,55,0.7))"
                                                : "grayscale(0.65) brightness(0.5) drop-shadow(0 0 24px rgba(192,38,45,0.9))",
                                    }}
                                />
                                <span
                                    className="relative font-black font-mono tabular-nums text-3xl sm:text-4xl md:text-5xl transition-colors duration-300"
                                    style={{
                                        color: multiplierColor(),
                                        WebkitTextStroke: "1.5px #1a0f05",
                                        textShadow: "0 3px 0 #1a0f05, 0 0 18px rgba(0,0,0,0.9)",
                                    }}
                                >
                                    {shownMultiplier.toFixed(2)}x
                                </span>
                            </div>
                        </div>

                        {/* ===== Layer 4: Golden dashed flight trail ===== */}
                        <svg
                            className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <linearGradient id="trailGrad" x1="0" y1="1" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#c0262d" stopOpacity="0" />
                                    <stop offset="55%" stopColor="#d4af37" stopOpacity="0.9" />
                                    <stop offset="100%" stopColor="#ffe28a" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                            {phase === "flying" && (
                                <path
                                    d={trailPath}
                                    fill="none"
                                    stroke="url(#trailGrad)"
                                    strokeWidth={3.5}
                                    strokeDasharray="9 7"
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )}
                        </svg>

                        {/* ===== Layer 5: Crixus Chariot ===== */}
                        <div
                            className="absolute z-20 w-[124px] sm:w-[168px] md:w-[196px] pointer-events-none will-change-transform"
                            style={{
                                left: phase === "crashed" ? "115%" : phase === "waiting" ? "16%" : `${pos.x}%`,
                                top: phase === "crashed" ? "-20%" : phase === "waiting" ? "76%" : `${pos.y}%`,
                                transform:
                                    phase === "crashed"
                                        ? "translate3d(-50%, -50%, 0) rotate(32deg) scale(0.6)"
                                        : phase === "waiting"
                                            ? "translate3d(-50%, -50%, 0) rotate(-4deg) scale(0.88)"
                                            : "translate3d(-50%, -50%, 0) rotate(-8deg) scale(1)",
                                opacity: phase === "crashed" ? 0 : 1,
                                transition:
                                    phase === "crashed"
                                        ? "left 0.9s ease-in, top 0.9s ease-in, transform 0.9s ease-in, opacity 0.8s ease-in"
                                        : phase === "waiting"
                                            ? "opacity 0.5s ease, transform 0.5s ease"
                                            : "left 0.12s linear, top 0.12s linear",
                            }}
                        >
                            {phase === "flying" && (
                                <div className="absolute -left-4 top-1/2 h-12 w-20 -translate-y-1/4 rounded-full bg-orange-500/65 blur-xl animate-pulse" />
                            )}
                            <img
                                src="/images/crash/chariot_sprite.png"
                                alt="Crixus Chariot"
                                draggable={false}
                                className="crash-float relative w-full select-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)]"
                            />
                        </div>

                        {/* ===== Crash Explosion ===== */}
                        <AnimatePresence>
                            {phase === "crashed" && (
                                <motion.div
                                    key="explosion"
                                    className="absolute z-30 w-32 h-32 sm:w-40 sm:h-40 pointer-events-none"
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, translateX: "-50%", translateY: "-50%" }}
                                    initial={{ scale: 0.25, opacity: 1 }}
                                    animate={{ scale: [0.25, 2.6, 4.2], opacity: [1, 0.9, 0] }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.1, ease: "easeOut" }}
                                >
                                    <div className="absolute inset-0 rounded-full bg-red-600/90 blur-xl" />
                                    <div className="absolute inset-[18%] rounded-full bg-orange-400 blur-lg" />
                                    <div className="absolute inset-[36%] rounded-full bg-yellow-200 blur-md" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ===== Status Overlays ===== */}
                        <div className="absolute inset-x-0 bottom-[10%] z-30 flex flex-col items-center pointer-events-none px-4 text-center">
                            <AnimatePresence mode="wait">
                                {phase === "crashed" && (
                                    <motion.div
                                        key="crashed"
                                        initial={{ opacity: 0, scale: 0.6 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-6 py-1.5 rounded-full bg-[#2b090c]/85 border-2 border-[#e63946] shadow-[0_0_25px_rgba(239,68,68,0.6)]"
                                    >
                                        <span className="text-xl sm:text-3xl font-black uppercase tracking-[0.2em] text-[#ff5c67]">
                                            {t("games.crashed")}
                                        </span>
                                    </motion.div>
                                )}
                                {phase === "waiting" && (
                                    <motion.div
                                        key="waiting"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <span className="text-lg sm:text-2xl font-black uppercase tracking-[0.16em] text-[#fff2c2] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                                            {t("games.waitNextRound")}
                                        </span>
                                        <span className="bg-[#120e09]/85 px-4 py-1.5 rounded-full border border-[#d4af37]/50 text-xs sm:text-sm tracking-widest uppercase text-[#d8ccb2] shadow-lg">
                                            {t("games.nextGameIn")}{" "}
                                            <span className="text-[#ffd966] font-mono tabular-nums font-black">
                                                {countDown.toFixed(1)}s
                                            </span>
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Cashout Celebration Badge */}
                        <AnimatePresence>
                            {userCashedOut && !gameEnded && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.6, y: 16 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.15 }}
                                    className="absolute inset-x-0 bottom-4 z-40 flex items-center justify-center pointer-events-none px-3"
                                >
                                    <div className="flex flex-col items-center px-5 py-2.5 bg-[#0e1e15]/92 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_32px_rgba(16,185,129,0.45)]">
                                        <span className="text-base sm:text-lg font-black text-emerald-300 uppercase tracking-[0.18em]">
                                            {t("games.success")}
                                        </span>
                                        <span className="text-xs sm:text-sm text-white font-mono tabular-nums font-bold">
                                            {t("games.cashedOutAt")} {userMultiplier?.toFixed(2)}x
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* History Bar */}
                <div className="flex w-full px-3 sm:px-5 pb-4 pt-1 flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] text-[#b9a77a] font-bold uppercase tracking-[0.2em]">
                            {t("games.gameHistory")}
                        </h3>
                        <span className="text-[10px] font-mono text-[#7a6f59]">
                            {recentHistory.length > 0 ? `${recentHistory.length}` : ""}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 justify-end w-full overflow-x-auto pb-1">
                        {recentHistory.map((e, i) => {
                            const val = Number(e.crashPoint || 1);
                            const isRed = val < 2;
                            const isGold = val >= 10;
                            const isLatest = i === recentHistory.length - 1;

                            const badgeClass = isGold
                                ? "bg-gradient-to-b from-[#3d2d0d] to-[#211706] text-[#ffe9a8] border-[#ffd966]/70 shadow-[0_0_10px_rgba(255,217,102,0.3)]"
                                : isRed
                                    ? "bg-[#2b1014] text-[#ff8a93] border-[#c0262d]/50"
                                    : "bg-[#0e261b] text-emerald-300 border-emerald-500/45";

                            return (
                                <span
                                    key={`${i}-${val}`}
                                    className={`shrink-0 h-7 rounded-lg px-2.5 flex items-center justify-center border font-mono tabular-nums font-black text-xs transition-transform ${badgeClass} ${
                                        isLatest ? "ring-1 ring-white/50 scale-105" : "opacity-90"
                                    }`}
                                >
                                    {val.toFixed(2)}x
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
);

GameContainer.displayName = "GameContainer";

export default GameContainer;

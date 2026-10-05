import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Key, useMemo } from "react";

interface GameHistory {
    crashPoint: number | null;
    multiplier: number;
    gameEnded: boolean;
    countDown: number;
    history: any;
    userCashedOut?: boolean;
    userMultiplier?: number;
}

type Phase = "flying" | "crashed" | "waiting";

// Chariot position (in % of the arena) for a given multiplier.
// Fast climb at the beginning, then it "cruises" near the shield — like Spaceman.
const chariotPosition = (m: number) => {
    const p = 1 - 1 / (1 + Math.max(m - 1, 0) * 0.9); // 0 -> ~1
    return {
        x: 12 + p * 46, // 12% -> 58%
        y: 82 - p * 40, // 82% -> 42%
    };
};

const GameContainer: React.FC<GameHistory> = ({ crashPoint, multiplier, gameEnded, countDown, history, userCashedOut, userMultiplier }) => {
    const { t } = useTranslation();

    const phase: Phase = !gameEnded ? "flying" : countDown > 8.9 ? "crashed" : "waiting";
    const shownMultiplier = gameEnded ? (crashPoint ?? multiplier) : multiplier;
    const pos = chariotPosition(phase === "waiting" ? 1 : shownMultiplier);

    // Speed tier controls the parallax speed (changing tiers restarts loops, so keep few tiers)
    const speedTier = phase !== "flying" ? 0 : multiplier < 2 ? 1 : multiplier < 5 ? 2 : 3;
    const bgDuration = [90, 40, 22, 12][speedTier];
    const starDuration = [6, 2.2, 1.4, 0.8][speedTier];

    // Camera rises while flying -> Colosseum sinks out of view
    const cameraRise = phase === "flying" ? Math.min((multiplier - 1) * 45, 170) : 0;

    const stars = useMemo(
        () =>
            Array.from({ length: 28 }, (_, i) => ({
                id: i,
                top: Math.random() * 100,
                left: Math.random() * 100,
                size: Math.random() * 2.5 + 1,
                delay: Math.random() * 2,
                len: Math.random() * 40 + 20,
            })),
        []
    );

    const multiplierColor = () => {
        if (gameEnded) return "#ef4444";
        if (multiplier >= 10) return "#facc15";
        if (multiplier >= 2) return "#4ade80";
        return "#ffffff";
    };

    // Trail from bottom-left to the back of the chariot (viewBox 0..100)
    const trailEndX = pos.x - 9;
    const trailEndY = pos.y + 9;
    const trailPath = `M -2 102 Q ${trailEndX * 0.55} 101 ${trailEndX} ${trailEndY}`;

    return (
        <div className="flex flex-col relative w-full">
            <div className="flex lg:w-[800px] p-6 w-full">
                {/* Screen shake on crash */}
                <motion.div
                    animate={phase === "crashed" ? { x: [-15, 15, -10, 10, -5, 5, 0], y: [-5, 5, -5, 5, 0] } : { x: 0, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="flex rounded-3xl w-full h-[380px] md:h-[450px] relative overflow-hidden bg-gradient-to-b from-[#05040a] via-[#140a1f] to-[#3a1230] border-2 border-[#CFA65C]/50 ring-1 ring-[#CFA65C]/20 shadow-[0_0_40px_rgba(178,34,34,0.25)]"
                >
                    {/* ===== Layer 1: parallax arena sky (mirrored copies = seamless loop) ===== */}
                    <motion.div
                        className="absolute inset-x-0 -top-[200px] bottom-0"
                        animate={{ y: cameraRise }}
                        transition={{ duration: 0.4, ease: "linear" }}
                    >
                        <motion.div
                            key={`bg-${speedTier}`}
                            className="absolute inset-y-0 left-0 flex h-full w-[200%]"
                            animate={{ x: ["0%", "-50%"] }}
                            transition={{ duration: bgDuration, ease: "linear", repeat: Infinity }}
                        >
                            <img src="/images/crash/arena_sky.jpg" alt="" className="h-full w-1/2 object-cover object-bottom select-none" draggable={false} />
                            <img src="/images/crash/arena_sky.jpg" alt="" className="h-full w-1/2 object-cover object-bottom select-none -scale-x-100" draggable={false} />
                        </motion.div>
                    </motion.div>

                    {/* Darken when crashed */}
                    <motion.div
                        className="absolute inset-0 bg-black pointer-events-none"
                        animate={{ opacity: phase === "flying" ? 0.1 : 0.45 }}
                        transition={{ duration: 0.6 }}
                    />

                    {/* ===== Layer 2: speed streaks (stars rushing past) ===== */}
                    {phase === "flying" && (
                        <div key={`stars-${speedTier}`} className="absolute inset-0 pointer-events-none">
                            {stars.map((s) => (
                                <motion.span
                                    key={s.id}
                                    className="absolute rounded-full bg-gradient-to-r from-transparent via-[#CFA65C] to-white"
                                    style={{ top: `${s.top}%`, left: `${s.left}%`, height: s.size, width: s.len }}
                                    animate={{ x: [0, -500], y: [0, 160], opacity: [0, 1, 0] }}
                                    transition={{ duration: starDuration, delay: s.delay * (starDuration / 2), repeat: Infinity, ease: "linear" }}
                                />
                            ))}
                        </div>
                    )}

                    {/* ===== Layer 3: sunburst rays + golden shield with multiplier ===== */}
                    <div className="absolute left-1/2 top-[22%] md:top-[24%] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                        <motion.div
                            className="absolute left-1/2 top-1/2 h-[520px] w-[520px] rounded-full"
                            style={{
                                translateX: "-50%",
                                translateY: "-50%",
                                background:
                                    "repeating-conic-gradient(from 0deg, rgba(207,166,92,0.22) 0deg 9deg, transparent 9deg 18deg)",
                                WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 65%)",
                                maskImage: "radial-gradient(circle, black 15%, transparent 65%)",
                            }}
                            animate={{ rotate: 360, opacity: phase === "flying" ? 1 : 0.35 }}
                            transition={{ rotate: { duration: 30, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.5 } }}
                        />
                        <motion.div
                            className="relative flex items-center justify-center w-[150px] h-[150px] md:w-[190px] md:h-[190px]"
                            animate={
                                phase === "crashed"
                                    ? { scale: [1, 1.25, 0.95, 1], rotate: [0, -8, 6, 0] }
                                    : phase === "flying"
                                        ? { scale: [1, 1.04, 1] }
                                        : { scale: 1 }
                            }
                            transition={phase === "flying" ? { duration: 1.2, repeat: Infinity } : { duration: 0.5 }}
                        >
                            <img
                                src="/images/crash/gold_shield.png"
                                alt=""
                                draggable={false}
                                className="absolute inset-0 w-full h-full select-none transition-[filter] duration-500"
                                style={{
                                    filter:
                                        phase === "flying"
                                            ? "drop-shadow(0 0 25px rgba(207,166,92,0.7))"
                                            : "grayscale(0.6) brightness(0.55) drop-shadow(0 0 25px rgba(178,34,34,0.9))",
                                }}
                            />
                            <span
                                className="relative font-black tabular-nums text-3xl md:text-5xl transition-colors duration-300"
                                style={{
                                    color: multiplierColor(),
                                    WebkitTextStroke: "2px #1a0f05",
                                    textShadow: "0 3px 0 #1a0f05, 0 0 18px rgba(0,0,0,0.9)",
                                }}
                            >
                                {shownMultiplier.toFixed(2)}x
                            </span>
                        </motion.div>
                    </div>

                    {/* ===== Layer 4: golden dashed flight trail ===== */}
                    <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="trailGrad" x1="0" y1="1" x2="1" y2="0">
                                <stop offset="0%" stopColor="#B22222" stopOpacity="0" />
                                <stop offset="60%" stopColor="#CFA65C" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#FFD27A" stopOpacity="1" />
                            </linearGradient>
                        </defs>
                        {phase === "flying" && (
                            <path
                                d={trailPath}
                                fill="none"
                                stroke="url(#trailGrad)"
                                strokeWidth={4}
                                strokeDasharray="10 8"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        )}
                    </svg>

                    {/* ===== Layer 5: the Crixus chariot ===== */}
                    <motion.div
                        className="absolute z-20 w-[150px] md:w-[210px] pointer-events-none"
                        style={{ translateX: "-50%", translateY: "-50%" }}
                        animate={
                            phase === "flying"
                                ? { left: `${pos.x}%`, top: `${pos.y}%`, rotate: -8, opacity: 1, scale: 1 }
                                : phase === "crashed"
                                    ? { left: "115%", top: "-25%", rotate: 35, opacity: 0, scale: 0.6 }
                                    : { left: "16%", top: "78%", rotate: -4, opacity: 1, scale: 0.85 }
                        }
                        transition={
                            phase === "flying"
                                ? { duration: 0.35, ease: "linear" }
                                : phase === "crashed"
                                    ? { duration: 1.1, ease: "easeIn" }
                                    : { left: { duration: 0 }, top: { duration: 0 }, opacity: { duration: 0.6 }, scale: { duration: 0.6 } }
                        }
                    >
                        {/* Fire glow behind the chariot */}
                        {phase === "flying" && (
                            <motion.div
                                className="absolute -left-6 top-1/2 h-16 w-24 -translate-y-1/4 rounded-full bg-orange-500/70 blur-2xl"
                                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            />
                        )}
                        <motion.img
                            src="/images/crash/chariot_sprite.png"
                            alt="Crixus"
                            draggable={false}
                            className="relative w-full select-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: phase === "flying" ? 0.9 : 1.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>

                    {/* ===== Crash explosion at the chariot's last position ===== */}
                    <AnimatePresence>
                        {phase === "crashed" && (
                            <motion.div
                                key="explosion"
                                className="absolute z-30 w-40 h-40 pointer-events-none"
                                style={{ left: `${pos.x}%`, top: `${pos.y}%`, translateX: "-50%", translateY: "-50%" }}
                                initial={{ scale: 0.2, opacity: 1 }}
                                animate={{ scale: [0.2, 3, 5], opacity: [1, 1, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.3, ease: "easeOut" }}
                            >
                                <div className="absolute inset-0 rounded-full bg-red-600 mix-blend-screen blur-2xl" />
                                <div className="absolute inset-[15%] rounded-full bg-orange-500 mix-blend-screen blur-xl" />
                                <div className="absolute inset-[30%] rounded-full bg-yellow-300 mix-blend-screen blur-lg" />
                                <div className="absolute inset-[42%] rounded-full bg-white mix-blend-screen blur-md" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ===== Status texts ===== */}
                    <div className="absolute inset-x-0 bottom-[14%] z-30 flex flex-col items-center pointer-events-none">
                        <AnimatePresence mode="wait">
                            {phase === "crashed" && (
                                <motion.span
                                    key="crashed"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-3xl md:text-4xl font-black uppercase tracking-widest text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]"
                                    style={{ WebkitTextStroke: "1px #1a0505" }}
                                >
                                    {t("games.crashed")}
                                </motion.span>
                            )}
                            {phase === "waiting" && (
                                <motion.div
                                    key="waiting"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <span className="text-xl md:text-3xl font-black uppercase tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                                        {t("games.waitNextRound", "Esperá la próxima ronda")}
                                    </span>
                                    <span className="bg-black/60 px-5 py-1.5 rounded-full border border-[#CFA65C]/40 text-sm tracking-widest uppercase text-gray-300">
                                        {t("games.nextGameIn")} <span className="text-[#CFA65C] font-bold">{countDown.toFixed(1)}s</span>
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Big Win Celebration Overlay */}
                    <AnimatePresence>
                        {userCashedOut && !gameEnded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                className="absolute inset-x-0 bottom-6 z-40 flex items-center justify-center pointer-events-none"
                            >
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="flex flex-col items-center px-6 py-3 bg-[#1c1813]/90 rounded-3xl border border-emerald-500/50 shadow-[0_0_40px_rgba(52,211,153,0.3)]"
                                >
                                    <span className="text-xl font-black text-emerald-400 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                                        {t("games.success")}
                                    </span>
                                    <span className="text-base text-white font-bold mt-1">
                                        {t("games.cashedOutAt")} {userMultiplier?.toFixed(2)}X
                                    </span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* History Bar */}
            <div className="flex w-full lg:w-[800px] p-4 flex-col">
                <h3 className="mb-2 text-sm text-gray-500 font-semibold uppercase tracking-widest">{t("games.gameHistory")}</h3>
                <div className="flex items-center gap-2 justify-end w-full overflow-hidden h-[32px]">
                    {history.map((e: { crashPoint: number | null }, i: Key) => {
                        const isRed = e.crashPoint && e.crashPoint < 2;
                        const isGold = e.crashPoint && e.crashPoint >= 10;

                        let bgColor = "bg-green-500/20 text-green-400 border-green-500/30";
                        if (isRed) bgColor = "bg-red-500/20 text-red-400 border-red-500/30";
                        if (isGold) bgColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

                        return (
                            <motion.div
                                key={i}
                                className={`min-h-[28px] rounded-md px-3 flex items-center justify-center border font-bold text-sm ${bgColor}`}
                                initial={i === history.length - 1 ? { opacity: 0, x: 30 } : {}}
                                animate={i === history.length - 1 ? { opacity: 1, x: 0 } : {}}
                                transition={{ ease: "easeOut", duration: 0.5 }}
                            >
                                {e.crashPoint}x
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GameContainer;

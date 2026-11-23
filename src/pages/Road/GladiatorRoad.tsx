import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaCrown,
    FaCoins,
    FaFire,
    FaShieldAlt,
    FaCopy,
    FaCheck,
    FaChevronRight,
    FaSkullCrossbones,
} from "react-icons/fa";
import { GiFlame, GiShieldEchoes } from "react-icons/gi";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import { roadActive, roadStart, roadStep, roadCashout } from "../../services/games/GamesServices";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";

type DifficultyKey = "easy" | "medium" | "hard" | "hardcore";

interface DifficultyMeta {
    key: DifficultyKey;
    totalSteps: number;
    trapChance: number;
    es: string;
    en: string;
    badgeCls: string;
    activeCls: string;
}

const DIFFICULTIES: DifficultyMeta[] = [
    {
        key: "easy",
        totalSteps: 20,
        trapChance: 0.1,
        es: "Fácil",
        en: "Easy",
        badgeCls: "text-emerald-300 bg-emerald-950/70 border-emerald-500/40",
        activeCls: "bg-gradient-to-b from-emerald-700/80 to-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.35)]",
    },
    {
        key: "medium",
        totalSteps: 18,
        trapChance: 0.2,
        es: "Medio",
        en: "Medium",
        badgeCls: "text-[#ffe9a8] bg-[#2c210e] border-[#d4af37]/50",
        activeCls: "bg-gradient-to-b from-[#b8901f] to-[#6e500d] border-[#fff2c2] text-[#1a1204] shadow-[0_0_14px_rgba(212,175,55,0.45)]",
    },
    {
        key: "hard",
        totalSteps: 15,
        trapChance: 0.3,
        es: "Difícil",
        en: "Hard",
        badgeCls: "text-orange-300 bg-orange-950/70 border-orange-500/40",
        activeCls: "bg-gradient-to-b from-orange-600/85 to-orange-950/95 border-orange-400 text-orange-50 shadow-[0_0_14px_rgba(249,115,22,0.4)]",
    },
    {
        key: "hardcore",
        totalSteps: 12,
        trapChance: 0.4,
        es: "Extremo",
        en: "Hardcore",
        badgeCls: "text-[#ff8a93] bg-[#361014] border-[#e63946]/50",
        activeCls: "bg-gradient-to-b from-[#c0262d] to-[#5e0d12] border-[#ff8a93] text-white shadow-[0_0_16px_rgba(220,38,38,0.45)]",
    },
];

const HOUSE_EDGE = 0.02;
const MIN_BET = 1;
const MAX_BET = 50000;
const LANE_WIDTH = 116; // px per lane for crisp camera math
const START_WIDTH = 120;
const GLADIATOR_IMG = "/images/road/gladiator.webp";
const CHEST_IMG = "/images/cases/legendaria.webp";

const previewMultipliers = (diff: DifficultyKey) => {
    const meta = DIFFICULTIES.find((d) => d.key === diff) || DIFFICULTIES[1];
    const survive = 1 - meta.trapChance;
    return Array.from({ length: meta.totalSteps }, (_, i) => {
        const raw = (1 - HOUSE_EDGE) / Math.pow(survive, i + 1);
        return Math.max(1.01, Math.floor(raw * 100) / 100);
    });
};

interface ActiveRoadGame {
    gameId: string;
    bet: number;
    difficulty: DifficultyKey;
    totalSteps: number;
    currentStep: number;
    hash: string;
    multipliers: number[];
    currentMultiplier: number;
    nextMultiplier: number;
    potentialPayout: number;
}

interface RoundResult {
    type: "burned" | "cashout" | "victory";
    step: number;
    crashStep: number;
    multiplier?: number;
    payout?: number;
    serverSeed: string;
    hash: string;
}

const GladiatorRoad = () => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");
    const { isLogged, userData, toogleUserFlow, toogleUserData } = useContext(UserContext);

    const [bet, setBet] = useState<number>(50);
    const [difficulty, setDifficulty] = useState<DifficultyKey>("medium");
    const [game, setGame] = useState<ActiveRoadGame | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [stepping, setStepping] = useState<boolean>(false);
    const [jumpKey, setJumpKey] = useState<number>(0);
    const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [viewportWidth, setViewportWidth] = useState<number>(640);

    // Measure stage width so camera keeps the gladiator smoothly framed on any phone or desktop
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const update = () => setViewportWidth(el.clientWidth || 640);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Resume an active run after a page reload
    useEffect(() => {
        if (!isLogged) return;
        roadActive()
            .then((res) => {
                if (res.game) {
                    setGame(res.game);
                    setBet(res.game.bet);
                    setDifficulty(res.game.difficulty);
                    setRoundResult(null);
                    toast.info(t("road.resume"), { theme: "dark" });
                }
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLogged]);

    const syncWallet = (walletBalance?: number) => {
        if (typeof walletBalance === "number") {
            toogleUserData((prev: any) => (prev ? { ...prev, walletBalance } : prev));
        }
    };

    const handleStart = async () => {
        if (!isLogged) {
            toogleUserFlow(true);
            return;
        }
        const cleanBet = Math.floor(Number(bet));
        if (!Number.isFinite(cleanBet) || cleanBet < MIN_BET || cleanBet > MAX_BET) return;

        setLoading(true);
        try {
            const res = await roadStart(cleanBet, difficulty);
            sound.play("launch");
            setGame(res.game);
            setRoundResult(null);
            setJumpKey(0);
            syncWallet(res.walletBalance);
        } catch (err: any) {
            toast.error(translateApiMessage(err, t("toast.connError")), { theme: "dark" });
        } finally {
            setLoading(false);
        }
    };

    const handleStep = async () => {
        if (!game || stepping || loading) return;
        setStepping(true);
        try {
            const res = await roadStep();
            setJumpKey((k) => k + 1);

            if (res.result === "burned") {
                sound.play("explode");
                setRoundResult({
                    type: "burned",
                    step: res.step,
                    crashStep: res.crashStep,
                    serverSeed: res.serverSeed,
                    hash: res.hash,
                });
                setGame(null);
            } else if (res.result === "victory") {
                sound.play("bigWin");
                coinRainEmitter.trigger(100);
                setRoundResult({
                    type: "victory",
                    step: res.step,
                    crashStep: res.crashStep,
                    multiplier: res.multiplier,
                    payout: res.payout,
                    serverSeed: res.serverSeed,
                    hash: res.hash,
                });
                syncWallet(res.walletBalance);
                setGame(null);
                toast.success(`${t("road.victory")} x${res.multiplier}`, { theme: "dark" });
            } else if (res.result === "safe" && res.game) {
                sound.play("gem", res.step);
                setGame(res.game);
            }
        } catch (err: any) {
            toast.error(translateApiMessage(err, t("toast.connError")), { theme: "dark" });
        } finally {
            setStepping(false);
        }
    };

    const handleCashout = async () => {
        if (!game || game.currentStep < 1 || loading || stepping) return;
        setLoading(true);
        try {
            const res = await roadCashout();
            sound.play("cashout");
            coinRainEmitter.trigger(res.multiplier >= 5 ? 75 : 40);
            setRoundResult({
                type: "cashout",
                step: res.step,
                crashStep: res.crashStep,
                multiplier: res.multiplier,
                payout: res.payout,
                serverSeed: res.serverSeed,
                hash: res.hash,
            });
            syncWallet(res.walletBalance);
            setGame(null);
            toast.success(`${t("road.cashedOut")} x${res.multiplier}`, { theme: "dark" });
        } catch (err: any) {
            toast.error(translateApiMessage(err, t("toast.connError")), { theme: "dark" });
        } finally {
            setLoading(false);
        }
    };

    // Keyboard shortcut on desktop: Space / ArrowRight advances when in-game
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!game || stepping || loading) return;
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            if (e.code === "Space" || e.code === "ArrowRight") {
                e.preventDefault();
                handleStep();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, stepping, loading]);

    const activeDifficulty: DifficultyKey = game ? game.difficulty : difficulty;
    const diffMeta = DIFFICULTIES.find((d) => d.key === activeDifficulty) || DIFFICULTIES[1];
    const multipliers = useMemo(
        () => (game ? game.multipliers : previewMultipliers(difficulty)),
        [game, difficulty]
    );

    const inRound = game !== null;
    const displayStep = game
        ? game.currentStep
        : roundResult
            ? roundResult.step
            : 0;

    // Horizontal camera positioning: keeps the gladiator near ~30% from the left edge
    const heroCenterX =
        displayStep === 0
            ? START_WIDTH / 2
            : START_WIDTH + (displayStep - 0.5) * LANE_WIDTH;
    const totalTrackWidth = START_WIDTH + multipliers.length * LANE_WIDTH + 130;
    const maxScroll = Math.max(0, totalTrackWidth - viewportWidth);
    const cameraOffset = Math.max(0, Math.min(maxScroll, heroCenterX - viewportWidth * 0.34));

    const userBalance = Number(userData?.walletBalance ?? 0);
    const cleanBet = Math.floor(Number(bet) || 0);
    const maxAffordable = Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(userBalance > 0 ? userBalance : 100)));

    const quickBets: { label: string; apply: (b: number) => number }[] = [
        { label: "½", apply: (b) => Math.max(MIN_BET, Math.floor(b / 2)) },
        { label: "x2", apply: (b) => Math.max(MIN_BET, b * 2) },
        { label: "$10", apply: () => 10 },
        { label: "$100", apply: () => 100 },
        { label: "MAX", apply: () => maxAffordable },
    ];

    const canStart =
        !loading &&
        cleanBet >= MIN_BET &&
        cleanBet <= MAX_BET &&
        (userData == null || userBalance >= cleanBet);

    const copyValue = (key: string, val: string) => {
        navigator.clipboard?.writeText(val).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        });
    };

    const displayHash = game?.hash || roundResult?.hash || null;
    const isBurned = roundResult?.type === "burned";
    const isWin = roundResult?.type === "cashout" || roundResult?.type === "victory";
    const maxMult = multipliers[multipliers.length - 1] || 1;

    return (
        <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2">
            {/* Main Colosseum Gladiator Road Container */}
            <div className="w-full max-w-[1160px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
                {/* Imperial Marquee Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_12px_rgba(212,175,55,0.45)]">
                            <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                                <FaCrown className="text-[#ffd966] text-xs" />
                            </div>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] gold-text">
                                {t("road.title")}
                            </h1>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9b8d6f] font-semibold">
                                {es ? "Esquivá el fuego · 98% RTP · Provably Fair" : "Dodge fire traps · 98% RTP · Provably Fair"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${diffMeta.badgeCls}`}>
                            {es ? diffMeta.es : diffMeta.en} · {Math.round((1 - diffMeta.trapChance) * 100)}%
                        </span>
                        <span className="px-3 py-1 rounded-full bg-[#120d06] border border-[#d4af37]/45 text-[11px] font-mono tabular-nums font-black text-[#ffe9a8]">
                            {es ? "Paso" : "Step"} {displayStep}/{multipliers.length}
                        </span>
                    </div>
                </div>

                {/* Body: Mobile puts the Corridor Arena ON TOP, controls right under thumb */}
                <div className="flex flex-col-reverse lg:flex-row">
                    {/* ---------- Left Control Panel ---------- */}
                    <div className="lg:w-[340px] shrink-0 flex flex-col gap-4 p-4 sm:p-5 border-t lg:border-t-0 lg:border-r border-[#d4af37]/20 bg-[#120e09]/85">
                        {/* Bet Input */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="road-bet"
                                    className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5"
                                >
                                    <FaCoins className="text-[#d4af37] text-xs" />
                                    {t("games.bet")}
                                </label>
                                {userData && (
                                    <span className="text-[11px] font-mono tabular-nums text-[#9b8d6f]">
                                        {t("games.balance")}:{" "}
                                        <span className="text-[#ffe9a8] font-bold">
                                            <Monetary value={Math.floor(userBalance)} />
                                        </span>
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#090806] focus-within:border-[#d4af37] focus-within:shadow-[0_0_16px_rgba(212,175,55,0.2)] transition-all">
                                <span className="pl-3.5 text-[#d4af37] font-black text-lg">$</span>
                                <input
                                    id="road-bet"
                                    type="number"
                                    value={bet || ""}
                                    disabled={inRound}
                                    min={MIN_BET}
                                    max={MAX_BET}
                                    placeholder="50"
                                    onKeyDown={(e) => {
                                        if (
                                            !/[0-9]/.test(e.key) &&
                                            !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                                        ) {
                                            e.preventDefault();
                                        }
                                    }}
                                    onChange={(e) => {
                                        const v = Math.floor(Number(e.target.value));
                                        setBet(!Number.isFinite(v) || v < 0 ? 0 : Math.min(MAX_BET, v));
                                    }}
                                    className="w-full bg-transparent py-2.5 px-2.5 text-white font-mono tabular-nums font-black text-lg outline-none disabled:opacity-55"
                                />
                            </div>

                            <div className="grid grid-cols-5 gap-1.5">
                                {quickBets.map((q) => (
                                    <button
                                        key={q.label}
                                        type="button"
                                        disabled={inRound}
                                        onClick={() => {
                                            sound.play("chip");
                                            setBet((b) => Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(q.apply(b || 0)))));
                                        }}
                                        className={`py-1.5 rounded-lg text-xs font-black font-mono transition-all border disabled:opacity-40 ${
                                            q.label === "MAX"
                                                ? "bg-[#2b1515] text-[#ffb3b3] border-[#7a2323] hover:border-[#d4af37] hover:text-[#ffe9a8]"
                                                : "bg-[#221b11] text-[#e7ddc8] border-[#3e3219] hover:border-[#d4af37]/70 hover:text-[#ffe9a8]"
                                        }`}
                                    >
                                        {q.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty Selector */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5">
                                    <FaFire className="text-orange-400 text-xs" />
                                    {t("road.difficulty")}
                                </span>
                                <span className="text-[10px] font-mono text-[#9b8d6f]">
                                    MAX <span className="text-[#ffe9a8] font-bold">{maxMult.toFixed(2)}x</span>
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {DIFFICULTIES.map((d) => {
                                    const selected = activeDifficulty === d.key;
                                    return (
                                        <button
                                            key={d.key}
                                            type="button"
                                            disabled={inRound}
                                            onClick={() => {
                                                sound.play("chip");
                                                setDifficulty(d.key);
                                                setRoundResult(null);
                                            }}
                                            className={`px-3 py-2 rounded-xl border text-left transition-all disabled:opacity-50 ${
                                                selected
                                                    ? d.activeCls
                                                    : "bg-[#19140d] border-[#3a2f1d] text-[#d8ccb2] hover:border-[#d4af37]/60"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black uppercase tracking-wider">
                                                    {es ? d.es : d.en}
                                                </span>
                                                <span className="text-[10px] font-mono font-bold opacity-85">
                                                    {Math.round(d.trapChance * 100)}% 🔥
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-mono opacity-80 mt-0.5">
                                                {d.totalSteps} {es ? "pasos" : "steps"} · {previewMultipliers(d.key)[0]}x+
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2.5 mt-auto pt-1">
                            {inRound && game ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleStep}
                                        disabled={stepping || loading}
                                        className="w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-[0.14em] text-sm sm:text-base text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] border border-[#fff2c2]/70 shadow-[0_8px_26px_rgba(212,175,55,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <span>
                                            {stepping
                                                ? "..."
                                                : `${t("road.advance")} · ${game.nextMultiplier.toFixed(2)}x`}
                                        </span>
                                        <FaChevronRight className="text-sm" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCashout}
                                        disabled={game.currentStep < 1 || loading || stepping}
                                        className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-[0.12em] text-xs sm:text-sm transition-all border flex items-center justify-center gap-2 ${
                                            game.currentStep >= 1
                                                ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#051a10] border-emerald-200/70 shadow-[0_0_24px_rgba(16,185,129,0.45)] active:scale-[0.98]"
                                                : "bg-[#1b160f] text-[#7a6f59] border-[#332a1b] cursor-not-allowed"
                                        }`}
                                    >
                                        {game.currentStep >= 1 ? (
                                            <span className="font-mono tabular-nums">
                                                {t("games.cashOut")} ·{" "}
                                                <Monetary value={game.potentialPayout} showFraction /> (
                                                {game.currentMultiplier.toFixed(2)}x)
                                            </span>
                                        ) : (
                                            <span>{t("road.advanceFirst")}</span>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleStart}
                                    disabled={!canStart}
                                    className="w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-[0.15em] text-sm sm:text-base text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] border border-[#fff2c2]/70 shadow-[0_8px_24px_rgba(212,175,55,0.35)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    {loading
                                        ? t("games.loading")
                                        : userData != null && userBalance < cleanBet
                                            ? t("games.notEnough")
                                            : `${t("road.start")}${cleanBet > 0 ? ` · $${cleanBet.toLocaleString("en-US")}` : ""}`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ---------- Right Colosseum Fire-Gauntlet Stage ---------- */}
                    <div className="flex-1 flex flex-col gap-3 p-3.5 sm:p-5 min-w-0 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(212,175,55,0.08),transparent_70%),linear-gradient(180deg,#120e09_0%,#090706_100%)]">
                        {/* 3-stat Live HUD */}
                        <div className="grid grid-cols-3 gap-2">
                            <div
                                className={`rounded-xl px-2.5 py-2 border flex flex-col items-center justify-center ${
                                    inRound && game && game.currentStep > 0
                                        ? "bg-[#1e170a] border-[#d4af37]/60"
                                        : "bg-[#0d0b08] border-[#2d2416]"
                                }`}
                            >
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#9b8d6f] font-bold">
                                    {es ? "Actual" : "Current"}
                                </span>
                                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#ffe9a8]">
                                    {(game ? game.currentMultiplier : roundResult?.multiplier || 1).toFixed(2)}x
                                </span>
                            </div>

                            <div className="rounded-xl px-2.5 py-2 bg-[#0d0b08] border border-[#2d2416] flex flex-col items-center justify-center">
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#9b8d6f] font-bold">
                                    {es ? "Siguiente" : "Next"} ({Math.round((1 - diffMeta.trapChance) * 100)}%)
                                </span>
                                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#d4af37]">
                                    {(game ? game.nextMultiplier : multipliers[0]).toFixed(2)}x
                                </span>
                            </div>

                            <div
                                className={`rounded-xl px-2.5 py-2 border flex flex-col items-center justify-center ${
                                    inRound && game && game.currentStep > 0
                                        ? "bg-[#0c1d15] border-emerald-500/50"
                                        : "bg-[#0d0b08] border-[#2d2416]"
                                }`}
                            >
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#9b8d6f] font-bold">
                                    {t("games.payout")}
                                </span>
                                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-emerald-300 truncate max-w-full">
                                    <Monetary
                                        value={
                                            game
                                                ? game.potentialPayout
                                                : isWin && roundResult?.payout
                                                    ? roundResult.payout
                                                    : cleanBet
                                        }
                                        showFraction
                                    />
                                </span>
                            </div>
                        </div>

                        {/* Horizontal Scrolling Colosseum Gauntlet Viewport */}
                        <motion.div
                            ref={viewportRef}
                            animate={
                                isBurned
                                    ? { x: [-10, 10, -7, 7, -3, 3, 0] }
                                    : { x: 0 }
                            }
                            transition={{ duration: 0.4 }}
                            className="relative w-full h-[310px] sm:h-[360px] rounded-2xl overflow-hidden border-2 border-[#3e3017] bg-[#090706] shadow-[inset_0_0_45px_rgba(0,0,0,0.95)]"
                        >
                            {/* Colosseum Backdrop Glow */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: isBurned
                                        ? "radial-gradient(60% 70% at 50% 80%, rgba(220,38,38,0.28), transparent 70%), linear-gradient(180deg, #170a0b 0%, #0d0807 65%, #1c140e 100%)"
                                        : "radial-gradient(65% 65% at 50% 15%, rgba(212,175,55,0.14), transparent 68%), radial-gradient(80% 50% at 50% 100%, rgba(192,68,20,0.18), transparent 65%), linear-gradient(180deg, #16110c 0%, #0d0a08 65%, #1b140d 100%)",
                                }}
                            />

                            {/* Scrolling Road Track */}
                            <div
                                className="absolute inset-y-0 left-0 flex items-stretch transition-transform duration-500 ease-out will-change-transform"
                                style={{
                                    width: `${totalTrackWidth}px`,
                                    transform: `translate3d(-${cameraOffset}px, 0, 0)`,
                                }}
                            >
                                {/* Start Gate (Step 0) */}
                                <div
                                    className="relative shrink-0 flex flex-col justify-between items-center border-r border-[#3a2d19] bg-gradient-to-b from-[#211a11]/70 via-[#15100a]/60 to-[#231a10]"
                                    style={{ width: `${START_WIDTH}px` }}
                                >
                                    <div className="mt-4 px-2.5 py-1 rounded-full bg-[#120d06] border border-[#d4af37]/40 text-[10px] font-black uppercase tracking-widest text-[#e6ca6a]">
                                        {es ? "Inicio" : "Start"}
                                    </div>
                                    <div className="w-full h-16 border-t-2 border-[#6e541e] bg-gradient-to-b from-[#2b2216] to-[#140f0a] flex items-center justify-center">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a7f63]">
                                            ARENA
                                        </span>
                                    </div>
                                </div>

                                {/* Step Lanes 1 .. totalSteps */}
                                {multipliers.map((mult, idx) => {
                                    const stepNum = idx + 1;
                                    const isCleared = inRound
                                        ? stepNum <= game!.currentStep
                                        : isWin
                                            ? stepNum <= (roundResult?.step || 0)
                                            : isBurned
                                                ? stepNum < (roundResult?.step || 0)
                                                : false;
                                    const isNext = inRound && stepNum === game!.currentStep + 1;
                                    const isHitTrap = isBurned && roundResult?.step === stepNum;
                                    const isRevealedTrap =
                                        !inRound &&
                                        roundResult &&
                                        roundResult.crashStep === stepNum &&
                                        !isHitTrap;

                                    return (
                                        <div
                                            key={stepNum}
                                            onClick={() => isNext && !stepping && handleStep()}
                                            style={{ width: `${LANE_WIDTH}px` }}
                                            className={`relative shrink-0 flex flex-col justify-between items-center border-r border-dashed border-[#47381f]/70 transition-colors ${
                                                isNext
                                                    ? "cursor-pointer bg-gradient-to-b from-[#d4af37]/10 via-[#d4af37]/[0.05] to-transparent hover:from-[#d4af37]/20"
                                                    : isCleared
                                                        ? "bg-gradient-to-b from-emerald-500/[0.06] via-transparent to-transparent"
                                                        : isHitTrap
                                                            ? "bg-gradient-to-b from-red-600/25 via-orange-600/15 to-red-900/35"
                                                            : ""
                                            }`}
                                        >
                                            {/* Decorative Roman Arch Top */}
                                            <div className="w-full h-3 bg-gradient-to-b from-[#332714] to-transparent border-b border-[#4d3b1e]/40" />

                                            {/* Floating Multiplier Medallion */}
                                            <div className="mt-2 z-20 flex flex-col items-center">
                                                <div
                                                    className={`w-[74px] h-[74px] rounded-full flex flex-col items-center justify-center border-2 font-mono tabular-nums transition-all duration-300 ${
                                                        isHitTrap
                                                            ? "bg-gradient-to-b from-[#dc2626] to-[#63090c] border-[#fca5a5] text-white shadow-[0_0_24px_rgba(239,68,68,0.85)] scale-110"
                                                            : isRevealedTrap
                                                                ? "bg-[#2e0e11] border-[#e63946]/70 text-[#ff8a93]"
                                                                : isCleared
                                                                    ? "bg-gradient-to-b from-[#133522] to-[#091c12] border-emerald-400 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.45)]"
                                                                    : isNext
                                                                        ? "bg-gradient-to-b from-[#4a3712] via-[#2b1f09] to-[#181105] border-[#ffe9a8] text-[#fff2c2] shadow-[0_0_24px_rgba(255,217,102,0.55)] scale-105 animate-pulse"
                                                                        : "bg-[#15110b]/90 border-[#4d3c1e] text-[#c8bba0]"
                                                    }`}
                                                >
                                                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider opacity-75">
                                                        #{stepNum}
                                                    </span>
                                                    <span className="text-sm font-black leading-tight">
                                                        {mult >= 100 ? `${Math.round(mult)}x` : `${mult.toFixed(2)}x`}
                                                    </span>
                                                    {isCleared && <FaCheck className="text-[10px] text-emerald-400 mt-0.5" />}
                                                    {(isHitTrap || isRevealedTrap) && (
                                                        <GiFlame className="text-xs text-orange-300 mt-0.5" />
                                                    )}
                                                </div>

                                                {isNext && (
                                                    <span className="mt-1.5 px-2 py-0.5 rounded-full bg-[#d4af37] text-[#1a1204] text-[9px] font-black uppercase tracking-wider shadow">
                                                        {es ? "¡Avanzar!" : "Step!"}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Roaring Colosseum Fire Pillar on Trap */}
                                            {(isHitTrap || isRevealedTrap) && (
                                                <div
                                                    className={`road-flame absolute bottom-14 inset-x-3 z-20 pointer-events-none rounded-t-full ${
                                                        isHitTrap ? "h-48 opacity-100" : "h-28 opacity-65"
                                                    }`}
                                                    style={{
                                                        background:
                                                            "radial-gradient(ellipse at bottom, #fff7c2 0%, #fbbf24 25%, #f97316 55%, #dc2626 80%, transparent 100%)",
                                                        filter: "blur(3px)",
                                                    }}
                                                />
                                            )}

                                            {/* Iron Fire-Grate Stone Floor */}
                                            <div className="relative w-full h-16 border-t-2 border-[#5c461d] bg-[#16110b] flex items-center justify-center px-2">
                                                {/* Smoldering grate bars */}
                                                <div
                                                    className={`w-full h-9 rounded-md border flex items-center justify-around px-1.5 relative overflow-hidden ${
                                                        isCleared
                                                            ? "bg-gradient-to-b from-[#2e2410] to-[#1a1408] border-[#d4af37]/75 shadow-[inset_0_0_12px_rgba(212,175,55,0.3)]"
                                                            : isHitTrap
                                                                ? "bg-gradient-to-t from-orange-500 via-red-600 to-yellow-300 border-orange-300 shadow-[0_0_24px_rgba(249,115,22,0.9)]"
                                                                : "bg-[#0c0806] border-[#3d2e17]"
                                                    }`}
                                                >
                                                    {isCleared ? (
                                                        <GiShieldEchoes className="text-[#ffd966] text-xl drop-shadow-[0_0_6px_rgba(255,217,102,0.7)]" />
                                                    ) : (
                                                        <>
                                                            {/* Ember glow under bars */}
                                                            <div
                                                                className={`absolute inset-x-0 bottom-0 h-4 ${
                                                                    isHitTrap ? "bg-yellow-200/80" : "bg-orange-600/25"
                                                                } blur-sm`}
                                                            />
                                                            {[0, 1, 2, 3, 4].map((b) => (
                                                                <span
                                                                    key={b}
                                                                    className="w-1.5 h-full bg-[#241c13] border-x border-black/50 z-10"
                                                                />
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Finish Gate: Golden Imperial Chest */}
                                <div className="relative shrink-0 w-[130px] flex flex-col justify-between items-center bg-gradient-to-b from-[#33250c]/60 via-[#1f1608]/60 to-[#291d0b]">
                                    <div className="mt-4 px-2.5 py-1 rounded-full bg-[#d4af37] text-[#1a1204] text-[10px] font-black uppercase tracking-wider shadow-[0_0_14px_rgba(212,175,55,0.7)]">
                                        {es ? "Tesoro" : "Chest"}
                                    </div>
                                    <div className="relative flex flex-col items-center my-auto">
                                        <div className="absolute inset-0 rounded-full bg-[#ffd966]/30 blur-xl animate-pulse" />
                                        <img
                                            src={CHEST_IMG}
                                            alt="Imperial Chest"
                                            className="relative w-20 h-20 object-contain drop-shadow-[0_8px_20px_rgba(255,215,0,0.5)]"
                                        />
                                        <span className="mt-1 font-mono font-black text-xs text-[#ffe9a8]">
                                            {maxMult.toFixed(2)}x
                                        </span>
                                    </div>
                                    <div className="w-full h-16 border-t-2 border-[#d4af37] bg-gradient-to-b from-[#3a2a0e] to-[#1a1206] flex items-center justify-center">
                                        <FaCrown className="text-[#ffd966] text-lg" />
                                    </div>
                                </div>

                                {/* Animated Crixus Gladiator Hero Sprite */}
                                <motion.div
                                    key={`hero-pos`}
                                    animate={{
                                        left: heroCenterX,
                                        y: isBurned ? [0, -18, 6] : [0, -34, 0],
                                        rotate: isBurned ? -22 : 0,
                                        scale: isBurned ? 0.92 : 1,
                                    }}
                                    transition={{
                                        left: { type: "spring", stiffness: 210, damping: 22 },
                                        y: { duration: 0.36, ease: "easeOut" },
                                        rotate: { duration: 0.3 },
                                    }}
                                    className="absolute bottom-[56px] z-30 pointer-events-none -translate-x-1/2"
                                    style={{ width: 96 }}
                                >
                                    {/* Hero ground shadow */}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-black/70 blur-[3px]" />
                                    <motion.img
                                        key={jumpKey}
                                        src={GLADIATOR_IMG}
                                        alt="Crixus Gladiator"
                                        draggable={false}
                                        initial={jumpKey > 0 ? { y: -28, scale: 1.08 } : false}
                                        animate={{ y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 320, damping: 18 }}
                                        className={`relative w-24 h-24 object-contain select-none ${
                                            isBurned
                                                ? "brightness-75 sepia saturate-200 drop-shadow-[0_0_16px_rgba(239,68,68,0.95)]"
                                                : "road-hero-idle drop-shadow-[0_8px_14px_rgba(0,0,0,0.85)]"
                                        }`}
                                    />
                                </motion.div>
                            </div>

                            {/* Result Overlay Banner */}
                            <AnimatePresence>
                                {roundResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12, scale: 0.92 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute bottom-3 inset-x-3 z-40 flex justify-center pointer-events-none"
                                    >
                                        <div
                                            className={`px-5 py-2.5 rounded-2xl border-2 backdrop-blur-md font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2 shadow-2xl ${
                                                isBurned
                                                    ? "bg-[#2b090c]/90 border-[#e63946] text-[#ffb3b8]"
                                                    : "bg-[#1a2b18]/92 border-[#ffd966] text-[#fff2c2]"
                                            }`}
                                        >
                                            {isBurned ? (
                                                <>
                                                    <FaSkullCrossbones className="text-[#ff5964] text-base" />
                                                    <span>
                                                        {t("road.burned")} (#{roundResult.crashStep})
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaCrown className="text-[#ffd966] text-base" />
                                                    <span className="font-mono tabular-nums">
                                                        {roundResult.type === "victory" ? t("road.victory") : t("road.cashedOut")}{" "}
                                                        {roundResult.multiplier?.toFixed(2)}x ·{" "}
                                                        <Monetary value={roundResult.payout || 0} showFraction />
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Provably Fair Verification Strip */}
                        {displayHash && (
                            <div className="rounded-xl bg-[#0b0907] border border-[#2c2316] px-3.5 py-2 flex flex-col gap-1 text-[11px] text-[#8a7f63]">
                                <div className="flex items-center justify-between gap-2 font-mono">
                                    <span className="truncate flex items-center gap-1.5">
                                        <FaShieldAlt className="text-[#d4af37] shrink-0" />
                                        <span className="text-[#9b8d6f]">Hash:</span> {displayHash}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => copyValue("hash", displayHash)}
                                        className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1"
                                        title="Copiar hash"
                                    >
                                        {copiedKey === "hash" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                                    </button>
                                </div>
                                {roundResult?.serverSeed && (
                                    <div className="flex items-center justify-between gap-2 font-mono text-[#e6ca6a]">
                                        <span className="truncate">
                                            <span className="text-[#9b8d6f]">
                                                {t("mines.seed")} ({es ? `trampa #${roundResult.crashStep}` : `trap #${roundResult.crashStep}`}):{" "}
                                            </span>
                                            {roundResult.serverSeed}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => copyValue("seed", roundResult.serverSeed)}
                                            className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1"
                                            title="Copiar seed"
                                        >
                                            {copiedKey === "seed" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GladiatorRoad;

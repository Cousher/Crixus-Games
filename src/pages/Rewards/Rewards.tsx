import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
    FaArrowRight,
    FaBoxOpen,
    FaCheck,
    FaCoins,
    FaCrown,
    FaDice,
    FaFire,
    FaGift,
    FaRocket,
    FaTrophy,
} from "react-icons/fa";
import { BsCoin } from "react-icons/bs";
import { GiMineExplosion, GiRank3, GiUpgrade } from "react-icons/gi";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import MainButton from "../../components/MainButton";
import {
    getRewardsStatus,
    claimStreak,
    claimMission,
    claimLevelRewards,
} from "../../services/rewards/RewardsServices";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";
import { levelProgress, levelRewardFor, xpToNext } from "../../utils/levels";
import LegionReferralPanel from "./LegionReferralPanel";

const DEFAULT_STREAK_REWARDS = [250, 400, 600, 900, 1250, 1750, 2500];

interface Mission {
    key: string;
    target: number;
    progress: number;
    reward: number;
    claimed: boolean;
}

interface RewardsStatus {
    streak: {
        count: number;
        claimedToday: boolean;
        nextDay: number;
        nextReward: number;
        rewards?: number[];
    };
    missions: Mission[];
    levelRewards: { currentLevel: number; claimedUpTo: number; pendingAmount: number };
}

const MISSION_META: Record<string, { icon: JSX.Element; to: string; accent: string }> = {
    bet_total: {
        icon: <FaCoins className="text-[#ffd966]" />,
        to: "/",
        accent: "border-[#d4af37]/40 bg-[#2a200e]",
    },
    case_open: {
        icon: <FaBoxOpen className="text-purple-300" />,
        to: "/",
        accent: "border-purple-500/40 bg-purple-950/40",
    },
    crash_2x: {
        icon: <FaRocket className="text-rose-300" />,
        to: "/crash",
        accent: "border-rose-500/40 bg-rose-950/40",
    },
    coinflip_win: {
        icon: <BsCoin className="text-amber-300" />,
        to: "/coinflip",
        accent: "border-amber-500/40 bg-amber-950/40",
    },
    slot_win: {
        icon: <FaDice className="text-yellow-300" />,
        to: "/slot",
        accent: "border-yellow-500/40 bg-yellow-950/40",
    },
    mines_cashout: {
        icon: <GiMineExplosion className="text-emerald-300" />,
        to: "/mines",
        accent: "border-emerald-500/40 bg-emerald-950/40",
    },
    road_cashout: {
        icon: <FaFire className="text-orange-300" />,
        to: "/road",
        accent: "border-orange-500/40 bg-orange-950/40",
    },
    upgrade_try: {
        icon: <GiUpgrade className="text-sky-300" />,
        to: "/upgrade",
        accent: "border-sky-500/40 bg-sky-950/40",
    },
};

const Rewards = () => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");
    const { isLogged, toogleUserFlow, userData, toogleUserData } = useContext(UserContext);

    const [status, setStatus] = useState<RewardsStatus | null>(null);
    const [loading, setLoading] = useState<string | null>(null);

    const refresh = async () => {
        try {
            const data = await getRewardsStatus();
            setStatus(data);
        } catch {
            // not logged in / server error
        }
    };

    useEffect(() => {
        if (isLogged) {
            refresh();
        } else {
            toogleUserFlow(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLogged]);

    const updateBalance = (walletBalance: number) => {
        if (userData) {
            toogleUserData({ ...userData, walletBalance });
        }
    };

    const handleClaimStreak = async () => {
        setLoading("streak");
        try {
            const res = await claimStreak();
            sound.play("bonus");
            coinRainEmitter.trigger(45);
            toast.success(`+ $${res.reward} (${t("rewards.day")} ${res.streak})`, { theme: "dark" });
            updateBalance(res.walletBalance);
            await refresh();
        } catch (error: any) {
            toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
        } finally {
            setLoading(null);
        }
    };

    const handleClaimMission = async (key: string) => {
        setLoading(key);
        try {
            const res = await claimMission(key);
            sound.play("bonus");
            coinRainEmitter.trigger(30);
            toast.success(`+ $${res.reward}`, { theme: "dark" });
            updateBalance(res.walletBalance);
            await refresh();
        } catch (error: any) {
            toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
        } finally {
            setLoading(null);
        }
    };

    const handleClaimLevels = async () => {
        setLoading("levels");
        try {
            const res = await claimLevelRewards();
            sound.play("bonus");
            coinRainEmitter.trigger(65);
            toast.success(`+ $${res.reward}`, { theme: "dark" });
            updateBalance(res.walletBalance);
            await refresh();
        } catch (error: any) {
            toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
        } finally {
            setLoading(null);
        }
    };

    if (!isLogged) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#241b0e] border-2 border-[#d4af37]/60 flex items-center justify-center shadow-[0_0_28px_rgba(212,175,55,0.3)]">
                    <FaCrown className="text-3xl text-[#ffd966]" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-[0.16em] gold-text">
                    {t("rewards.title")}
                </h1>
                <p className="text-sm text-[#a89a80] max-w-md">
                    {es
                        ? "Iniciá sesión para cobrar tu racha diaria, completar misiones, reclamar premios por nivel e invitar amigos a tu Legión."
                        : "Sign in to claim your daily streak, complete missions, collect level rewards, and invite friends to your Legion."}
                </p>
                <button
                    type="button"
                    onClick={() => toogleUserFlow(true)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.35)] cursor-pointer"
                >
                    {t("nav.signIn")}
                </button>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-[#d4af37]">
                <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
                <span className="text-xs uppercase tracking-[0.25em] text-[#a39475] font-semibold">
                    {t("games.loading")}
                </span>
            </div>
        );
    }

    const { streak, missions, levelRewards } = status;
    const streakList =
        streak.rewards && streak.rewards.length > 0 ? streak.rewards : DEFAULT_STREAK_REWARDS;
    const streakDayProgress = Math.min(7, streak.claimedToday ? streak.count : Math.max(0, streak.nextDay - 1));
    const claimableMissionsCount = missions.filter((m) => m.progress >= m.target && !m.claimed).length;
    const completedMissionsCount = missions.filter((m) => m.progress >= m.target).length;
    const totalClaimableNow =
        (!streak.claimedToday ? streak.nextReward : 0) +
        missions
            .filter((m) => m.progress >= m.target && !m.claimed)
            .reduce((acc, m) => acc + m.reward, 0) +
        (levelRewards.pendingAmount || 0);

    const currentXp = userData?.xp ?? 0;
    const xpPct = Math.round(levelProgress(currentXp, levelRewards.currentLevel) * 100);
    const remainingXp = xpToNext(currentXp, levelRewards.currentLevel);
    const nextLevelPrize = levelRewardFor(levelRewards.currentLevel + 1);

    return (
        <div className="w-full flex flex-col items-center gap-7 py-6 sm:py-8 px-3 sm:px-4 max-w-[1140px] mx-auto">
            {/* ==================== IMPERIAL TREASURY HERO ==================== */}
            <div className="relative w-full rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#231a0f] via-[#15100a] to-[#0e0b08] shadow-[0_24px_65px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,233,168,0.14)] p-5 sm:p-7">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(60% 80% at 50% 0%, rgba(212,175,55,0.18), transparent 65%)",
                    }}
                />

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-5">
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2b200d]/90 border border-[#d4af37]/45 text-[10px] font-black uppercase tracking-[0.26em] text-[#ffe9a8]">
                            <FaCrown className="text-[#ffd966]" />
                            <span>{es ? "Tesoro del Coliseo" : "Colosseum Treasury"}</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-[0.15em] gold-text">
                            {t("rewards.title")}
                        </h1>
                        <p className="text-xs sm:text-sm text-[#b9a77a] max-w-lg">
                            {es
                                ? "Cobrá tu racha diaria, completá desafíos en la arena, subí de nivel y sumá amigos a tu Legión."
                                : "Claim your daily streak, complete arena challenges, level up, and grow your Legion."}
                        </p>
                    </div>

                    {/* Ready-to-Claim Treasury Pill */}
                    <div
                        className={`shrink-0 rounded-2xl px-5 py-3.5 border text-center min-w-[210px] ${
                            totalClaimableNow > 0
                                ? "bg-gradient-to-b from-[#11291b] to-[#0a1710] border-emerald-400/55 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                                : "bg-[#120e0a] border-[#34291b]"
                        }`}
                    >
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#a89a80]">
                            {es ? "Disponible para cobrar" : "Ready to claim now"}
                        </div>
                        <div
                            className={`text-2xl sm:text-3xl font-black font-mono tabular-nums mt-0.5 ${
                                totalClaimableNow > 0 ? "text-emerald-300" : "text-[#d4af37]"
                            }`}
                        >
                            <Monetary value={totalClaimableNow} />
                        </div>
                    </div>
                </div>

                {/* Quick Jump Pills */}
                <div className="relative flex flex-wrap items-center justify-center md:justify-start gap-2 mt-5 pt-4 border-t border-[#d4af37]/15">
                    {[
                        {
                            href: "#sec-streak",
                            label: es ? "Racha Diaria" : "Daily Streak",
                            badge: !streak.claimedToday ? (es ? "¡Lista!" : "Ready!") : `${streak.count}d`,
                            hot: !streak.claimedToday,
                        },
                        {
                            href: "#sec-missions",
                            label: es ? "Misiones" : "Missions",
                            badge: `${completedMissionsCount}/${missions.length}`,
                            hot: claimableMissionsCount > 0,
                        },
                        {
                            href: "#sec-levels",
                            label: es ? "Niveles" : "Levels",
                            badge: `LVL ${levelRewards.currentLevel}`,
                            hot: levelRewards.pendingAmount > 0,
                        },
                        {
                            href: "#sec-legion",
                            label: es ? "Legión" : "Legion",
                            badge: "+$1.500",
                            hot: false,
                        },
                    ].map((pill) => (
                        <a
                            key={pill.href}
                            href={pill.href}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                                pill.hot
                                    ? "bg-[#13291b] border-emerald-500/50 text-emerald-200 hover:border-emerald-300"
                                    : "bg-[#120e09] border-[#34291b] text-[#d8ccb2] hover:border-[#d4af37]/60 hover:text-[#ffe9a8]"
                            }`}
                        >
                            <span>{pill.label}</span>
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                    pill.hot
                                        ? "bg-emerald-500/25 text-emerald-300"
                                        : "bg-[#221a10] text-[#e5bc48]"
                                }`}
                            >
                                {pill.badge}
                            </span>
                        </a>
                    ))}
                </div>
            </div>

            {/* ==================== 1. DAILY STREAK ==================== */}
            <section
                id="sec-streak"
                className="relative w-full rounded-2xl bg-gradient-to-b from-[#1d160f] to-[#100d09] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.08)] p-5 sm:p-6 md:p-8 overflow-hidden"
            >
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f59e0b]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-[#2c2318] pb-4 mb-5">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#45280d] to-[#1a1007] border border-[#f59e0b]/50 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0">
                            <FaFire className="text-2xl text-[#fbbf24]" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-[#f5ead4]">
                                {t("rewards.daily")}
                            </h2>
                            <p className="text-xs sm:text-sm text-[#9c8c72]">{t("rewards.streakDesc")}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2a1c0e] border border-[#f59e0b]/45 text-[#fbbf24] text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(245,158,11,0.18)]">
                            <FaFire className="text-[#f59e0b]" />
                            <span>
                                {streak.count} {t("rewards.day")}
                                {streak.count !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 7-Day Progress Meter */}
                <div className="mb-5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#9c8c72] mb-1.5">
                        <span>{es ? "Progreso de la semana" : "Weekly streak progress"}</span>
                        <span className="font-mono text-[#ffe9a8]">{streakDayProgress} / 7</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0a0806] border border-[#2b2217] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#b8901f] via-[#f59e0b] to-[#ffe9a8] transition-all duration-700"
                            style={{ width: `${Math.max(4, (streakDayProgress / 7) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* 7-Day Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
                    {streakList.map((reward, i) => {
                        const day = i + 1;
                        const isGrand = day === 7;
                        const reached = streak.claimedToday
                            ? day <= Math.min(streak.count, 7)
                            : day < Math.min(streak.nextDay, 7) || (streak.nextDay > 7 && day < 7);
                        const isNext = !streak.claimedToday && day === Math.min(streak.nextDay, 7);

                        return (
                            <div
                                key={day}
                                className={`relative flex flex-col items-center justify-between gap-2 rounded-2xl p-3.5 border transition-all duration-300 ${
                                    isGrand ? "col-span-2 sm:col-span-1" : ""
                                } ${
                                    reached
                                        ? "bg-gradient-to-b from-emerald-950/65 to-[#0d1813] border-emerald-500/55 text-emerald-300 shadow-[inset_0_0_16px_rgba(16,185,129,0.14)]"
                                        : isNext
                                          ? "bg-gradient-to-b from-[#36270f] via-[#22190a] to-[#140f08] border-[#ffd966] text-[#ffe9a8] shadow-[0_0_24px_rgba(229,188,72,0.3),inset_0_0_12px_rgba(229,188,72,0.15)] scale-[1.03]"
                                          : isGrand
                                            ? "bg-gradient-to-b from-[#241b0c] to-[#120e09] border-[#d4af37]/45 text-[#d4af37]"
                                            : "bg-[#120f0b]/90 border-[#2c2318] text-[#7d705b]"
                                }`}
                            >
                                {isNext && (
                                    <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-[#ffd966] text-[#1a1204] text-[9px] font-black uppercase tracking-wider shadow">
                                        {es ? "Hoy" : "Today"}
                                    </span>
                                )}
                                {!isNext && isGrand && (
                                    <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-[#2e220d] border border-[#d4af37]/70 text-[#ffe9a8] text-[9px] font-black uppercase tracking-wider">
                                        MAX
                                    </span>
                                )}

                                <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-85 mt-1">
                                    {t("rewards.day")} {day}
                                    {isGrand ? "+" : ""}
                                </span>

                                <div className="flex flex-col items-center gap-1">
                                    {isGrand && (
                                        <FaCrown
                                            className={`text-sm ${
                                                reached
                                                    ? "text-emerald-300"
                                                    : isNext
                                                      ? "text-[#ffd966]"
                                                      : "text-[#b8901f]"
                                            }`}
                                        />
                                    )}
                                    <span
                                        className={`text-base sm:text-lg font-black font-mono tabular-nums ${
                                            isNext
                                                ? "text-[#fff3c4]"
                                                : reached
                                                  ? "text-emerald-300"
                                                  : isGrand
                                                    ? "text-[#e5bc48]"
                                                    : "text-[#c4b497]"
                                        }`}
                                    >
                                        <Monetary value={reward} />
                                    </span>
                                </div>

                                <div className="h-5 flex items-center justify-center">
                                    {reached ? (
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/60">
                                            <FaCheck className="text-emerald-400 text-[9px]" />
                                        </span>
                                    ) : isNext ? (
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#ffd966] animate-ping" />
                                    ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#3a2f1d]" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#261e14]">
                    <span className="text-xs text-[#9c8c72]">
                        {streak.claimedToday
                            ? es
                                ? "Tu racha está asegurada por hoy. Volvé mañana para seguir sumando."
                                : "Your streak is locked in for today. Come back tomorrow!"
                            : es
                              ? `Reclamá ahora para asegurar tu racha de Día ${streak.nextDay}.`
                              : `Claim now to lock in your Day ${streak.nextDay} streak.`}
                    </span>
                    <div className="w-full sm:w-[290px]">
                        <MainButton
                            text={
                                streak.claimedToday ? (
                                    t("rewards.claimedToday")
                                ) : (
                                    <span>
                                        {t("rewards.claim")} <Monetary value={streak.nextReward} />
                                    </span>
                                )
                            }
                            onClick={handleClaimStreak}
                            type={streak.claimedToday ? "dark" : "success"}
                            pulse={!streak.claimedToday}
                            loading={loading === "streak"}
                            disabled={streak.claimedToday || loading === "streak"}
                        />
                    </div>
                </div>
            </section>

            {/* ==================== 2. DAILY MISSIONS ==================== */}
            <section
                id="sec-missions"
                className="relative w-full rounded-2xl bg-gradient-to-b from-[#1d160f] to-[#100d09] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.08)] p-5 sm:p-6 md:p-8 overflow-hidden"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2c2318] pb-4 mb-5">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#352410] to-[#161008] border border-[#d4af37]/50 flex items-center justify-center shadow-[0_0_18px_rgba(212,175,55,0.2)] shrink-0">
                            <FaGift className="text-xl text-[#ffd966]" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-[#f5ead4]">
                                {t("rewards.missions")}
                            </h2>
                            <p className="text-xs sm:text-sm text-[#9c8c72]">{t("rewards.missionsDesc")}</p>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14100b] border border-[#3a2f1d] text-xs font-bold text-[#ffe9a8]">
                        <FaTrophy className="text-[#d4af37]" />
                        <span>
                            {completedMissionsCount} / {missions.length}{" "}
                            {es ? "completadas" : "completed"}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-3.5">
                    {missions.map((m) => {
                        const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
                        const completed = m.progress >= m.target;
                        const meta = MISSION_META[m.key] || MISSION_META.bet_total;

                        return (
                            <div
                                key={m.key}
                                className={`flex flex-col md:flex-row md:items-center gap-4 rounded-2xl p-4 sm:p-5 border transition-all ${
                                    m.claimed
                                        ? "border-[#261f16] bg-[#0e0b08]/75 opacity-65"
                                        : completed
                                          ? "border-emerald-500/60 bg-gradient-to-r from-[#112418] via-[#131a14] to-[#110e0a] shadow-[0_0_24px_rgba(16,185,129,0.14)]"
                                          : "border-[#31271b] bg-[#130f0b] hover:border-[#d4af37]/45"
                                }`}
                            >
                                {/* Contextual Game Icon */}
                                <div
                                    className={`w-11 h-11 rounded-xl border flex items-center justify-center text-lg shrink-0 ${meta.accent}`}
                                >
                                    {meta.icon}
                                </div>

                                {/* Mission Info + Progress Bar */}
                                <div className="flex-1 min-w-0 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-sm sm:text-base font-extrabold text-[#f5ead4]">
                                            {t(`rewards.m_${m.key}`, { target: m.target })}
                                        </span>
                                        <span className="text-xs font-mono tabular-nums font-bold text-[#b9a77a]">
                                            {Math.min(m.progress, m.target).toLocaleString()} /{" "}
                                            {m.target.toLocaleString()} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-[#0a0806] rounded-full overflow-hidden border border-[#2a2218]">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${
                                                completed
                                                    ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.55)]"
                                                    : "bg-gradient-to-r from-[#9c7316] via-[#d4af37] to-[#ffe9a8]"
                                            }`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Reward + Claim / Go Play CTA */}
                                <div className="w-full md:w-[215px] flex md:flex-col items-center justify-between md:justify-center gap-2.5 pt-2.5 md:pt-0 border-t md:border-t-0 border-[#261f16]">
                                    <span className="text-[#ffd966] font-mono font-black text-base tracking-wide">
                                        + <Monetary value={m.reward} />
                                    </span>

                                    {m.claimed ? (
                                        <div className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/35 text-emerald-300 text-xs font-black uppercase tracking-wider w-40 md:w-full">
                                            <FaCheck className="text-[10px]" />
                                            <span>{t("rewards.claimed")}</span>
                                        </div>
                                    ) : completed ? (
                                        <div className="w-40 md:w-full">
                                            <MainButton
                                                text={t("rewards.claim")}
                                                onClick={() => handleClaimMission(m.key)}
                                                type="success"
                                                pulse
                                                textSize="text-xs"
                                                loading={loading === m.key}
                                                disabled={loading === m.key}
                                            />
                                        </div>
                                    ) : (
                                        <Link
                                            to={meta.to}
                                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#221a10] hover:bg-[#302415] border border-[#d4af37]/40 hover:border-[#ffd966] text-[#ffe9a8] text-xs font-black uppercase tracking-wider transition-all w-40 md:w-full"
                                        >
                                            <span>{es ? "Ir a jugar" : "Play now"}</span>
                                            <FaArrowRight className="text-[10px]" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ==================== 3. LEVEL REWARDS ==================== */}
            <section
                id="sec-levels"
                className="relative w-full rounded-2xl bg-gradient-to-b from-[#1d160f] to-[#100d09] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.08)] p-5 sm:p-6 md:p-8 overflow-hidden"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3a2a0e] to-[#140f08] border-2 border-[#d4af37]/60 flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.25)] shrink-0">
                                <GiRank3 className="text-3xl text-[#ffd966]" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-[#f5ead4]">
                                    {t("rewards.levelTitle")}
                                </h2>
                                <p className="text-xs sm:text-sm text-[#9c8c72] mt-0.5">
                                    {t("rewards.levelDesc")}{" "}
                                    <span className="inline-flex items-center px-2.5 py-0.5 ml-1 rounded-md bg-[#2a2115] border border-[#d4af37]/50 text-[#ffe9a8] font-mono font-black">
                                        {levelRewards.currentLevel}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Live Progress Toward Next Level Reward */}
                        <div className="rounded-xl bg-[#110d09] border border-[#2c2318] p-3.5 max-w-xl">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-[#c8bba0] font-semibold">
                                    {es
                                        ? `Próximo nivel (${levelRewards.currentLevel + 1}):`
                                        : `Next level (${levelRewards.currentLevel + 1}):`}{" "}
                                    <strong className="text-[#ffd966]">
                                        +<Monetary value={nextLevelPrize} />
                                    </strong>
                                </span>
                                <span className="font-mono font-bold text-[#e5bc48]">{xpPct}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#090705] border border-[#2a2116] overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#9c7316] via-[#d4af37] to-[#ffe9a8] transition-all duration-700"
                                    style={{ width: `${Math.max(4, xpPct)}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-[#8a7f63] mt-1.5 font-mono">
                                {t("ux.xpToNext", {
                                    xp: remainingXp.toLocaleString(),
                                    level: levelRewards.currentLevel + 1,
                                })}
                            </p>
                        </div>
                    </div>

                    {levelRewards.pendingAmount > 0 ? (
                        <div className="w-full md:w-[300px] shrink-0">
                            <MainButton
                                text={
                                    <span>
                                        {t("rewards.claim")}{" "}
                                        <Monetary value={levelRewards.pendingAmount} />
                                    </span>
                                }
                                onClick={handleClaimLevels}
                                type="success"
                                pulse
                                loading={loading === "levels"}
                                disabled={loading === "levels"}
                            />
                        </div>
                    ) : (
                        <div className="px-5 py-3.5 rounded-xl bg-[#130f0b] border border-[#2c2318] text-xs uppercase tracking-wider text-[#9b8d6f] font-bold text-center md:max-w-[260px]">
                            {t("rewards.nothingPending")}
                        </div>
                    )}
                </div>
            </section>

            {/* ==================== 4. GLADIATOR LEGION REFERRALS ==================== */}
            <div id="sec-legion" className="w-full">
                <LegionReferralPanel onBalanceUpdate={updateBalance} />
            </div>
        </div>
    );
};

export default Rewards;

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import MainButton from "../../components/MainButton";
import { getRewardsStatus, claimStreak, claimMission, claimLevelRewards } from "../../services/rewards/RewardsServices";
import { FaFire, FaGift, FaCheck } from "react-icons/fa";
import { GiRank3 } from "react-icons/gi";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";

const STREAK_REWARDS = [500, 750, 1000, 1500, 2000, 3000, 5000];

interface Mission {
    key: string;
    target: number;
    progress: number;
    reward: number;
    claimed: boolean;
}

interface RewardsStatus {
    streak: { count: number; claimedToday: boolean; nextDay: number; nextReward: number };
    missions: Mission[];
    levelRewards: { currentLevel: number; claimedUpTo: number; pendingAmount: number };
}

const Rewards = () => {
    const { t } = useTranslation();
    const { isLogged, toogleUserFlow, userData, toogleUserData } = useContext(UserContext);

    const [status, setStatus] = useState<RewardsStatus | null>(null);
    const [loading, setLoading] = useState<string | null>(null);

    const refresh = async () => {
        try {
            const data = await getRewardsStatus();
            setStatus(data);
        } catch (error) {
            // not logged in / server error: keep the page empty
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
            coinRainEmitter.trigger(40);
            toast.success(`+ $${res.reward} (${t("rewards.day")} ${res.streak})`, { theme: "dark" });
            updateBalance(res.walletBalance);
            await refresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t("toast.connError"), { theme: "dark" });
        } finally {
            setLoading(null);
        }
    };

    const handleClaimMission = async (key: string) => {
        setLoading(key);
        try {
            const res = await claimMission(key);
            sound.play("bonus");
            coinRainEmitter.trigger(25);
            toast.success(`+ $${res.reward}`, { theme: "dark" });
            updateBalance(res.walletBalance);
            await refresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t("toast.connError"), { theme: "dark" });
        } finally {
            setLoading(null);
        }
    };

    const handleClaimLevels = async () => {
        setLoading("levels");
        try {
            const res = await claimLevelRewards();
            sound.play("bonus");
            coinRainEmitter.trigger(60);
            toast.success(`+ $${res.reward}`, { theme: "dark" });
            updateBalance(res.walletBalance);
            await refresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t("toast.connError"), { theme: "dark" });
        } finally {
            setLoading(null);
        }
    };

    if (!status) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-[#d4af37]">
                <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
                <span className="text-sm uppercase tracking-[0.25em] text-[#a39475] font-semibold">
                    {t("games.loading")}
                </span>
            </div>
        );
    }

    const { streak, missions, levelRewards } = status;

    return (
        <div className="w-full flex flex-col items-center gap-8 py-10 px-4 max-w-[1100px] mx-auto">
            {/* Imperial Header */}
            <div className="flex flex-col items-center text-center gap-2 relative">
                <div className="flex items-center gap-3">
                    <span className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-transparent to-[#d4af37]" />
                    <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-bold">
                        Crixus Games
                    </span>
                    <span className="h-[1px] w-12 md:w-24 bg-gradient-to-l from-transparent to-[#d4af37]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.18em] bg-gradient-to-b from-[#fff3c4] via-[#e5bc48] to-[#9c7316] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,175,55,0.25)]">
                    {t("rewards.title")}
                </h1>
            </div>

            {/* ---- Daily Streak ---- */}
            <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#1b1610] to-[#110e0a] border border-[#3d3122] shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.08)] p-6 md:p-8 overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2c2318] pb-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3a2410] to-[#1a1108] border border-[#d4af37]/40 flex items-center justify-center shadow-[0_0_15px_rgba(236,168,35,0.2)]">
                            <FaFire className="text-2xl text-[#f59e0b]" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wider text-[#f5ead4]">
                                {t("rewards.daily")}
                            </h2>
                            <p className="text-xs md:text-sm text-[#9c8c72]">{t("rewards.streakDesc")}</p>
                        </div>
                    </div>
                    {streak.count > 0 && (
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2a1c0e] border border-[#f59e0b]/40 text-[#fbbf24] text-sm font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                            <FaFire className="text-[#f59e0b]" />
                            <span>{streak.count} {t("rewards.day")}{streak.count > 1 ? "s" : ""}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
                    {STREAK_REWARDS.map((reward, i) => {
                        const day = i + 1;
                        const reached = streak.claimedToday
                            ? day <= Math.min(streak.count, 7)
                            : day < Math.min(streak.nextDay, 7) || (streak.nextDay > 7 && day < 7);
                        const isNext = !streak.claimedToday && day === Math.min(streak.nextDay, 7);
                        return (
                            <div
                                key={day}
                                className={`relative flex flex-col items-center justify-between gap-2 rounded-xl p-3.5 border transition-all duration-300 ${
                                    reached
                                        ? "bg-gradient-to-b from-emerald-950/60 to-[#0e1914] border-emerald-500/50 text-emerald-300 shadow-[inset_0_0_15px_rgba(16,185,129,0.15)]"
                                        : isNext
                                        ? "bg-gradient-to-b from-[#2f2310] to-[#171209] border-[#e5bc48] text-[#ffe9a8] shadow-[0_0_20px_rgba(229,188,72,0.25),inset_0_0_12px_rgba(229,188,72,0.15)] scale-[1.02]"
                                        : "bg-[#120f0b]/90 border-[#2c2318] text-[#7d705b]"
                                }`}
                            >
                                <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">
                                    {t("rewards.day")} {day}{day === 7 ? "+" : ""}
                                </span>
                                <span className={`text-base font-black ${isNext ? "text-[#ffe9a8]" : reached ? "text-emerald-300" : "text-[#c4b497]"}`}>
                                    <Monetary value={reward} />
                                </span>
                                <div className="h-4 flex items-center justify-center">
                                    {reached ? (
                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/60">
                                            <FaCheck className="text-emerald-400 text-[9px]" />
                                        </span>
                                    ) : isNext ? (
                                        <span className="w-2 h-2 rounded-full bg-[#e5bc48] animate-ping" />
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-center md:justify-end">
                    <div className="w-full md:w-[320px]">
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
                            type="success"
                            pulse={!streak.claimedToday}
                            loading={loading === "streak"}
                            disabled={streak.claimedToday || loading === "streak"}
                        />
                    </div>
                </div>
            </div>

            {/* ---- Daily Missions ---- */}
            <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#1b1610] to-[#110e0a] border border-[#3d3122] shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.08)] p-6 md:p-8 overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[#2c2318] pb-4 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2d1f10] to-[#161008] border border-[#d4af37]/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        <FaGift className="text-xl text-[#e5bc48]" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wider text-[#f5ead4]">
                            {t("rewards.missions")}
                        </h2>
                        <p className="text-xs md:text-sm text-[#9c8c72]">{t("rewards.missionsDesc")}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3.5">
                    {missions.map((m) => {
                        const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
                        const completed = m.progress >= m.target;
                        return (
                            <div
                                key={m.key}
                                className={`flex flex-col md:flex-row md:items-center gap-4 rounded-xl p-4 border transition-all ${
                                    m.claimed
                                        ? "border-[#261f16] bg-[#0f0c09]/60 opacity-60"
                                        : completed
                                        ? "border-emerald-500/60 bg-gradient-to-r from-[#132219] via-[#141914] to-[#120f0b] shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                                        : "border-[#2f261b] bg-[#13100b] hover:border-[#4a3b28]"
                                }`}
                            >
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm md:text-base font-bold text-[#efe6cf]">
                                            {t(`rewards.m_${m.key}`, { target: m.target })}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-[#a39475]">
                                            {Math.min(m.progress, m.target)} / {m.target} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-[#0a0806] rounded-full overflow-hidden border border-[#2a2218]">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${
                                                completed
                                                    ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                    : "bg-gradient-to-r from-[#9c7316] via-[#d4af37] to-[#ffe9a8]"
                                            }`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="w-full md:w-[210px] flex md:flex-col items-center justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#261f16]">
                                    <span className="text-[#e5bc48] font-black text-sm tracking-wide">
                                        + <Monetary value={m.reward} />
                                    </span>
                                    <div className="w-40 md:w-full">
                                        <MainButton
                                            text={m.claimed ? t("rewards.claimed") : t("rewards.claim")}
                                            onClick={() => handleClaimMission(m.key)}
                                            type={completed && !m.claimed ? "success" : "dark"}
                                            textSize="text-xs"
                                            loading={loading === m.key}
                                            disabled={!completed || m.claimed || loading === m.key}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ---- Level Rewards ---- */}
            <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#1b1610] to-[#110e0a] border border-[#3d3122] shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.08)] p-6 md:p-8 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2d2210] to-[#140f08] border border-[#d4af37]/50 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                            <GiRank3 className="text-2xl text-[#e5bc48]" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wider text-[#f5ead4]">
                                {t("rewards.levelTitle")}
                            </h2>
                            <p className="text-sm text-[#9c8c72] mt-0.5">
                                {t("rewards.levelDesc")}{" "}
                                <span className="inline-flex items-center px-2.5 py-0.5 ml-1 rounded-md bg-[#2a2115] border border-[#d4af37]/40 text-[#ffe9a8] font-black">
                                    {levelRewards.currentLevel}
                                </span>
                            </p>
                        </div>
                    </div>

                    {levelRewards.pendingAmount > 0 ? (
                        <div className="w-full md:w-[300px]">
                            <MainButton
                                text={
                                    <span>
                                        {t("rewards.claim")} <Monetary value={levelRewards.pendingAmount} />
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
                        <div className="px-4 py-2.5 rounded-xl bg-[#13100b] border border-[#2c2318] text-xs uppercase tracking-wider text-[#8a7f63] font-semibold">
                            {t("rewards.nothingPending")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Rewards;


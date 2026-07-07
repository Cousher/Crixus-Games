import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import MainButton from "../../components/MainButton";
import { getRewardsStatus, claimStreak, claimMission, claimLevelRewards } from "../../services/rewards/RewardsServices";
import { FaFire, FaGift, FaCheck } from "react-icons/fa";
import { GiRank3 } from "react-icons/gi";

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
            toast.success(`+ K₽${res.reward} (${t("rewards.day")} ${res.streak})`, { theme: "dark" });
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
            toast.success(`+ K₽${res.reward}`, { theme: "dark" });
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
            toast.success(`+ K₽${res.reward}`, { theme: "dark" });
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
            <div className="w-full flex justify-center py-16 text-gray-400">
                {t("games.loading")}
            </div>
        );
    }

    const { streak, missions, levelRewards } = status;

    return (
        <div className="w-full flex flex-col items-center gap-8 py-8 px-4">
            <h1 className="text-3xl font-bold tracking-widest text-amber-400">{t("rewards.title")}</h1>

            {/* ---- daily streak ---- */}
            <div className="bg-[#1c1813] rounded p-6 w-full max-w-[900px] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <FaFire className="text-2xl text-orange-500" />
                    <h2 className="text-xl font-bold">{t("rewards.daily")}</h2>
                    {streak.count > 0 && (
                        <span className="text-orange-400 text-sm font-bold">🔥 {streak.count}</span>
                    )}
                </div>
                <p className="text-sm text-gray-400">{t("rewards.streakDesc")}</p>

                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {STREAK_REWARDS.map((reward, i) => {
                        const day = i + 1;
                        const reached = streak.claimedToday ? day <= Math.min(streak.count, 7) : day < Math.min(streak.nextDay, 7) || (streak.nextDay > 7 && day < 7);
                        const isNext = !streak.claimedToday && day === Math.min(streak.nextDay, 7);
                        return (
                            <div
                                key={day}
                                className={`flex flex-col items-center gap-1 rounded p-2 border text-sm ${reached
                                    ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
                                    : isNext
                                        ? "bg-amber-900/40 border-amber-500 text-amber-300 animate-pulse"
                                        : "bg-[#12100c] border-[#3d362a] text-gray-400"
                                    }`}
                            >
                                <span className="text-xs">{t("rewards.day")} {day}{day === 7 ? "+" : ""}</span>
                                <span className="font-bold"><Monetary value={reward} /></span>
                                {reached && <FaCheck className="text-emerald-400 text-xs" />}
                            </div>
                        );
                    })}
                </div>

                <div className="max-w-[300px]">
                    <MainButton
                        text={streak.claimedToday
                            ? t("rewards.claimedToday")
                            : <span>{t("rewards.claim")} <Monetary value={streak.nextReward} /></span>}
                        onClick={handleClaimStreak}
                        type="success"
                        pulse={!streak.claimedToday}
                        loading={loading === "streak"}
                        disabled={streak.claimedToday || loading === "streak"}
                    />
                </div>
            </div>

            {/* ---- daily missions ---- */}
            <div className="bg-[#1c1813] rounded p-6 w-full max-w-[900px] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <FaGift className="text-2xl text-purple-400" />
                    <h2 className="text-xl font-bold">{t("rewards.missions")}</h2>
                </div>
                <p className="text-sm text-gray-400">{t("rewards.missionsDesc")}</p>

                <div className="flex flex-col gap-3">
                    {missions.map((m) => {
                        const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
                        const completed = m.progress >= m.target;
                        return (
                            <div key={m.key} className={`flex flex-col md:flex-row md:items-center gap-3 rounded p-3 border ${m.claimed ? "border-[#3d362a] opacity-60" : completed ? "border-emerald-600" : "border-[#3d362a]"} bg-[#12100c]`}>
                                <div className="flex-1 flex flex-col gap-1">
                                    <span className="text-sm">{t(`rewards.m_${m.key}`, { target: m.target })}</span>
                                    <div className="w-full h-2 bg-[#2a251c] rounded overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${completed ? "bg-emerald-500" : "bg-amber-500"}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{Math.min(m.progress, m.target)} / {m.target}</span>
                                </div>
                                <div className="w-full md:w-[170px] flex flex-col items-center gap-1">
                                    <span className="text-amber-400 font-bold text-sm">+ <Monetary value={m.reward} /></span>
                                    <MainButton
                                        text={m.claimed ? t("rewards.claimed") : t("rewards.claim")}
                                        onClick={() => handleClaimMission(m.key)}
                                        type={completed && !m.claimed ? "success" : "dark"}
                                        textSize="text-sm"
                                        loading={loading === m.key}
                                        disabled={!completed || m.claimed || loading === m.key}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ---- level rewards ---- */}
            <div className="bg-[#1c1813] rounded p-6 w-full max-w-[900px] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <GiRank3 className="text-2xl text-blue-400" />
                    <h2 className="text-xl font-bold">{t("rewards.levelTitle")}</h2>
                </div>
                <p className="text-sm text-gray-400">
                    {t("rewards.levelDesc")} <span className="text-white font-bold">{levelRewards.currentLevel}</span>
                </p>

                {levelRewards.pendingAmount > 0 ? (
                    <div className="max-w-[300px]">
                        <MainButton
                            text={<span>{t("rewards.claim")} <Monetary value={levelRewards.pendingAmount} /></span>}
                            onClick={handleClaimLevels}
                            type="success"
                            pulse
                            loading={loading === "levels"}
                            disabled={loading === "levels"}
                        />
                    </div>
                ) : (
                    <span className="text-sm text-gray-500">{t("rewards.nothingPending")}</span>
                )}
            </div>
        </div>
    );
};

export default Rewards;

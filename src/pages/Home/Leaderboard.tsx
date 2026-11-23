import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FaArrowUp,
    FaClock,
    FaCrown,
    FaShieldAlt,
    FaTrophy,
    FaUsers,
    FaWhatsapp,
} from "react-icons/fa";
import {
    getFriendsLeaderboard,
    getLeagueLeaderboard,
    getTopPlayers,
} from "../../services/users/UserServices";
import { User } from "../../components/Types";
import UserContext from "../../UserContext";
import Title from "../../components/Title";
import TopPlayer from "../../components/TopPlayer";
import Player from "../../components/Player";
import Monetary from "../../components/Monetary";
import Skeleton from "react-loading-skeleton";
import { buildWhatsAppInviteUrl } from "../../utils/referral";

type LeaderboardTab = "global" | "league" | "friends";

interface LeagueInfo {
    id: string;
    order: number;
    prizes: number[];
    promoSlots: number;
}

const LEAGUE_META: Record<
    string,
    { es: string; en: string; badgeCls: string; accent: string }
> = {
    bronze: {
        es: "Arena de Bronce",
        en: "Bronze Arena",
        badgeCls: "bg-[#2c1a10] border-[#cd7f32]/60 text-[#f3b67a]",
        accent: "text-[#f3b67a]",
    },
    silver: {
        es: "Guardia de Plata",
        en: "Silver Guard",
        badgeCls: "bg-[#1d2128] border-[#c0c0c0]/60 text-[#e2e8f0]",
        accent: "text-[#e2e8f0]",
    },
    gold: {
        es: "Legión de Oro",
        en: "Golden Legion",
        badgeCls: "bg-[#2e230d] border-[#ffd966]/70 text-[#ffe9a8]",
        accent: "text-[#ffd966]",
    },
    legion: {
        es: "Pretorianos",
        en: "Praetorians",
        badgeCls: "bg-[#2a1224] border-[#c084fc]/60 text-[#e9d5ff]",
        accent: "text-[#d8b4fe]",
    },
    emperor: {
        es: "Cónsules del Coliseo",
        en: "Colosseum Emperors",
        badgeCls: "bg-[#301014] border-[#fb7185]/70 text-[#ffe4e6]",
        accent: "text-[#fda4af]",
    },
};

function formatTimeUntil(isoDate: string | null, es: boolean): string {
    if (!isoDate) return "";
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return es ? "Cerrando..." : "Settling...";
    const days = Math.floor(diff / (24 * 3600 * 1000));
    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
}

const Leaderboard = () => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");
    const { isLogged, userData, toogleUserFlow } = useContext(UserContext);

    const [tab, setTab] = useState<LeaderboardTab>("global");
    const [globalUsers, setGlobalUsers] = useState<User[]>([]);
    const [friendsUsers, setFriendsUsers] = useState<User[]>([]);
    const [friendsCount, setFriendsCount] = useState<number>(0);
    const [leagueData, setLeagueData] = useState<{
        league: LeagueInfo;
        myRank: number;
        players: User[];
        nextResetAt: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        if (tab === "global") {
            getTopPlayers()
                .then((list) => setGlobalUsers(list || []))
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
            return;
        }

        if (!isLogged) {
            setLoading(false);
            return;
        }

        if (tab === "friends") {
            getFriendsLeaderboard()
                .then((res) => {
                    setFriendsUsers(res?.players || []);
                    setFriendsCount(res?.friendsCount || 0);
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
            return;
        }

        if (tab === "league") {
            getLeagueLeaderboard()
                .then((res) => setLeagueData(res || null))
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [tab, isLogged]);

    const currentLeagueMeta = leagueData
        ? LEAGUE_META[leagueData.league.id] || LEAGUE_META.bronze
        : LEAGUE_META.bronze;

    const myId = userData?.id;

    return (
        <section className="w-full flex flex-col items-center justify-center px-3 sm:px-4 py-8 relative z-10">
            <div className="w-full max-w-[960px] flex flex-col items-center">
                <Title
                    title={t("home.leaderboard")}
                    subtitle={
                        es
                            ? "Competí en el ranking global, ascendé en tu Liga semanal o superá a tus amigos"
                            : "Compete globally, climb your Weekly League, or beat your friends"
                    }
                />

                {/* 3-Tab Switcher: Global | Mi Liga | Solo Amigos */}
                <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#130f0a] border border-[#d4af37]/30 mt-5 mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    {[
                        {
                            id: "global" as LeaderboardTab,
                            label: es ? "Global" : "Global",
                            icon: <FaTrophy className="text-xs" />,
                        },
                        {
                            id: "league" as LeaderboardTab,
                            label: es ? "Mi Liga" : "My League",
                            icon: <FaShieldAlt className="text-xs" />,
                        },
                        {
                            id: "friends" as LeaderboardTab,
                            label: es ? "Solo Amigos" : "Friends",
                            icon: <FaUsers className="text-xs" />,
                        },
                    ].map((item) => {
                        const active = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setTab(item.id)}
                                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    active
                                        ? "bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] text-[#1a1204] shadow-[0_0_16px_rgba(212,175,55,0.4)]"
                                        : "text-[#c8bba0] hover:text-[#ffe9a8]"
                                }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Guest Prompt for League / Friends Tabs */}
                {tab !== "global" && !isLogged && (
                    <div className="w-full rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#1c160f] to-[#0f0c09] p-8 text-center flex flex-col items-center gap-4">
                        <FaCrown className="text-3xl text-[#ffd966]" />
                        <p className="text-sm sm:text-base text-[#e7ddc8] max-w-md">
                            {tab === "league"
                                ? es
                                    ? "Iniciá sesión para ver tu Liga Semanal, tus premios de ascenso y tu puesto en vivo."
                                    : "Sign in to view your Weekly League, promotion prizes and live rank."
                                : es
                                  ? "Iniciá sesión para competir en tu Coliseo privado contra tus amigos."
                                  : "Sign in to compete in your private leaderboard against friends."}
                        </p>
                        <button
                            type="button"
                            onClick={() => toogleUserFlow(true)}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black uppercase tracking-wider text-xs cursor-pointer"
                        >
                            {t("nav.signIn")}
                        </button>
                    </div>
                )}

                {/* ============ TAB 1: GLOBAL ============ */}
                {tab === "global" && (
                    <>
                        {loading ? (
                            <div className="grid grid-cols-3 gap-3 sm:gap-5 w-full max-w-[780px] my-4">
                                {[0, 1, 2].map((i) => (
                                    <Skeleton
                                        key={i}
                                        height={200}
                                        borderRadius={16}
                                        highlightColor="#14110c"
                                        baseColor="#221d16"
                                    />
                                ))}
                            </div>
                        ) : globalUsers.length >= 3 ? (
                            <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-5 w-full max-w-[780px] mt-2 mb-8">
                                <TopPlayer
                                    key={(globalUsers[1] as any)._id || globalUsers[1].id}
                                    user={globalUsers[1]}
                                    rank={2}
                                />
                                <TopPlayer
                                    key={(globalUsers[0] as any)._id || globalUsers[0].id}
                                    user={globalUsers[0]}
                                    rank={1}
                                />
                                <TopPlayer
                                    key={(globalUsers[2] as any)._id || globalUsers[2].id}
                                    user={globalUsers[2]}
                                    rank={3}
                                />
                            </div>
                        ) : null}

                        <div className="w-full rounded-2xl overflow-hidden border border-[#d4af37]/30 bg-gradient-to-b from-[#1c160f] to-[#0f0c09] shadow-[0_18px_45px_rgba(0,0,0,0.75)]">
                            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-[#241c12] via-[#1c160e] to-[#241c12] border-b border-[#d4af37]/25">
                                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                                    <FaTrophy className="text-[#d4af37]" />
                                    {es ? "Top Semanal Global" : "Global Weekly Top"}
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9b8d6f]">
                                    {t("home.winnings")}
                                </span>
                            </div>

                            <div className="divide-y divide-[#d4af37]/10">
                                {loading && (
                                    <div className="p-4">
                                        <Skeleton count={5} height={54} highlightColor="#14110c" baseColor="#221d16" />
                                    </div>
                                )}

                                {!loading &&
                                    globalUsers.slice(3).map((user, index) => {
                                        const rank = index + 4;
                                        const uid = (user as any)._id || user.id || index;
                                        const lg = LEAGUE_META[(user as any).league || "bronze"] || LEAGUE_META.bronze;
                                        return (
                                            <div
                                                key={uid}
                                                className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-[#d4af37]/[0.05] transition-colors gap-3"
                                            >
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <span className="w-8 h-8 rounded-full bg-[#120e09] border border-[#3e3219] flex items-center justify-center font-mono tabular-nums font-black text-xs text-[#b9a77a] shrink-0">
                                                        #{rank}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <Player user={user} size="small" />
                                                    </div>
                                                    <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${lg.badgeCls}`}>
                                                        {es ? lg.es : lg.en}
                                                    </span>
                                                </div>
                                                <span className="font-mono tabular-nums font-black text-sm sm:text-base text-[#ffe9a8] shrink-0">
                                                    <Monetary value={user.weeklyWinnings} />
                                                </span>
                                            </div>
                                        );
                                    })}

                                {!loading && globalUsers.length <= 3 && globalUsers.length > 0 && (
                                    <div className="py-5 text-center text-xs uppercase tracking-widest text-[#8a7f63]">
                                        {es ? "¡Jugá para entrar al Top 10 semanal!" : "Play to enter the weekly Top 10!"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ============ TAB 2: WEEKLY LEAGUE ============ */}
                {tab === "league" && isLogged && (
                    <div className="w-full rounded-2xl overflow-hidden border border-[#d4af37]/35 bg-gradient-to-b from-[#1c160f] to-[#0f0c09] shadow-[0_18px_45px_rgba(0,0,0,0.75)]">
                        {loading || !leagueData ? (
                            <div className="p-5">
                                <Skeleton count={6} height={54} highlightColor="#14110c" baseColor="#221d16" />
                            </div>
                        ) : (
                            <>
                                {/* League Header Banner */}
                                <div className="p-4 sm:p-5 bg-gradient-to-r from-[#261c10] via-[#1c150c] to-[#261c10] border-b border-[#d4af37]/25 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${currentLeagueMeta.badgeCls}`}>
                                            {es ? currentLeagueMeta.es : currentLeagueMeta.en}
                                        </span>
                                        <span className="text-xs text-[#c8bba0]">
                                            {es ? "Tu puesto:" : "Your rank:"}{" "}
                                            <strong className="text-[#ffe9a8]">#{leagueData.myRank}</strong>
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#120e09] border border-[#3a2f1d] text-[#ffe9a8] font-mono">
                                            <FaClock className="text-[#d4af37]" />
                                            {es ? "Cierra en" : "Resets in"}{" "}
                                            {formatTimeUntil(leagueData.nextResetAt, es)}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-bold">
                                            Top 3: ${leagueData.league.prizes.map((p) => p.toLocaleString()).join(" / $")}
                                        </span>
                                    </div>
                                </div>

                                {/* League Players List */}
                                <div className="divide-y divide-[#d4af37]/10">
                                    {leagueData.players.map((user, idx) => {
                                        const rank = idx + 1;
                                        const uid = String((user as any)._id || user.id || idx);
                                        const isMe = Boolean(myId && uid === String(myId));
                                        const isPromo =
                                            leagueData.league.promoSlots > 0 &&
                                            rank <= leagueData.league.promoSlots &&
                                            (user.weeklyWinnings || 0) > 0;
                                        const prize = leagueData.league.prizes[idx] || 0;

                                        return (
                                            <div
                                                key={uid}
                                                className={`flex items-center justify-between px-4 sm:px-6 py-3 gap-3 transition-colors ${
                                                    isMe
                                                        ? "bg-[#d4af37]/15 border-l-2 border-[#ffd966]"
                                                        : "hover:bg-[#d4af37]/[0.04]"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 border ${
                                                            rank === 1
                                                                ? "bg-[#3d2b0b] border-[#ffd966] text-[#fff2c2]"
                                                                : rank === 2
                                                                  ? "bg-[#25272c] border-[#cbd5e1] text-white"
                                                                  : rank === 3
                                                                    ? "bg-[#2e1c11] border-[#cd7f32] text-[#f3b67a]"
                                                                    : "bg-[#120e09] border-[#3e3219] text-[#b9a77a]"
                                                        }`}
                                                    >
                                                        #{rank}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <Player user={user} size="small" />
                                                    </div>
                                                    {isPromo && (
                                                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
                                                            <FaArrowUp className="text-[8px]" />
                                                            {es ? "Ascenso" : "Promote"}
                                                        </span>
                                                    )}
                                                    {prize > 0 && (user.weeklyWinnings || 0) > 0 && (
                                                        <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-[#2a200d] border border-[#d4af37]/40 text-[#ffe9a8] text-[10px] font-mono font-bold">
                                                            +${prize.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="font-mono tabular-nums font-black text-sm sm:text-base text-[#ffe9a8] shrink-0">
                                                    <Monetary value={user.weeklyWinnings} />
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ============ TAB 3: FRIENDS LEADERBOARD ("TU COLISEO") ============ */}
                {tab === "friends" && isLogged && (
                    <div className="w-full rounded-2xl overflow-hidden border border-[#d4af37]/35 bg-gradient-to-b from-[#1c160f] to-[#0f0c09] shadow-[0_18px_45px_rgba(0,0,0,0.75)]">
                        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-[#241c12] via-[#1c160e] to-[#241c12] border-b border-[#d4af37]/25 flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                                <FaUsers className="text-[#d4af37]" />
                                {es ? `Tu Coliseo (${friendsCount} amigos)` : `Your Colosseum (${friendsCount} friends)`}
                            </span>

                            {userData?.username && (
                                <a
                                    href={buildWhatsAppInviteUrl(userData.username, es)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16a34a] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-wider transition-all"
                                >
                                    <FaWhatsapp className="text-sm" />
                                    <span>{es ? "Sumar amigos" : "Invite friends"}</span>
                                </a>
                            )}
                        </div>

                        <div className="divide-y divide-[#d4af37]/10">
                            {loading ? (
                                <div className="p-4">
                                    <Skeleton count={4} height={54} highlightColor="#14110c" baseColor="#221d16" />
                                </div>
                            ) : (
                                friendsUsers.map((user, idx) => {
                                    const uid = String((user as any)._id || user.id || idx);
                                    const isMe = Boolean(myId && uid === String(myId));
                                    return (
                                        <div
                                            key={uid}
                                            className={`flex items-center justify-between px-4 sm:px-6 py-3 gap-3 ${
                                                isMe ? "bg-[#d4af37]/15 border-l-2 border-[#ffd966]" : ""
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-8 h-8 rounded-full bg-[#120e09] border border-[#3e3219] flex items-center justify-center font-mono font-black text-xs text-[#ffe9a8] shrink-0">
                                                    #{idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <Player user={user} size="small" />
                                                </div>
                                                {isMe && (
                                                    <span className="px-2 py-0.5 rounded-full bg-[#2b200e] border border-[#ffd966]/60 text-[#ffe9a8] text-[10px] font-black uppercase">
                                                        {es ? "Vos" : "You"}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-mono tabular-nums font-black text-sm sm:text-base text-[#ffe9a8] shrink-0">
                                                <Monetary value={user.weeklyWinnings} />
                                            </span>
                                        </div>
                                    );
                                })
                            )}

                            {!loading && friendsCount === 0 && (
                                <div className="p-6 text-center flex flex-col items-center gap-3">
                                    <p className="text-xs sm:text-sm text-[#a89a80]">
                                        {es
                                            ? "Todavía no tenés amigos en tu Coliseo. Invitalos por WhatsApp y se agregan automáticamente para competir semana a semana."
                                            : "No friends in your Colosseum yet. Invite them on WhatsApp to auto-connect and compete weekly."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default Leaderboard;

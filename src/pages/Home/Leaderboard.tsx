import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaTrophy } from "react-icons/fa";
import { getTopPlayers } from "../../services/users/UserServices";
import { User } from "../../components/Types";
import Title from "../../components/Title";
import TopPlayer from "../../components/TopPlayer";
import Player from "../../components/Player";
import Monetary from "../../components/Monetary";
import Skeleton from "react-loading-skeleton";

const Leaderboard = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    useEffect(() => {
        setLoading(true);
        getTopPlayers()
            .then((list) => {
                setUsers(list || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <section className="w-full flex flex-col items-center justify-center px-3 sm:px-4 py-8 relative z-10">
            <div className="w-full max-w-[960px] flex flex-col items-center">
                <Title
                    title={t("home.leaderboard")}
                    subtitle={
                        es
                            ? "Los gladiadores con mayores ganancias semanales del Coliseo"
                            : "The gladiators with the highest weekly winnings in the Colosseum"
                    }
                />

                {/* Top 3 Podium (Visible on both Mobile & Desktop!) */}
                {loading ? (
                    <div className="grid grid-cols-3 gap-3 sm:gap-5 w-full max-w-[780px] my-6">
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
                ) : users.length >= 3 ? (
                    <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-5 w-full max-w-[780px] mt-6 mb-8">
                        <TopPlayer key={(users[1] as any)._id || users[1].id} user={users[1]} rank={2} />
                        <TopPlayer key={(users[0] as any)._id || users[0].id} user={users[0]} rank={1} />
                        <TopPlayer key={(users[2] as any)._id || users[2].id} user={users[2]} rank={3} />
                    </div>
                ) : null}

                {/* Ranks #4 - #10 Colosseum Table */}
                <div className="w-full rounded-2xl overflow-hidden border border-[#d4af37]/30 bg-gradient-to-b from-[#1c160f] to-[#0f0c09] shadow-[0_18px_45px_rgba(0,0,0,0.75)]">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-[#241c12] via-[#1c160e] to-[#241c12] border-b border-[#d4af37]/25">
                        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                            <FaTrophy className="text-[#d4af37]" />
                            {es ? "Top Semanal" : "Weekly Top"}
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
                            users.slice(3).map((user, index) => {
                                const rank = index + 4;
                                const uid = (user as any)._id || user.id || index;
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
                                        </div>
                                        <span className="font-mono tabular-nums font-black text-sm sm:text-base text-[#ffe9a8] shrink-0">
                                            <Monetary value={user.weeklyWinnings} />
                                        </span>
                                    </div>
                                );
                            })}

                        {!loading && users.length <= 3 && users.length > 0 && (
                            <div className="py-5 text-center text-xs uppercase tracking-widest text-[#8a7f63]">
                                {es ? "¡Jugá para entrar al Top 10 semanal!" : "Play to enter the weekly Top 10!"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Leaderboard;

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaUsers } from "react-icons/fa";
import PlayerPreview from "../../components/PlayerPreview";
import Avatar from "../../components/Avatar";
import Monetary from "../../components/Monetary";

interface LiveBetsProps {
    gameState: any;
    currentUserId?: string;
}

const LiveBets: React.FC<LiveBetsProps> = React.memo(({ gameState, currentUserId }) => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    const handleMouseEnter = (playerId: string) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => setHoveredPlayerId(playerId), 450);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHoveredPlayerId(null);
    };

    const playersObj = gameState?.gamePlayers || {};
    const betsObj = gameState?.gameBets || {};
    const playerIds = Object.keys(playersObj).sort((a, b) => Number(betsObj[b] || 0) - Number(betsObj[a] || 0));
    const totalBets = playerIds.reduce((sum, id) => sum + Number(betsObj[id] || 0), 0);

    return (
        <div className="w-full max-w-[1140px] flex flex-col p-4 sm:p-5 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#1c160f] to-[#0f0c09] shadow-[0_14px_40px_rgba(0,0,0,0.65)]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#d4af37]/20 gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                        {t("games.totalBets")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0e0b08] border border-[#d4af37]/25 text-xs font-mono tabular-nums font-bold text-[#c9ba9a]">
                        <FaUsers className="text-[#d4af37] text-[11px]" />
                        {playerIds.length}
                    </span>
                </div>
                <span className="font-mono tabular-nums font-black text-base text-[#ffe9a8]">
                    <Monetary value={totalBets} />
                </span>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 items-center px-2.5 py-2 mt-2 bg-[#0d0a07] rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#9b8d6f]">
                <span className="col-span-5 sm:col-span-6">{t("games.user")}</span>
                <span className="col-span-3 sm:col-span-2 text-right">{t("games.bet")}</span>
                <span className="col-span-2 text-right">{t("games.payout")}</span>
                <span className="col-span-2 text-right">{t("games.profit")}</span>
            </div>

            {/* Rows */}
            <div className="flex flex-col gap-1 mt-1.5">
                {playerIds.length === 0 && (
                    <div className="py-5 text-center text-xs uppercase tracking-[0.16em] text-[#7a6f59] font-semibold">
                        {t("games.noBetsYet")}
                    </div>
                )}
                {playerIds.map((playerId) => {
                    const player = playersObj[playerId];
                    const bet = Number(betsObj[playerId] || 0);
                    const cashedOut = player.payout != null;
                    const payoutAmount = cashedOut ? player.payout * bet : 0;
                    const isMe = Boolean(currentUserId && String(currentUserId) === String(playerId));

                    return (
                        <div
                            key={playerId}
                            onMouseEnter={() => handleMouseEnter(playerId)}
                            onMouseLeave={handleMouseLeave}
                            className={`grid grid-cols-12 items-center px-2.5 py-2.5 rounded-xl relative transition-colors ${
                                cashedOut
                                    ? "bg-emerald-950/35 border border-emerald-500/35"
                                    : isMe
                                        ? "bg-[#2a2010]/65 border border-[#d4af37]/45"
                                        : "bg-[#120e09]/60 border border-white/[0.04]"
                            }`}
                        >
                            {playerId === hoveredPlayerId && <PlayerPreview player={player} />}

                            <a
                                href={`/profile/${playerId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="col-span-5 sm:col-span-6 text-[#f3ead6] hover:text-[#ffe9a8] transition-colors min-w-0 pr-2"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar
                                        image={player.profilePicture}
                                        id={playerId}
                                        size="small"
                                        level={player.level}
                                    />
                                    <span className="font-bold text-xs sm:text-sm truncate">{player.username}</span>
                                    {isMe && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 text-[9px] font-black uppercase text-[#ffe9a8] shrink-0">
                                            {es ? "Vos" : "You"}
                                        </span>
                                    )}
                                </div>
                            </a>

                            <span className="col-span-3 sm:col-span-2 text-right font-mono tabular-nums font-bold text-xs sm:text-sm text-[#e6ca6a]">
                                <Monetary value={bet} />
                            </span>

                            <span
                                className={`col-span-2 text-right font-mono tabular-nums font-bold text-xs sm:text-sm ${
                                    cashedOut ? "text-emerald-300" : "text-[#6f6552]"
                                }`}
                            >
                                {cashedOut ? `${Number(player.payout).toFixed(2)}x` : "—"}
                            </span>

                            <span
                                className={`col-span-2 text-right font-mono tabular-nums font-bold text-xs sm:text-sm ${
                                    cashedOut ? "text-emerald-300" : "text-[#6f6552]"
                                }`}
                            >
                                {cashedOut ? (
                                    <Monetary value={payoutAmount} showFraction={payoutAmount % 1 !== 0} />
                                ) : (
                                    "—"
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

LiveBets.displayName = "LiveBets";

export default LiveBets;

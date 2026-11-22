import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCrown, FaUsers } from "react-icons/fa";
import PlayerPreview from "../../components/PlayerPreview";
import Avatar from "../../components/Avatar";
import Monetary from "../../components/Monetary";

interface LiveBetsProps {
    gameState: any;
    type: "Heads" | "Tails";
    isWinner?: boolean;
    currentUserId?: string;
}

const LiveBets: React.FC<LiveBetsProps> = ({ gameState, type, isWinner = false, currentUserId }) => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    const [betsInfo, setBetsInfo] = useState<any>(null);
    const [totalBets, setTotalBets] = useState<number>(0);
    const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (gameState) {
            const tempBetsInfo = type === "Heads" ? gameState.heads : gameState.tails;
            setBetsInfo(tempBetsInfo);

            let sum = 0;
            for (const player in tempBetsInfo?.bets) {
                sum += Number(tempBetsInfo.bets[player] || 0);
            }
            setTotalBets(sum);
        }
    }, [gameState, type]);

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

    const isHeads = type === "Heads";
    const playerIds = betsInfo?.players
        ? Object.keys(betsInfo.players).sort((a, b) => (betsInfo.bets?.[b] || 0) - (betsInfo.bets?.[a] || 0))
        : [];

    return (
        <div
            className={`relative flex flex-col p-4 sm:p-5 rounded-2xl w-full h-min border transition-all duration-300 bg-gradient-to-b from-[#1e1811] via-[#15110c] to-[#0f0c09] overflow-hidden ${
                isWinner
                    ? isHeads
                        ? "border-[#e63946] shadow-[0_0_32px_rgba(192,38,45,0.35),inset_0_1px_0_rgba(255,180,180,0.2)]"
                        : "border-[#ffd966] shadow-[0_0_32px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,233,168,0.25)]"
                    : isHeads
                        ? "border-[#c0262d]/35 shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
                        : "border-[#d4af37]/35 shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
            }`}
        >
            {/* Top accent bar */}
            <div
                className={`absolute top-0 inset-x-0 h-[2px] ${
                    isHeads
                        ? "bg-gradient-to-r from-transparent via-[#c0262d] to-transparent"
                        : "bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"
                }`}
            />

            {/* Header */}
            <div className="flex pb-3.5 items-center justify-between w-full gap-2">
                <div className="flex items-center gap-3">
                    <div
                        className={`relative rounded-full p-[2px] ${
                            isHeads
                                ? "bg-gradient-to-b from-[#e63946] to-[#6b1116]"
                                : "bg-gradient-to-b from-[#fff2c2] to-[#8a6b18]"
                        } shadow-md`}
                    >
                        <img
                            src={isHeads ? "/images/coin_cara.webp" : "/images/coin_cruz.webp"}
                            alt={isHeads ? t("games.heads") : t("games.tails")}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-black uppercase tracking-wider text-[#f5efe0] text-sm sm:text-base">
                                {isHeads ? t("games.heads") : t("games.tails")}
                            </span>
                            {isWinner && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#d4af37] text-[#1a1204] shadow-[0_0_12px_rgba(212,175,55,0.7)]">
                                    <FaCrown className="text-[9px]" />
                                    {es ? "Ganó" : "Won"}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9b8d6f] font-semibold">
                            {isHeads ? (es ? "Legión del León" : "Lion Legion") : es ? "Guardia del Yelmo" : "Helm Guard"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0e0b08] border border-[#d4af37]/25 text-xs font-bold text-[#c9ba9a] font-mono tabular-nums">
                    <FaUsers className="text-[#d4af37] text-[11px]" />
                    <span>{playerIds.length}</span>
                </div>
            </div>

            {/* Total Pot Strip */}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#0b0907] border border-[#d4af37]/15 mb-3">
                <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#9b8d6f]">
                    {t("games.totalBets")}
                </span>
                <span className="font-mono tabular-nums font-black text-base text-[#ffe9a8] drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                    <Monetary value={totalBets} />
                </span>
            </div>

            {/* Players List */}
            <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                {playerIds.length === 0 && (
                    <div className="py-5 text-center text-xs uppercase tracking-[0.16em] text-[#7a6f59] font-semibold">
                        {t("games.noBetsYet")}
                    </div>
                )}
                {playerIds.map((playerId) => {
                    const player = betsInfo.players[playerId];
                    const bet = Number(betsInfo.bets?.[playerId] || 0);
                    const isMe = Boolean(currentUserId && String(currentUserId) === String(playerId));

                    return (
                        <div
                            key={playerId}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-xl relative transition-colors ${
                                isMe
                                    ? "bg-[#2a2010]/70 border border-[#d4af37]/50"
                                    : "bg-[#120e09]/60 border border-white/[0.04] hover:border-[#d4af37]/25"
                            }`}
                        >
                            {playerId === hoveredPlayerId && <PlayerPreview player={player} />}
                            <a
                                href={`/profile/${playerId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#f3ead6] hover:text-[#ffe9a8] transition-colors min-w-0"
                                onMouseEnter={() => handleMouseEnter(playerId)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar
                                        image={player.profilePicture}
                                        id={playerId}
                                        size="small"
                                        level={player.level}
                                    />
                                    <span className="font-bold text-sm truncate">{player.username}</span>
                                    {isMe && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 text-[9px] font-black uppercase tracking-wider text-[#ffe9a8]">
                                            {es ? "Vos" : "You"}
                                        </span>
                                    )}
                                </div>
                            </a>
                            <span className="font-mono tabular-nums font-bold text-sm text-[#e6ca6a] shrink-0 ml-2">
                                <Monetary value={bet} />
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LiveBets;

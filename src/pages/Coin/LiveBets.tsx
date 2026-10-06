import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PlayerPreview from "../../components/PlayerPreview";
import Avatar from "../../components/Avatar";

interface GameHistory {
    gameState: any;
    type: string;
}

const LiveBets: React.FC<GameHistory> = ({ gameState, type }) => {
  const { t } = useTranslation();
    const [betsInfo, setBetsInfo] = useState<any>(null);
    const [totalBets, setTotalBets] = useState<number>(0);
    const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
    const hoverTimeoutRef = useRef<any>(null);

    useEffect(() => {
        if (gameState) {
            const tempBetsInfo = type === "Heads" ? gameState.heads : gameState.tails;
            setBetsInfo(tempBetsInfo);

            let totalBets = 0;
            for (const player in tempBetsInfo.bets) {
                totalBets += tempBetsInfo.bets[player];
            }
            setTotalBets(totalBets);
        }
    }, [gameState]);

    const handleMouseEnter = (playerId: string) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredPlayerId(playerId);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setHoveredPlayerId(null);
    };

    const isHeads = type === "Heads";
    const playerIds = betsInfo && betsInfo.players ? Object.keys(betsInfo.players) : [];

    return (
        <div className={`flex flex-col p-5 rounded-2xl w-full h-min border bg-gradient-to-b from-[#1c1813] to-[#100d0a] ${isHeads ? "border-[#c0262d]/40" : "border-[#d4af37]/40"}`}>
            <div className="flex pb-4 items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <img
                        src={isHeads ? "/images/coin_cara.webp" : "/images/coin_cruz.webp"}
                        alt=""
                        className={`w-10 h-10 rounded-full ring-2 ${isHeads ? "ring-[#c0262d]" : "ring-[#d4af37]"}`}
                    />
                    <span className="font-black uppercase tracking-wider text-white">{isHeads ? t("games.heads") : t("games.tails")}</span>
                </div>
                <span className="text-xs font-bold text-[#b9a77a]">{playerIds.length} 👤</span>
            </div>
            <div className="flex border-t flex-col" style={{ borderTopColor: "rgba(212,175,55,0.15)" }}>
                <div className="flex items-center justify-between py-4">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#b9a77a]">{t("games.totalBets")}</span>
                    <span className="font-black text-[#25D160]">${totalBets}</span>
                </div>
                {playerIds.length === 0 && (
                    <div className="py-4 text-center text-sm text-[#8a7f63]">{t("games.noBetsYet")}</div>
                )}
                {betsInfo && betsInfo.players && Object.keys(betsInfo.players).map(playerId => {
                    const player = betsInfo.players[playerId];
                    const bet = betsInfo.bets[playerId];
                    return (

                        <div className="flex items-center justify-between py-2 relative" key={playerId}
                        >
                            {
                                playerId === hoveredPlayerId && (
                                    <PlayerPreview player={player} />
                                )
                            }
                            <a href={`/profile/${playerId}`} target="_blank" rel="noreferrer" className="text-white transition-all"
                                onMouseEnter={() => handleMouseEnter(playerId)}
                                onMouseLeave={handleMouseLeave}>
                                <div className="flex items-center gap-2">
                                    <Avatar image={player.profilePicture} id={playerId} size="small" level={player.level} />
                                    <span className="font-bold text-sm">{player.username}</span>
                                </div>
                            </a>
                            <span className="font-bold text-sm text-[#25D160]">${bet}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default LiveBets;


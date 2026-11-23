import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaBolt, FaCrown, FaDice, FaFire, FaGem, FaRocket, FaCoins, FaWind, FaFish } from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";
import SocketConnection from "../services/socket";
import { getLiveFeed } from "../services/games/DuelServices";
import Monetary from "./Monetary";

export interface LiveWinItem {
  id: string;
  username: string;
  game: string;
  multiplier: number | null;
  payout: number;
  itemName: string | null;
  itemRarity: string | null;
  createdAt: string;
}

const GAME_META: Record<
  string,
  { es: string; en: string; to: string; icon: React.ReactNode; accent: string }
> = {
  crash: {
    es: "Crash",
    en: "Crash",
    to: "/crash",
    icon: <FaRocket className="text-rose-400" />,
    accent: "border-rose-500/35",
  },
  mines: {
    es: "Minas",
    en: "Mines",
    to: "/mines",
    icon: <FaGem className="text-emerald-400" />,
    accent: "border-emerald-500/35",
  },
  road: {
    es: "Camino",
    en: "Road",
    to: "/road",
    icon: <FaFire className="text-orange-400" />,
    accent: "border-orange-500/35",
  },
  balloon: {
    es: "Globo",
    en: "Balloon",
    to: "/balloon",
    icon: <FaWind className="text-red-400" />,
    accent: "border-red-500/40",
  },
  bigbass: {
    es: "Big Bass",
    en: "Big Bass",
    to: "/bigbass",
    icon: <FaFish className="text-sky-400" />,
    accent: "border-sky-400/40",
  },
  slot: {
    es: "Slots",
    en: "Slots",
    to: "/slot",
    icon: <FaDice className="text-amber-400" />,
    accent: "border-amber-500/35",
  },
  coinflip: {
    es: "Cara o Cruz",
    en: "Coin Flip",
    to: "/coinflip",
    icon: <FaCoins className="text-yellow-300" />,
    accent: "border-yellow-500/35",
  },
  duel: {
    es: "Duelo 1v1",
    en: "1v1 Duel",
    to: "/duel",
    icon: <GiCrossedSwords className="text-[#ffd966]" />,
    accent: "border-[#d4af37]/50",
  },
  case: {
    es: "Caja",
    en: "Case",
    to: "/",
    icon: <FaCrown className="text-purple-400" />,
    accent: "border-purple-500/35",
  },
};

const LiveWinTicker: React.FC = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const [wins, setWins] = useState<LiveWinItem[]>([]);

  useEffect(() => {
    let active = true;
    getLiveFeed()
      .then((res) => {
        if (active && Array.isArray(res?.wins)) {
          setWins(res.wins);
        }
      })
      .catch(() => {});

    const socket = SocketConnection.getInstance();
    const onHistory = (list: LiveWinItem[]) => {
      if (Array.isArray(list) && list.length > 0) {
        setWins(list);
      }
    };
    const onWin = (item: LiveWinItem) => {
      if (!item || !item.id) return;
      setWins((prev) => [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 20));
    };

    socket.on("liveFeed:history", onHistory);
    socket.on("liveFeed:win", onWin);
    return () => {
      active = false;
      socket.off("liveFeed:history", onHistory);
      socket.off("liveFeed:win", onWin);
    };
  }, []);

  if (wins.length === 0) return null;

  return (
    <div className="w-full px-3 sm:px-6 pt-3 pb-1">
      <div className="w-full max-w-[1380px] mx-auto rounded-2xl border border-[#d4af37]/25 bg-gradient-to-r from-[#17120c]/95 via-[#120e09]/95 to-[#17120c]/95 px-3 py-2.5 flex items-center gap-3 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
        {/* Live Pulse Pill */}
        <div className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2b1012] border border-red-500/45 text-[10px] font-black uppercase tracking-[0.18em] text-red-200">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <FaBolt className="text-[#ffd966] text-[10px]" />
          <span>{es ? "En Vivo" : "Live"}</span>
        </div>

        {/* Horizontal Scrollable Win Strip */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          {wins.map((w) => {
            const meta = GAME_META[w.game] || GAME_META.crash;
            return (
              <Link
                key={w.id}
                to={meta.to}
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0e0b08] border ${meta.accent} hover:border-[#ffd966] transition-colors text-xs`}
              >
                <span className="text-sm">{meta.icon}</span>
                <span className="font-bold text-[#f5ead4] max-w-[96px] truncate">
                  {w.username}
                </span>
                <span className="text-[#9b8d6f] text-[11px] hidden sm:inline">
                  {es ? meta.es : meta.en}
                </span>
                {w.itemName ? (
                  <span className="font-black text-[#ffe9a8] max-w-[120px] truncate">
                    {w.itemName}
                  </span>
                ) : (
                  <>
                    {w.multiplier && (
                      <span className="px-1.5 py-0.5 rounded bg-[#251d10] text-[#ffd966] font-mono font-black text-[10px]">
                        {w.multiplier.toFixed(2).replace(/\.00$/, "")}x
                      </span>
                    )}
                    <span className="font-mono font-black text-emerald-400">
                      +<Monetary value={w.payout} />
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LiveWinTicker;

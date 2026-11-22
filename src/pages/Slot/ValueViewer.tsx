import { FaCoins } from "react-icons/fa";
import { BiWallet } from "react-icons/bi";
import { TbPigMoney } from "react-icons/tb";
import Monetary from "../../components/Monetary";
import UserContext from "../../UserContext";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

interface ValueViewerProps {
    type: "balance" | "bet" | "wins";
    betAmount: number;
    totalWins: number;
}

const ValueViewer: React.FC<ValueViewerProps> = ({ type, betAmount, totalWins }) => {
    const { userData } = useContext(UserContext);
    const { t } = useTranslation();

    const getLabel = () => {
        if (type === "balance") return t("games.balance");
        if (type === "bet") return t("games.bet");
        return t("games.wins");
    };

    const rawBalance = Number(userData?.walletBalance ?? 0);
    const displayBalance = Number.isFinite(rawBalance) ? Math.floor(rawBalance) : 0;
    const isWinHighlight = type === "wins" && totalWins > 0;

    return (
        <div
            className={`flex flex-col bg-[#0a0907] border-[2px] ${
                isWinHighlight
                    ? "border-[#d4af37]/80 shadow-[inset_0_2px_12px_rgba(212,175,55,0.2),0_0_16px_rgba(212,175,55,0.25)]"
                    : "border-[#3e3219] shadow-[inset_0_2px_10px_rgba(0,0,0,0.85),0_2px_4px_rgba(0,0,0,0.5)]"
            } px-2 py-2 md:px-3 md:py-2.5 rounded-xl flex-1 min-w-0 items-center justify-center gap-0.5 relative overflow-hidden group transition-all`}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <span className="text-[10px] md:text-[11px] text-[#9b8d6f] font-bold tracking-widest uppercase z-10 flex items-center gap-1.5">
                {type === "balance" ? (
                    <BiWallet className="text-[#d4af37] shrink-0" />
                ) : type === "bet" ? (
                    <FaCoins className="text-[#d4af37] shrink-0" />
                ) : (
                    <TbPigMoney className="text-[#d4af37] shrink-0" />
                )}
                <span className="truncate">{getLabel()}</span>
            </span>
            <span
                className={`font-mono tabular-nums font-bold text-sm md:text-base z-10 truncate max-w-full ${
                    isWinHighlight
                        ? "text-[#ffd966] drop-shadow-[0_0_8px_rgba(255,217,102,0.6)]"
                        : "text-[#f5efe0]"
                }`}
            >
                {type === "balance" ? (
                    <Monetary value={displayBalance} />
                ) : type === "bet" ? (
                    <Monetary value={betAmount} />
                ) : (
                    <Monetary value={totalWins} showFraction={totalWins % 1 !== 0} />
                )}
            </span>
        </div>
    );
};

export default ValueViewer;

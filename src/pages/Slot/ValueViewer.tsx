import { FaCoins } from "react-icons/fa";
import { BiWallet } from "react-icons/bi";
import { TbPigMoney } from "react-icons/tb";
import Monetary from '../../components/Monetary';
import UserContext from '../../UserContext';
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
        if (type === "balance") return t("header.balance") || "BALANCE";
        if (type === "bet") return t("games.bet") || "BET";
        return t("games.wins") || "WINS";
    };

    return (
        <div className="flex flex-col bg-[#0a0a0c] border-[2px] border-[#3e3219] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_2px_4px_rgba(0,0,0,0.5)] p-2 md:p-3 rounded-lg w-full md:w-[140px] items-center justify-center gap-1 relative overflow-hidden group">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <span className="text-[10px] md:text-xs text-[#8a7f63] font-bold tracking-widest uppercase z-10 flex items-center gap-2">
                {type === "balance" ? <BiWallet className="text-[#d4af37]" /> :
                 type === "bet" ? <FaCoins className="text-[#d4af37]" /> :
                 <TbPigMoney className="text-[#d4af37]" />}
                {getLabel()}
            </span>
            <span className={`font-mono font-bold text-sm md:text-base z-10 truncate ${type === 'wins' && totalWins > 0 ? 'text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]' : 'text-white'}`}>
                {type === "balance" ? <Monetary value={userData?.walletBalance} /> :
                 type === "bet" ? <Monetary value={betAmount} /> :
                 <Monetary value={totalWins} />}
            </span>
        </div>
    )
}

export default ValueViewer;
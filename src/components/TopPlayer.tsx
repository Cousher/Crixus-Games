import { FaCrown, FaMedal } from "react-icons/fa";
import { Link } from "react-router-dom";
import { User } from "./Types";
import Avatar from "./Avatar";
import Monetary from "./Monetary";

interface CardProps {
    user: User;
    rank: 1 | 2 | 3;
}

const RANK_STYLE: Record<
    1 | 2 | 3,
    {
        frame: string;
        pedestal: string;
        badge: string;
        height: string;
        order: string;
        glow: string;
        text: string;
    }
> = {
    1: {
        frame: "border-[#ffd966] bg-gradient-to-b from-[#33260e] via-[#1c1509] to-[#110d07]",
        pedestal: "from-[#d4af37] via-[#8a6b18] to-[#3d2d09]",
        badge: "bg-gradient-to-b from-[#fff2c2] to-[#b8860b] text-[#1a1204]",
        height: "min-h-[210px] sm:min-h-[250px] -mt-3 sm:-mt-6",
        order: "order-2",
        glow: "shadow-[0_0_40px_rgba(212,175,55,0.32),inset_0_1px_0_rgba(255,233,168,0.3)]",
        text: "text-[#ffe9a8]",
    },
    2: {
        frame: "border-slate-300/60 bg-gradient-to-b from-[#23252a] via-[#151518] to-[#0e0d0f]",
        pedestal: "from-slate-300 via-slate-500 to-slate-800",
        badge: "bg-gradient-to-b from-slate-100 to-slate-400 text-slate-950",
        height: "min-h-[185px] sm:min-h-[220px]",
        order: "order-1",
        glow: "shadow-[0_14px_30px_rgba(0,0,0,0.7)]",
        text: "text-slate-200",
    },
    3: {
        frame: "border-amber-700/70 bg-gradient-to-b from-[#2b1a10] via-[#17100b] to-[#0e0a07]",
        pedestal: "from-amber-600 via-amber-800 to-amber-950",
        badge: "bg-gradient-to-b from-amber-400 to-amber-700 text-amber-950",
        height: "min-h-[175px] sm:min-h-[205px]",
        order: "order-3",
        glow: "shadow-[0_14px_30px_rgba(0,0,0,0.7)]",
        text: "text-amber-300",
    },
};

const TopPlayer: React.FC<CardProps> = ({ user, rank }) => {
    const s = RANK_STYLE[rank];
    const profileId = (user as any)._id || user.id;

    return (
        <Link
            to={`/profile/${profileId}`}
            className={`${s.order} ${s.height} ${s.frame} ${s.glow} group relative flex flex-col items-center justify-between rounded-2xl border-2 p-3 sm:p-5 w-full transition-all duration-300 hover:-translate-y-1.5 overflow-hidden`}
        >
            {/* Top metallic crown/medal */}
            <div className="flex flex-col items-center gap-1.5 z-10 w-full">
                <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow ${s.badge}`}>
                    {rank === 1 ? <FaCrown className="text-[11px]" /> : <FaMedal className="text-[11px]" />}
                    <span>#{rank}</span>
                </div>

                <div className="mt-1.5 group-hover:scale-105 transition-transform">
                    <Avatar
                        image={user.profilePicture}
                        id={profileId}
                        size={rank === 1 ? "medium" : "small"}
                        level={user.level}
                        showLevel={true}
                    />
                </div>

                <span className="font-extrabold text-xs sm:text-base text-white group-hover:text-[#ffe9a8] transition-colors truncate max-w-full mt-1">
                    {user.username}
                </span>
            </div>

            {/* Weekly winnings badge */}
            <div className="mt-3 w-full flex flex-col items-center z-10">
                <span className={`font-mono tabular-nums font-black text-xs sm:text-base ${s.text}`}>
                    <Monetary value={user.weeklyWinnings} />
                </span>
            </div>

            {/* Bottom metallic pedestal strip */}
            <div className={`absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r ${s.pedestal}`} />
        </Link>
    );
};

export default TopPlayer;

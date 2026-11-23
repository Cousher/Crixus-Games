import React, { useEffect, useState } from "react";
import { FaRegBell, FaRegBellSlash } from "react-icons/fa";
import { IoMdExit } from "react-icons/io";
import { BiWallet } from "react-icons/bi";
import Avatar from "../../Avatar";
import ClaimBonus from "../ClaimBonus";
import AnimatedBalance from "../../AnimatedBalance";
import XpBar from "../../XpBar";
import { User } from "../../../components/Types";

interface RightContentProps {
    loading: boolean;
    userData: User;
    openNotifications: boolean;
    setOpenNotifications: React.Dispatch<React.SetStateAction<boolean>>;
    Logout: () => void;
}

const RightContent: React.FC<RightContentProps> = ({
    loading,
    userData,
    openNotifications,
    setOpenNotifications,
    Logout,
}) => {
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

    useEffect(() => {
        if (userData?.hasUnreadNotifications) {
            setHasUnreadNotifications(true);
        }
    }, [userData?.hasUnreadNotifications]);

    useEffect(() => {
        if (openNotifications) {
            setHasUnreadNotifications(false);
        }
    }, [openNotifications]);

    return (
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Compact Bonus Pill (desktop) */}
            {!loading && (
                <div className="hidden md:flex shrink-0">
                    <ClaimBonus bonusDate={userData?.nextBonus} userData={userData} compact />
                </div>
            )}

            {/* Imperial Wallet Pill */}
            {!loading && (
                <div className="shrink-0 flex items-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-full bg-gradient-to-b from-[#13241a] to-[#0a140e] border border-emerald-500/40 shadow-[inset_0_1px_4px_rgba(0,0,0,0.6),0_0_12px_rgba(16,185,129,0.12)] text-emerald-300 font-black">
                    <BiWallet className="text-base sm:text-lg text-emerald-400 shrink-0" />
                    <div className="text-xs sm:text-sm md:text-base font-mono tabular-nums whitespace-nowrap">
                        <AnimatedBalance value={Math.floor(userData?.walletBalance ?? 0)} />
                    </div>
                </div>
            )}

            {/* Compact XP Bar */}
            {!loading && userData && (
                <div className="hidden xl:block shrink-0 px-1">
                    <XpBar xp={userData.xp} level={userData.level} compact />
                </div>
            )}

            {/* Notifications Bell */}
            <button
                type="button"
                onClick={() => setOpenNotifications(!openNotifications)}
                aria-label="Notificaciones"
                className={`relative shrink-0 w-9 h-9 p-0 rounded-full border flex items-center justify-center transition-all ${
                    openNotifications
                        ? "bg-[#2e220a] border-[#ffd966] text-[#ffe9a8]"
                        : "bg-[#17120c] border-[#d4af37]/40 text-[#ffe9a8] hover:border-[#ffd966] hover:bg-[#231a0f]"
                }`}
            >
                {openNotifications ? (
                    <FaRegBellSlash className="w-4 h-4 shrink-0" />
                ) : (
                    <FaRegBell className="w-4 h-4 shrink-0" />
                )}
                {hasUnreadNotifications && !openNotifications && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#14100b] animate-pulse" />
                )}
            </button>

            {/* Profile Avatar */}
            <div className="shrink-0">
                <Avatar
                    image={userData?.profilePicture}
                    loading={loading}
                    id={userData?.id}
                    size="small"
                    level={userData?.level}
                    showLevel={true}
                />
            </div>

            {/* Logout Button */}
            <button
                type="button"
                onClick={Logout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="hidden sm:flex shrink-0 w-9 h-9 p-0 rounded-full bg-[#17120c] border border-[#d4af37]/30 text-[#d8ccb2] hover:border-red-500/60 hover:text-red-400 hover:bg-red-950/30 items-center justify-center transition-all"
            >
                <IoMdExit className="w-[18px] h-[18px] shrink-0" />
            </button>
        </div>
    );
};

export default RightContent;

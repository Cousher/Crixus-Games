import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FaGift } from "react-icons/fa";
import MainButton from "../MainButton";
import { claimBonus } from "../../services/users/UserServices";
import Countdown from "../Countdown";
import UserContext from "../../UserContext";
import { User } from "../../components/Types";
import sound from "../../services/sound";
import { coinRainEmitter } from "../CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";

interface IBonus {
    bonusDate: string;
    userData: User;
    compact?: boolean;
}

const ClaimBonus: React.FC<IBonus> = ({ bonusDate, userData, compact = false }) => {
    const { t } = useTranslation();
    const [bonusAvailable, setBonusAvailable] = useState(false);
    const [loadingBonus, setLoadingBonus] = useState(false);
    const { toogleUserFlow, toogleUserData } = useContext(UserContext);

    useEffect(() => {
        if (!bonusDate) {
            setBonusAvailable(true);
            return;
        }
        const check = () => {
            const distance = new Date(bonusDate).getTime() - Date.now();
            setBonusAvailable(distance <= 0);
            return distance <= 0;
        };
        if (check()) return;
        const interval = setInterval(() => {
            if (check()) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [bonusDate]);

    const claimUserBonus = async () => {
        setLoadingBonus(true);
        try {
            const res = await claimBonus();
            sound.play("bonus");
            coinRainEmitter.trigger(40);
            toogleUserFlow(false);
            setBonusAvailable(false);
            toast.success(`+ $${res.value}`, { theme: "dark" });
            toogleUserData({
                ...userData,
                nextBonus: res.nextBonus,
                walletBalance: userData.walletBalance + res.value,
            });
        } catch (error: any) {
            toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
        } finally {
            setLoadingBonus(false);
        }
    };

    if (compact) {
        return (
            <button
                type="button"
                onClick={claimUserBonus}
                disabled={!bonusAvailable || loadingBonus}
                title={bonusAvailable ? t("nav.claimBonus") : t("rewards.daily")}
                className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    bonusAvailable
                        ? "bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] border-[#fff2c2]/80 shadow-[0_0_18px_rgba(212,175,55,0.5)] hover:brightness-110 cta-pulse cursor-pointer"
                        : "bg-[#17120c] text-[#9b8d6f] border-[#3a2f1d] cursor-not-allowed opacity-85"
                }`}
            >
                <FaGift className={bonusAvailable ? "text-[#1a1204] text-xs" : "text-[#d4af37]/70 text-xs"} />
                {bonusAvailable ? (
                    <span>{t("nav.claimBonus")}</span>
                ) : (
                    <Countdown nextBonus={bonusDate} compact />
                )}
            </button>
        );
    }

    return (
        <MainButton
            text={
                bonusAvailable ? (
                    t("nav.claimBonus")
                ) : (
                    <Countdown nextBonus={bonusDate} color="#fff" bold={false} />
                )
            }
            onClick={claimUserBonus}
            pulse={true}
            disabled={!bonusAvailable || loadingBonus}
        />
    );
};

export default ClaimBonus;

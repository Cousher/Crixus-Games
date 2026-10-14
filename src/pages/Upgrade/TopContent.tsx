import MainButton from "../../components/MainButton";
import { useTranslation } from "react-i18next";
import { AiOutlineClose } from "react-icons/ai";
import { GiUpgrade } from "react-icons/gi";
import ClockPointer from "./ClockPointer";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { upgradeItem } from "../../services/games/GamesServices";
import Rarities from "../../components/Rarities";
import React from "react";

interface Props {
    selectedItems: any[];
    setSelectedItems: React.Dispatch<React.SetStateAction<any[]>>;
    setSelectedCase: React.Dispatch<React.SetStateAction<string | null>>;
    selectedTarget: any;
    setSelectedTarget: React.Dispatch<React.SetStateAction<any>>;
    successRate: number;
    finished: boolean;
    setFinished: React.Dispatch<React.SetStateAction<boolean>>;
    toggleReload: boolean;
    setToggleReload: React.Dispatch<React.SetStateAction<boolean>>;
    spinning: boolean;
    setSpinning: React.Dispatch<React.SetStateAction<boolean>>;
}

const OfferEmblemSVG = () => (
    <svg viewBox="0 0 160 160" className="w-36 h-36 md:w-44 md:h-44 drop-shadow-[0_10px_25px_rgba(236,168,35,0.25)]">
        <defs>
            <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5C451" />
                <stop offset="50%" stopColor="#B87B14" />
                <stop offset="100%" stopColor="#593602" />
            </linearGradient>
            <radialGradient id="pedestalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(236, 168, 35, 0.25)" />
                <stop offset="100%" stopColor="rgba(236, 168, 35, 0)" />
            </radialGradient>
        </defs>
        <circle cx="80" cy="80" r="70" fill="url(#pedestalGlow)" />
        <circle cx="80" cy="80" r="60" fill="none" stroke="url(#bronzeGrad)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
        {/* Crossed Gladius Swords */}
        <g opacity="0.85" stroke="url(#bronzeGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M 38 122 L 118 42 M 108 38 L 122 38 L 122 52" />
            <path d="M 122 122 L 42 42 M 52 38 L 38 38 L 38 52" />
        </g>
        {/* Roman Scutum / Forge Anvil Pedestal */}
        <path
            d="M 55 48 C 70 42, 90 42, 105 48 L 105 92 C 105 110, 80 124, 80 124 C 80 124, 55 110, 55 92 Z"
            fill="#16110b"
            stroke="url(#bronzeGrad)"
            strokeWidth="2.5"
        />
        {/* Inner Shield Boss & Wings */}
        <circle cx="80" cy="84" r="10" fill="url(#bronzeGrad)" opacity="0.9" />
        <path d="M 65 68 L 80 76 L 95 68 M 65 100 L 80 92 L 95 100" stroke="url(#bronzeGrad)" strokeWidth="1.8" fill="none" opacity="0.7" />
    </svg>
);

const TargetEmblemSVG = () => (
    <svg viewBox="0 0 160 160" className="w-36 h-36 md:w-44 md:h-44 drop-shadow-[0_10px_25px_rgba(236,168,35,0.35)]">
        <defs>
            <linearGradient id="imperialGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF6D6" />
                <stop offset="45%" stopColor="#ECA823" />
                <stop offset="100%" stopColor="#8A5A10" />
            </linearGradient>
            <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(236, 168, 35, 0.32)" />
                <stop offset="100%" stopColor="rgba(236, 168, 35, 0)" />
            </radialGradient>
        </defs>
        <circle cx="80" cy="80" r="72" fill="url(#targetGlow)" />
        {/* Ascending Upgrade Chevrons */}
        <path d="M 52 78 L 80 52 L 108 78" fill="none" stroke="url(#imperialGold)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
        <path d="M 46 62 L 80 32 L 114 62" fill="none" stroke="url(#imperialGold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        {/* Ascended Imperial Gladius */}
        <polygon points="80,22 87,46 84,104 76,104 73,46" fill="url(#imperialGold)" />
        <rect x="64" y="104" width="32" height="6" rx="3" fill="url(#imperialGold)" />
        <rect x="76" y="110" width="8" height="16" rx="2" fill="#8A5A10" stroke="url(#imperialGold)" strokeWidth="1" />
        <circle cx="80" cy="130" r="6" fill="url(#imperialGold)" />
        {/* Laurel Wreath Arcs */}
        <path d="M 70 134 C 42 126, 30 96, 38 66" fill="none" stroke="url(#imperialGold)" strokeWidth="2.2" strokeDasharray="5 3" opacity="0.75" />
        <path d="M 90 134 C 118 126, 130 96, 122 66" fill="none" stroke="url(#imperialGold)" strokeWidth="2.2" strokeDasharray="5 3" opacity="0.75" />
    </svg>
);

const TopContent: React.FC<Props> = ({
    selectedItems,
    setSelectedItems,
    selectedTarget,
    setSelectedTarget,
    successRate,
    finished,
    setFinished,
    setToggleReload,
    toggleReload,
    setSelectedCase,
    spinning,
    setSpinning,
}) => {
    const { t } = useTranslation();
    const [loadingUpgrade, setLoadingUpgrade] = useState<boolean>(false);
    const [stopAngle, setStopAngle] = useState(0);
    const [success, setSuccess] = useState(false);

    // Reset needle to 12 o'clock when changing items before spinning
    useEffect(() => {
        if (!spinning && !finished) {
            setStopAngle(0);
        }
    }, [selectedItems, selectedTarget, spinning, finished]);

    const UpgradeItems = async () => {
        setLoadingUpgrade(true);
        setFinished(false);
        setSuccess(false);

        const payload = {
            selectedItemIds: selectedItems.map((item) => item.identifier),
            targetItemId: selectedTarget._id,
        };
        try {
            const response = await upgradeItem(payload.selectedItemIds, payload.targetItemId);
            setSpinning(true);
            if (response.success) {
                // Stop anywhere in the success chance sector (0 to successRate * 360)
                setStopAngle(Math.random() * (successRate * 360));
            } else {
                setStopAngle(successRate * 360 + Math.random() * ((1 - successRate) * 360));
            }
            setLoadingUpgrade(false);

            setTimeout(() => {
                setSpinning(false);
                setSelectedItems([]);
                setToggleReload(!toggleReload);
                setSuccess(response.success);
                setFinished(true);

                if (response.success) {
                    setSelectedCase(null);
                    setSelectedTarget(null);
                }
            }, 8000);
        } catch (err: any) {
            const errorMessage =
                err.response && err.response.data ? err.response.data.message : "An error occurred";
            toast.error(errorMessage, {
                theme: "dark",
            });
            setLoadingUpgrade(false);
            setSpinning(false);
            console.log(err);
        }
    };

    const renderPlaceholder = (isTarget: boolean) => {
        return (
            <div className="flex flex-col items-center justify-between w-[320px] md:w-[350px] h-[390px] p-6 rounded-2xl bg-gradient-to-b from-[#1f1911] via-[#14100b] to-[#0a0806] border-2 border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.08)] relative overflow-hidden group transition-all duration-300 hover:border-[#ECA823]/50">
                {/* Subtle corner accents */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ECA823]/40 to-transparent" />
                <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#ECA823]/80 bg-[#ECA823]/10 border border-[#ECA823]/25 px-4 py-1 rounded-full">
                    {isTarget ? t("upg.desiredRelic") : t("upg.yourOffer")}
                </span>

                <div className="my-auto flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                    {isTarget ? <TargetEmblemSVG /> : <OfferEmblemSVG />}
                </div>

                <span className="text-[#c7b99e] text-sm md:text-base font-semibold text-center px-4 leading-snug">
                    {isTarget ? t("upg.selectObtain") : t("upg.selectUpgrade")}
                </span>
            </div>
        );
    };

    const renderSelectedItems = (items: any[], isTarget: boolean) => {
        const single = items.length === 1;
        const primaryItem = single ? items[0].item || items[0] : null;
        const primaryColor = primaryItem
            ? Rarities.find((r) => String(r.id) === String(primaryItem.rarity))?.color || "#ECA823"
            : "#ECA823";

        return (
            <div
                className="flex flex-col items-center justify-between w-[320px] md:w-[350px] h-[390px] p-5 rounded-2xl bg-gradient-to-b from-[#1f1911] via-[#14100b] to-[#0a0806] border-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative overflow-hidden transition-all"
                style={{
                    borderColor: `${primaryColor}66`,
                    boxShadow: `0 20px 50px rgba(0,0,0,0.85), inset 0 0 40px ${primaryColor}15`,
                }}
            >
                {/* Header row inside card */}
                <div className="w-full flex items-center justify-between z-10">
                    <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ECA823] bg-black/40 border border-[#ECA823]/30 px-3 py-1 rounded-full">
                        {isTarget
                            ? t("upg.desiredRelic")
                            : `${t("upg.yourOffer")}${items.length > 1 ? ` (${items.length})` : ""}`}
                    </span>
                    {!spinning && (
                        <button
                            type="button"
                            onClick={() => (isTarget ? setSelectedTarget(null) : setSelectedItems([]))}
                            className="p-2 rounded-full bg-black/50 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-700/60 hover:border-red-500/40 transition-all"
                        >
                            <AiOutlineClose />
                        </button>
                    )}
                </div>

                {/* Items Grid */}
                <div className="flex flex-wrap items-center justify-center gap-3 w-full my-auto max-h-[230px] overflow-y-auto py-2 z-10">
                    {items.map((entry, index) => {
                        const it = entry.item || entry;
                        const rarityColor =
                            Rarities.find((r) => String(r.id) === String(it?.rarity))?.color || "#ECA823";
                        const imgSize =
                            items.length === 1
                                ? "w-40 h-40"
                                : items.length <= 4
                                ? "w-24 h-24"
                                : "w-16 h-16";

                        return (
                            <div
                                key={entry.identifier || it?._id || index}
                                className="flex flex-col items-center justify-center relative group"
                            >
                                <img
                                    decoding="async"
                                    src={it?.image}
                                    alt={it?.name || "selected-item"}
                                    className={`${imgSize} object-contain rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-105`}
                                    style={{
                                        boxShadow: `0 8px 25px ${rarityColor}40`,
                                        borderColor: `${rarityColor}80`,
                                    }}
                                />
                                {single && (
                                    <div className="flex items-center gap-2 mt-3">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: rarityColor }}
                                        />
                                        <span className="text-sm md:text-base font-bold text-white truncate max-w-[240px]">
                                            {it?.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Action Button Footer */}
                <div className="w-full z-10 mt-2">
                    {isTarget ? (
                        <MainButton
                            text={t("games.upgrade")}
                            icon={<GiUpgrade />}
                            type="danger"
                            iconPosition="right"
                            onClick={UpgradeItems}
                            disabled={loadingUpgrade || spinning || selectedItems.length < 1}
                            loading={loadingUpgrade}
                        />
                    ) : (
                        <MainButton
                            text={`${t("games.clear")}${
                                selectedItems.length > 1 ? ` (${selectedItems.length})` : ""
                            }`}
                            icon={<AiOutlineClose />}
                            onClick={() => setSelectedItems([])}
                            disabled={spinning}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 px-5 py-4">
            {selectedItems.length > 0
                ? renderSelectedItems(selectedItems, false)
                : renderPlaceholder(false)}

            <div className="flex flex-col justify-center items-center relative my-2">
                <div className="z-20">
                    <ClockPointer
                        successRate={successRate}
                        spinning={spinning}
                        success={success}
                        stopAngle={stopAngle}
                        finished={finished}
                    />
                </div>
            </div>

            {selectedTarget
                ? renderSelectedItems([selectedTarget], true)
                : renderPlaceholder(true)}
        </div>
    );
};

export default TopContent;



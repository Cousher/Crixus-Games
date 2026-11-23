import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import UserContext from "../../UserContext";
import UserItems from "./UserItems";
import ChooseUpgradeItems from "./ChooseUpgradeItems";

interface Inventory {
    selectedItems: any[];
    setSelectedItems: React.Dispatch<React.SetStateAction<any>>;
    selectedTarget: any;
    setSelectedTarget: React.Dispatch<React.SetStateAction<any>>;
    selectedCase: string | null;
    setSelectedCase: React.Dispatch<React.SetStateAction<string | null>>;
    setSuccessRate: React.Dispatch<React.SetStateAction<number>>;
    toggleReload: boolean;
    setFinished: React.Dispatch<React.SetStateAction<boolean>>;
    spinning: boolean;
}

// Mirrors backend/games/upgrade.js (derived from case drop rates with 10% forge sink)
const RARITY_DROP_WEIGHTS: Record<string, number> = {
    "1": 0.7992,
    "2": 0.1598,
    "3": 0.032,
    "4": 0.0064,
    "5": 0.0026,
};
const FORGE_RETENTION = 0.9;

const baseChances: Record<string, Record<string, number>> = {
    "1": {
        "1": 0.5,
        "2": Number(((RARITY_DROP_WEIGHTS["2"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
        "3": Number(((RARITY_DROP_WEIGHTS["3"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
        "4": Number(((RARITY_DROP_WEIGHTS["4"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
        "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["1"]) * FORGE_RETENTION).toFixed(4)),
    },
    "2": {
        "2": 0.5,
        "3": Number(((RARITY_DROP_WEIGHTS["3"] / RARITY_DROP_WEIGHTS["2"]) * FORGE_RETENTION).toFixed(4)),
        "4": Number(((RARITY_DROP_WEIGHTS["4"] / RARITY_DROP_WEIGHTS["2"]) * FORGE_RETENTION).toFixed(4)),
        "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["2"]) * FORGE_RETENTION).toFixed(4)),
    },
    "3": {
        "3": 0.5,
        "4": Number(((RARITY_DROP_WEIGHTS["4"] / RARITY_DROP_WEIGHTS["3"]) * FORGE_RETENTION).toFixed(4)),
        "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["3"]) * FORGE_RETENTION).toFixed(4)),
    },
    "4": {
        "4": 0.5,
        "5": Number(((RARITY_DROP_WEIGHTS["5"] / RARITY_DROP_WEIGHTS["4"]) * FORGE_RETENTION).toFixed(4)),
    },
    "5": {
        "5": 0.5,
    },
};

const rarityCaps: Record<string, number> = { "1": 0.8, "2": 0.7, "3": 0.6, "4": 0.5, "5": 0.45 };
const diminishingRate = 0.9;

const calculateSuccessRate = (selectedItems: any[], targetRarity: string) => {
    const contributions = selectedItems
        .map((item: any) => {
            return (baseChances[String(item.item.rarity)] || {})[String(targetRarity)] || 0;
        })
        .sort((a: number, b: number) => b - a);

    let failChance = 1;
    contributions.forEach((chance: number, index: number) => {
        failChance *= 1 - chance * Math.pow(diminishingRate, index);
    });

    const successRate = 1 - failChance;
    const cap = rarityCaps[String(targetRarity)] !== undefined ? rarityCaps[String(targetRarity)] : 0.8;
    return Math.min(successRate, cap);
};

const Items: React.FC<Inventory> = ({
    selectedItems,
    setSelectedItems,
    selectedTarget,
    setSelectedTarget,
    selectedCase,
    setSelectedCase,
    setSuccessRate,
    toggleReload,
    setFinished,
    spinning,
}) => {
    const { t } = useTranslation();
    const { userData, toogleUserFlow } = useContext(UserContext);
    const [mobileTab, setMobileTab] = useState<"inventory" | "target">("inventory");

    useEffect(() => {
        if (selectedTarget && selectedItems.length > 0) {
            setFinished(false);
            const rate = calculateSuccessRate(selectedItems, String(selectedTarget.rarity));
            setSuccessRate(rate);
        } else {
            setSuccessRate(0);
        }
    }, [selectedItems, selectedTarget, setFinished, setSuccessRate]);

    const highestOfferRarity = selectedItems.reduce(
        (max: number, entry: any) => Math.max(max, Number(entry?.item?.rarity || 0)),
        0
    );

    if (!userData) {
        return (
            <div className="w-full flex flex-col items-center justify-center gap-3 py-10 px-4 rounded-2xl bg-[#16120c] border border-[#d4af37]/30 text-center">
                <span className="text-[#d8ccb2] font-semibold">{t("games.signInToPlay")}</span>
                <button
                    type="button"
                    onClick={() => toogleUserFlow(true)}
                    className="px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f]"
                >
                    {t("nav.signIn")}
                </button>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-4 w-full ${spinning ? "pointer-events-none opacity-80" : ""}`}>
            {/* Mobile Tab Switcher (eliminates endless vertical scrolling on phones) */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#120e09] border border-[#d4af37]/30 lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileTab("inventory")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        mobileTab === "inventory"
                            ? "bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] text-[#1a1204] shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                            : "text-[#c8bba0] hover:text-white"
                    }`}
                >
                    {t("games.inventory")}
                    {selectedItems.length > 0 ? ` (${selectedItems.length})` : ""}
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab("target")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        mobileTab === "target"
                            ? "bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] text-[#1a1204] shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                            : "text-[#c8bba0] hover:text-white"
                    }`}
                >
                    {t("upg.desiredRelic")}
                    {selectedTarget ? " ✓" : ""}
                </button>
            </div>

            {/* Side-by-side on desktop, tabbed on mobile */}
            <div className="flex flex-col lg:flex-row items-stretch justify-center gap-5 w-full">
                <div className={`${mobileTab === "inventory" ? "flex" : "hidden"} lg:flex lg:w-1/2 w-full`}>
                    <UserItems
                        selectedItems={selectedItems}
                        setSelectedItems={setSelectedItems}
                        selectedCase={selectedCase}
                        setSelectedCase={setSelectedCase}
                        toggleReload={toggleReload}
                        setSelectedTarget={setSelectedTarget}
                    />
                </div>
                <div className={`${mobileTab === "target" ? "flex" : "hidden"} lg:flex lg:w-1/2 w-full`}>
                    <ChooseUpgradeItems
                        setSelectedItems={setSelectedItems}
                        selectedCase={selectedCase}
                        setSelectedCase={setSelectedCase}
                        selectedTarget={selectedTarget}
                        setSelectedTarget={setSelectedTarget}
                        highestOfferRarity={highestOfferRarity}
                    />
                </div>
            </div>
        </div>
    );
};

export default Items;

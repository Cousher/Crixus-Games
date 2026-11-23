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

const baseChances: Record<string, Record<string, number>> = {
    "1": { "1": 0.5, "2": 0.2, "3": 0.1, "4": 0.05, "5": 0.002 },
    "2": { "1": 0.2, "2": 0.5, "3": 0.2, "4": 0.1, "5": 0.01 },
    "3": { "1": 0.1, "2": 0.2, "3": 0.5, "4": 0.2, "5": 0.05 },
    "4": { "1": 0.05, "2": 0.1, "3": 0.2, "4": 0.5, "5": 0.1 },
    "5": { "1": 0.002, "2": 0.01, "3": 0.05, "4": 0.1, "5": 0.5 },
};

const rarityFactors: Record<string, number> = { "4": 0.7, "5": 0.5 };
const rarityCaps: Record<string, number> = { "1": 0.8, "2": 0.7, "3": 0.6, "4": 0.45, "5": 0.2 };
const diminishingRate = 0.9;

const calculateSuccessRate = (selectedItems: any[], targetRarity: string) => {
    const rarityFactor = rarityFactors[targetRarity] || 1;

    const contributions = selectedItems
        .map((item: any) => {
            const baseChance = (baseChances[String(item.item.rarity)] || {})[String(targetRarity)] || 0;
            return baseChance * rarityFactor;
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

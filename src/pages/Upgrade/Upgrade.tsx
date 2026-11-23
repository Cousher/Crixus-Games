import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCrown, FaInfoCircle } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import Items from "./Items";
import TopContent from "./TopContent";

interface selectedItems {
    identifier: string;
    item: {
        name: string;
        image: string;
        rarity: string;
    };
}

const Upgrade: React.FC = () => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    const [selectedItems, setSelectedItems] = useState<selectedItems[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<any>(null);
    const [selectedCase, setSelectedCase] = useState<string | null>(null);
    const [successRate, setSuccessRate] = useState<number>(0);
    const [toggleReload, setToggleReload] = useState<boolean>(false);
    const [finished, setFinished] = useState(false);
    const [spinning, setSpinning] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const step =
        selectedItems.length === 0 ? 1 : !selectedTarget ? 2 : 3;

    return (
        <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2 z-10">
            <div className="w-full max-w-[1260px] flex flex-col gap-6">
                {/* Main Colosseum Forge Container */}
                <div className="w-full flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
                    {/* Imperial Marquee Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_12px_rgba(212,175,55,0.45)]">
                                <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                                    <FaCrown className="text-[#ffd966] text-xs" />
                                </div>
                            </div>
                            <div className="flex flex-col leading-tight">
                                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] gold-text">
                                    {es ? "Forja del Coliseo" : "Colosseum Forge"}
                                </h1>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9b8d6f] font-semibold">
                                    {es ? "Sacrificá reliquias por una superior" : "Forge relics into a rarer tier"}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Live 3-Step Indicator (desktop) */}
                            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0e0b08] border border-[#d4af37]/25 text-[10px] font-bold uppercase tracking-wider">
                                <span className={step >= 1 ? "text-[#ffe9a8]" : "text-[#6f6552]"}>
                                    1. {es ? "Ofrenda" : "Offer"}
                                </span>
                                <span className="text-[#5c4f3a]">→</span>
                                <span className={step >= 2 ? "text-[#ffe9a8]" : "text-[#6f6552]"}>
                                    2. {es ? "Objetivo" : "Target"}
                                </span>
                                <span className="text-[#5c4f3a]">→</span>
                                <span className={step >= 3 ? "text-emerald-300" : "text-[#6f6552]"}>
                                    3. {es ? "Forjar" : "Forge"}
                                </span>
                            </div>

                            {/* Touch-friendly How It Works button */}
                            <button
                                type="button"
                                onClick={() => setShowHelp((v) => !v)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all ${
                                    showHelp
                                        ? "bg-[#2e220a] border-[#ffd966] text-[#ffe9a8]"
                                        : "bg-[#120e08] border-[#d4af37]/40 text-[#e6c770] hover:border-[#ffd966]"
                                }`}
                            >
                                <FaInfoCircle className="text-xs text-[#d4af37]" />
                                <span>{t("games.howItWorks")}</span>
                            </button>
                        </div>
                    </div>

                    {/* Expandable How It Works Panel (mobile & desktop friendly) */}
                    <AnimatePresence>
                        {showHelp && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-b border-[#d4af37]/20 bg-[#100c08]"
                            >
                                <p className="px-5 py-3 text-xs sm:text-sm text-[#d8ccb2] leading-relaxed">
                                    {t("upg.howItWorksTooltip")}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Top Forge Arena (Pedestals + Wheel + Forge CTA) */}
                    <TopContent
                        selectedItems={selectedItems}
                        setSelectedItems={setSelectedItems}
                        selectedTarget={selectedTarget}
                        setSelectedTarget={setSelectedTarget}
                        successRate={successRate}
                        finished={finished}
                        setFinished={setFinished}
                        toggleReload={toggleReload}
                        setToggleReload={setToggleReload}
                        setSelectedCase={setSelectedCase}
                        spinning={spinning}
                        setSpinning={setSpinning}
                    />
                </div>

                {/* Pickers Section (Inventory & Target Relics) */}
                <Items
                    selectedItems={selectedItems}
                    setSelectedItems={setSelectedItems}
                    selectedTarget={selectedTarget}
                    setSelectedTarget={setSelectedTarget}
                    selectedCase={selectedCase}
                    setSelectedCase={setSelectedCase}
                    setSuccessRate={setSuccessRate}
                    toggleReload={toggleReload}
                    setFinished={setFinished}
                    spinning={spinning}
                />
            </div>
        </div>
    );
};

export default Upgrade;

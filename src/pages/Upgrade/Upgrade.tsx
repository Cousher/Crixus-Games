
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Title from "../../components/Title";
import { Tooltip } from "react-tooltip";
import Items from "./Items";
import TopContent from "./TopContent";

interface selectedItems {
    identifier: string;
    item: {
        name: string;
        image: string;
        rarity: string;
    }
}

const Upgrade: React.FC = () => {
  const { t } = useTranslation();
    const [selectedItems, setSelectedItems] = useState<selectedItems[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<selectedItems | null>(null);
    const [selectedCase, setSelectedCase] = useState<string | null>(null);
    const [successRate, setSuccessRate] = useState<number>(0);
    const [toggleReload, setToggleReload] = useState<boolean>(false);
    const [finished, setFinished] = useState(false);
    const [spinning, setSpinning] = useState(false);

    return (
        <div className="w-screen flex justify-center z-10">
            <div className=" flex-col w-full max-w-[1920px]">
                <div className="w-full flex justify-center mt-2 mb-2">
                    <Tooltip
                        id="my-tooltip"
                        style={{
                            width: "320px",
                            zIndex: 40,
                            backgroundColor: "#14100b",
                            border: "1px solid rgba(212, 175, 55, 0.4)",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            color: "#e7ddc8",
                        }}
                    />
                    <span
                        className="text-[#e6c770] hover:text-white bg-[#1a140c]/90 border border-[#d4af37]/40 hover:border-[#ECA823] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest cursor-help z-30 transition-all shadow-[0_0_15px_rgba(236,168,35,0.12)]"
                        data-tooltip-id="my-tooltip"
                        data-tooltip-content={t("upg.howItWorksTooltip")}
                    >
                        {t("games.howItWorks")}
                    </span>
                </div>

                <TopContent selectedItems={selectedItems} setSelectedItems={setSelectedItems} selectedTarget={selectedTarget}
                    setSelectedTarget={setSelectedTarget} successRate={successRate} finished={finished} setFinished={setFinished}
                    toggleReload={toggleReload} setToggleReload={setToggleReload} setSelectedCase={setSelectedCase}
                    spinning={spinning} setSpinning={setSpinning} />
                <div className="flex justify-center">
                    <Title title={t("upg.upgradeItems")} />
                </div>

                <Items selectedItems={selectedItems} setSelectedItems={setSelectedItems}
                    selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
                    selectedCase={selectedCase} setSelectedCase={setSelectedCase}
                    setSuccessRate={setSuccessRate} toggleReload={toggleReload} setFinished={setFinished} spinning={spinning} />
            </div>
        </div>
    );
};

export default Upgrade;



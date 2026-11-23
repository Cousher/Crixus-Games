import React, { useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineArrowDown, AiOutlineClose } from "react-icons/ai";
import { FaLock } from "react-icons/fa";
import UserContext from "../../UserContext";
import { getCases, getCase } from "../../services/cases/CaseServices";
import Item from "../../components/Item";
import Skeleton from "react-loading-skeleton";
import sound from "../../services/sound";

interface ChooseUpgradeItemsProps {
    setSelectedItems: React.Dispatch<React.SetStateAction<any>>;
    selectedCase: any;
    setSelectedCase: React.Dispatch<React.SetStateAction<any>>;
    selectedTarget: any;
    setSelectedTarget: React.Dispatch<React.SetStateAction<any>>;
    highestOfferRarity?: number;
}

const ChooseUpgradeItems: React.FC<ChooseUpgradeItemsProps> = ({
    setSelectedItems,
    selectedCase,
    setSelectedCase,
    selectedTarget,
    setSelectedTarget,
    highestOfferRarity = 0,
}) => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    const [allCases, setAllCases] = useState<any[]>([]);
    const [selectedCaseItems, setSelectedCaseItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState<boolean>(true);
    const [sortRareFirst, setSortRareFirst] = useState<boolean>(false);
    const { userData } = useContext(UserContext);

    const getAllItemsInfo = async () => {
        setLoadingItems(true);
        if (userData) {
            try {
                const items = await getCases();
                setAllCases(items || []);
            } catch (error) {
                console.log(error);
            }
        }
        setLoadingItems(false);
    };

    const getSelectedCaseItems = async () => {
        setLoadingItems(true);
        if (userData && selectedCase) {
            try {
                const id = selectedCase._id || selectedCase;
                const res = await getCase(id);
                setSelectedCaseItems(res.items || []);
                setSortRareFirst(false);
            } catch (error) {
                console.log(error);
            }
        }
        setLoadingItems(false);
    };

    useEffect(() => {
        getAllItemsInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData]);

    useEffect(() => {
        if (selectedCase) getSelectedCaseItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCase]);

    return (
        <div className="flex flex-col w-full rounded-2xl bg-gradient-to-b from-[#1f1911] via-[#14100b] to-[#0b0906] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="flex w-full items-center justify-between gap-2 bg-gradient-to-r from-[#241c12] via-[#1c160e] to-[#241c12] border-b border-[#d4af37]/25 px-4 sm:px-5 py-3.5 min-h-[96px]">
                <div className="flex flex-col">
                    <span className="font-extrabold uppercase tracking-widest text-[#FCE79C] text-xs sm:text-sm md:text-base">
                        {t("games.getOneItem")}
                    </span>
                    <span className="text-[11px] text-[#9b8d6f] mt-0.5">
                        {selectedCase === null
                            ? es
                                ? "Elegí una caja para explorar sus reliquias"
                                : "Pick a case to browse its relics"
                            : es
                                ? "Elegí la reliquia que querés forjar"
                                : "Pick the target relic to forge"}
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {selectedCase !== null && (
                        <>
                            <button
                                type="button"
                                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/45 border border-[#d4af37]/35 text-[#e6c770] hover:text-white hover:border-[#ECA823] transition-all"
                                onClick={() => {
                                    sound.play("chip");
                                    setSelectedCase(null);
                                    setSelectedCaseItems([]);
                                    setSelectedTarget(null);
                                    setSelectedItems([]);
                                }}
                            >
                                <AiOutlineClose />
                                <span>{t("games.clear")}</span>
                            </button>
                            <button
                                type="button"
                                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#120e09] border border-[#d4af37]/30 text-gray-200 hover:border-[#ECA823] transition-all"
                                onClick={() => {
                                    sound.play("chip");
                                    setSortRareFirst((v) => !v);
                                    setSelectedCaseItems((prev) => [...prev].reverse());
                                }}
                            >
                                <span>{t("games.rarity")}</span>
                                <AiOutlineArrowDown
                                    className="text-[#ECA823] transition-transform duration-200"
                                    style={{ transform: sortRareFirst ? "rotate(180deg)" : "" }}
                                />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="h-[420px] sm:h-[480px] p-3.5 sm:p-5 overflow-y-auto">
                {loadingItems ? (
                    <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton
                                width={156}
                                height={196}
                                highlightColor="#14110c"
                                baseColor="#221d16"
                                key={i}
                            />
                        ))}
                    </div>
                ) : selectedCase === null ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {allCases.map((item: any, index: number) => (
                            <button
                                key={item._id || index}
                                type="button"
                                onClick={() => {
                                    sound.play("chip");
                                    setSelectedCase(item._id);
                                }}
                                className="group cursor-pointer flex flex-col items-center justify-between p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-[#1a1510] to-[#0a0806] border border-[#d4af37]/25 hover:border-[#ECA823] shadow-[0_10px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_30px_rgba(236,168,35,0.25)] transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="relative flex items-center justify-center w-full h-28 sm:h-32">
                                    <div className="absolute bottom-2 w-20 h-5 bg-[#ECA823] blur-xl opacity-20 group-hover:opacity-45 transition-opacity rounded-full pointer-events-none" />
                                    <img
                                        decoding="async"
                                        src={item.image}
                                        alt={item.title}
                                        className="object-cover w-24 h-24 sm:w-28 sm:h-28 rounded-xl drop-shadow-[0_10px_15px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <span className="mt-2 font-extrabold text-xs sm:text-sm uppercase tracking-wider text-[#e7ddc8] group-hover:text-[#FCE79C] text-center transition-colors">
                                    {item.title}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3 sm:gap-4 justify-center content-start">
                        {selectedCaseItems.map((item: any, index: number) => {
                            const isTargetSelected = selectedTarget?._id === item._id;
                            const isLowerRarity =
                                highestOfferRarity > 0 && Number(item.rarity) < highestOfferRarity;

                            return (
                                <div
                                    key={item._id || index}
                                    title={
                                        isLowerRarity
                                            ? es
                                                ? "No podés mejorar a una rareza menor a tu ofrenda"
                                                : "Cannot upgrade to a lower rarity than your offering"
                                            : item.name
                                    }
                                    className={`rounded-xl h-min relative transition-all duration-200 ${
                                        isLowerRarity
                                            ? "opacity-40 grayscale cursor-not-allowed"
                                            : isTargetSelected
                                                ? "cursor-pointer ring-2 ring-[#ffe9a8] shadow-[0_0_24px_rgba(236,168,35,0.5)] scale-[1.03]"
                                                : "cursor-pointer hover:scale-[1.02]"
                                    }`}
                                    onClick={() => {
                                        if (isLowerRarity) return;
                                        sound.play("chip");
                                        if (isTargetSelected) {
                                            setSelectedTarget(null);
                                        } else {
                                            setSelectedTarget(item);
                                        }
                                    }}
                                >
                                    {isTargetSelected && (
                                        <span className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-[#ffd966] text-[#1a1204] text-[10px] font-black flex items-center justify-center shadow">
                                            ✓
                                        </span>
                                    )}
                                    {isLowerRarity && (
                                        <span className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-black/75 border border-white/20 text-[#9b8d6f] text-[9px] flex items-center justify-center">
                                            <FaLock />
                                        </span>
                                    )}
                                    <Item item={item} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center py-3 px-4 border-t border-[#d4af37]/20 bg-black/35 text-xs text-[#9b8d6f] font-semibold">
                {selectedCase === null
                    ? es
                        ? `${allCases.length} cajas disponibles`
                        : `${allCases.length} cases available`
                    : es
                        ? `${selectedCaseItems.length} reliquias en esta caja`
                        : `${selectedCaseItems.length} relics in this case`}
            </div>
        </div>
    );
};

export default ChooseUpgradeItems;

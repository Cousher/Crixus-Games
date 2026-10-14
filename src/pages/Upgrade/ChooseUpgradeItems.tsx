import React, { useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineArrowDown } from "react-icons/ai"
import UserContext from "../../UserContext";
import { getCases, getCase } from "../../services/cases/CaseServices";
import Item from "../../components/Item";  // Import your Item component if you have one
import Skeleton from "react-loading-skeleton";
import { AiOutlineClose } from "react-icons/ai";

interface ChooseUpgradeItems {
    setSelectedItems: React.Dispatch<React.SetStateAction<any>>;
    selectedCase: any;
    setSelectedCase: React.Dispatch<React.SetStateAction<any>>;
    selectedTarget: any;
    setSelectedTarget: React.Dispatch<React.SetStateAction<any>>;
}

const ChooseUpgradeItems: React.FC<ChooseUpgradeItems> = ({ setSelectedItems, selectedCase, setSelectedCase, selectedTarget, setSelectedTarget }) => {
  const { t } = useTranslation();
    const [allCases, setAllCases] = useState<any[]>([]);
    const [selectedCaseItems, setSelectedCaseItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState<boolean>(true);
    const [itemFilters, setItemFilters] = useState({
        name: '',
        rarity: '',
        sortBy: '',
        order: 'asc'
    });
    const { userData } = useContext(UserContext);

    const getAllItemsInfo = async () => {
        setLoadingItems(true);
        if (userData) {
            try {
                const items = await getCases();
                setAllCases(items);
            }
            catch (error) {
                console.log(error);
            }
        }
        setLoadingItems(false);
    }

    const getSelectedCaseItems = async () => {
        setLoadingItems(true);
        if (userData) {
            try {

                if (selectedCase._id) {
                    const items = await getCase(selectedCase._id);
                    setSelectedCaseItems(items.items);
                } else {
                    const items = await getCase(selectedCase);
                    setSelectedCaseItems(items.items);
                }
            }
            catch (error) {
                console.log(error);
            }
        }
        setLoadingItems(false);
    }

    useEffect(() => {
        getAllItemsInfo();
    }, [userData]);

    useEffect(() => {
        selectedCase && getSelectedCaseItems();
    }, [selectedCase]);

    return (
        <div className="flex flex-col lg:w-1/2 w-full rounded-2xl bg-gradient-to-b from-[#1f1911] via-[#14100b] to-[#0b0906] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="flex w-full items-center justify-between bg-gradient-to-r from-[#241c12] via-[#1c160e] to-[#241c12] border-b border-[#d4af37]/25 px-6 py-4 min-h-[96px]">
                <span className="font-extrabold uppercase tracking-widest text-[#FCE79C] text-sm md:text-base">
                    {t("games.getOneItem")}
                </span>
                <div className="flex items-center gap-3">
                    {selectedCase !== null && (
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/40 border border-[#d4af37]/30 text-[#e6c770] hover:text-white hover:border-[#ECA823] transition-all"
                            onClick={() => {
                                setSelectedCase(null);
                                setSelectedCaseItems([]);
                                setSelectedTarget(null);
                                setSelectedItems([]);
                            }}
                        >
                            <AiOutlineClose />
                            <span>{t("games.clear")}</span>
                        </button>
                    )}
                    {selectedCase !== null && (
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#120e09] border border-[#d4af37]/30 text-gray-200 hover:border-[#ECA823] transition-all"
                            onClick={() => {
                                setItemFilters((prev) => ({
                                    ...prev,
                                    sortBy: prev.sortBy === "" ? "mostRare" : "",
                                }));
                                setSelectedCaseItems((prev) => [...prev].reverse());
                            }}
                        >
                            <span>{t("games.rarity")}</span>
                            <AiOutlineArrowDown
                                className="text-[#ECA823]"
                                style={{
                                    transform: itemFilters.sortBy === "mostRare" ? "rotate(180deg)" : "",
                                    transition: "transform 0.2s ease-in-out",
                                }}
                            />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex h-[500px] flex-wrap gap-4 p-5 overflow-y-auto justify-center content-start">
                {loadingItems ? (
                    { array: Array(12).fill(0) }.array.map((_, i) => (
                        <Skeleton
                            width={176}
                            height={216}
                            highlightColor="#14110c"
                            baseColor="#221d16"
                            key={i}
                        />
                    ))
                ) : selectedCase === null ? (
                    allCases.map((item: any, index: number) => (
                        <div
                            key={item._id || index}
                            onClick={() => setSelectedCase(item._id)}
                            className="group cursor-pointer flex flex-col items-center justify-between w-48 p-4 rounded-2xl bg-gradient-to-b from-[#1a1510] to-[#0a0806] border border-[#d4af37]/25 hover:border-[#ECA823] shadow-[0_10px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_30px_rgba(236,168,35,0.25)] transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="relative flex items-center justify-center w-full h-36">
                                <div className="absolute bottom-2 w-24 h-6 bg-[#ECA823] blur-2xl opacity-20 group-hover:opacity-45 transition-opacity rounded-full pointer-events-none" />
                                <img
                                    decoding="async"
                                    src={item.image}
                                    alt={`Select items from ${item.title}`}
                                    className="object-cover w-32 h-32 rounded-xl drop-shadow-[0_10px_15px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <span className="mt-3 font-extrabold text-sm uppercase tracking-wider text-[#e7ddc8] group-hover:text-[#FCE79C] text-center transition-colors">
                                {item.title}
                            </span>
                        </div>
                    ))
                ) : (
                    selectedCaseItems.map((item: any, index: number) => {
                        const isTargetSelected = selectedTarget?._id === item._id;
                        return (
                            <div
                                key={item._id || index}
                                className={`cursor-pointer rounded-xl h-min transition-all duration-200 ${
                                    isTargetSelected
                                        ? "ring-2 ring-[#ECA823] shadow-[0_0_25px_rgba(236,168,35,0.45)] scale-[1.03]"
                                        : "hover:scale-[1.02]"
                                }`}
                                onClick={() => {
                                    if (isTargetSelected) {
                                        setSelectedTarget(null);
                                    } else {
                                        setSelectedTarget(item);
                                    }
                                }}
                            >
                                <Item item={item} />
                            </div>
                        );
                    })
                )}
            </div>
            <div className="h-[45px] border-t border-[#d4af37]/20 bg-black/30" />
        </div>
    );
}

export default ChooseUpgradeItems;


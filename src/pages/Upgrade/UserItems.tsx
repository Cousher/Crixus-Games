import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdOutlineNavigateBefore, MdOutlineNavigateNext } from "react-icons/md";
import { AiOutlineClose, AiOutlineSearch } from "react-icons/ai";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import Item from "../../components/Item";
import UserContext from "../../UserContext";
import { getInventory } from "../../services/users/UserServices";
import Rarities from "../../components/Rarities";
import sound from "../../services/sound";
import { translateApiMessage } from "../../services/apiMessageI18n";

const MAX_SELECT = 20;

interface Inventory {
    selectedItems: any[];
    setSelectedItems: React.Dispatch<React.SetStateAction<any>>;
    selectedCase: any;
    setSelectedCase: React.Dispatch<React.SetStateAction<any>>;
    toggleReload: boolean;
    setSelectedTarget: React.Dispatch<React.SetStateAction<any>>;
}

const sortOptions = [
    { value: "newer", labelKey: "upg.newest" },
    { value: "older", labelKey: "upg.oldest" },
    { value: "mostRare", labelKey: "upg.rarityHL" },
    { value: "mostCommon", labelKey: "upg.rarityLH" },
];

const UserItems: React.FC<Inventory> = ({
    selectedItems,
    setSelectedItems,
    selectedCase,
    setSelectedCase,
    toggleReload,
    setSelectedTarget,
}) => {
    const { t } = useTranslation();
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pageLimit, setPageLimit] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [search, setSearch] = useState<string>("");
    const [inventoryFilters, setInventoryFilters] = useState({
        name: "",
        rarity: "",
        sortBy: "newer",
        order: "asc",
        caseId: "",
    });
    const { userData } = useContext(UserContext);

    const updateFilters = (patch: Partial<typeof inventoryFilters>) => {
        setInventoryFilters((prev) => ({ ...prev, ...patch }));
        setCurrentPage(1);
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            setInventoryFilters((prev) => (prev.name === search ? prev : { ...prev, name: search }));
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(timeout);
    }, [search]);

    const getInventoryInfo = async () => {
        setLoading(true);
        if (userData) {
            try {
                const newFilters = { ...inventoryFilters };
                if (selectedCase) {
                    newFilters.caseId = selectedCase;
                }
                const res = await getInventory(userData.id, currentPage, newFilters);
                setInventory(res.items || []);
                setPageLimit(res.totalPages || 0);
            } catch (error) {
                console.log(error);
            }
        }
        setLoading(false);
    };

    const handleItemClick = (item: any) => {
        const itemIdentifier = item.uniqueId;
        const itemExists = selectedItems.some(
            (selectedItem: { identifier: string }) => selectedItem.identifier === itemIdentifier
        );

        if (!itemExists && selectedItems.length >= MAX_SELECT) {
            toast.info(translateApiMessage("You can select up to 20 items at a time"), { theme: "dark" });
            return;
        }

        sound.play("chip");
        setSelectedItems(
            itemExists
                ? selectedItems.filter(
                      (selectedItem: { identifier: string }) => selectedItem.identifier !== itemIdentifier
                  )
                : [...selectedItems, { item: item, identifier: itemIdentifier }]
        );
        setSelectedCase(item.case);
    };

    const clearCase = () => {
        sound.play("chip");
        setSelectedCase(null);
        setSelectedItems([]);
        setSelectedTarget(null);
        updateFilters({ caseId: "" });
    };

    useEffect(() => {
        getInventoryInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, inventoryFilters, userData, selectedCase, toggleReload]);

    const selectClass =
        "bg-[#120e09] border border-[#d4af37]/30 hover:border-[#ECA823]/60 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-gray-200 focus:outline-none focus:border-[#ECA823] transition-colors";

    return (
        <div className="flex flex-col w-full rounded-2xl bg-gradient-to-b from-[#1f1911] via-[#14100b] to-[#0b0906] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="flex flex-col justify-center gap-3 bg-gradient-to-r from-[#241c12] via-[#1c160e] to-[#241c12] border-b border-[#d4af37]/25 px-4 sm:px-5 py-3.5 min-h-[96px]">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase tracking-widest text-[#FCE79C] text-xs sm:text-sm md:text-base">
                            {t("games.inventory")}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#0e0b08] border border-[#d4af37]/30 text-[10px] font-mono tabular-nums font-bold text-[#e6ca6a]">
                            {selectedItems.length}/{MAX_SELECT}
                        </span>
                    </div>
                    {selectedCase && (
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/45 border border-[#d4af37]/35 text-[#e6c770] hover:text-white hover:border-[#ECA823] transition-all"
                            onClick={clearCase}
                        >
                            <AiOutlineClose />
                            <span>{t("games.clearCase")}</span>
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#120e09] border border-[#d4af37]/30 focus-within:border-[#ECA823] rounded-lg px-2.5 flex-1 min-w-[140px] transition-colors">
                        <AiOutlineSearch className="text-[#c89d3c] shrink-0" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("games.searchItems")}
                            className="bg-transparent py-1.5 w-full text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none"
                        />
                        {search && (
                            <AiOutlineClose
                                className="text-gray-400 hover:text-white cursor-pointer shrink-0"
                                onClick={() => setSearch("")}
                            />
                        )}
                    </div>
                    <select
                        value={inventoryFilters.sortBy}
                        onChange={(e) => updateFilters({ sortBy: e.target.value })}
                        className={selectClass}
                    >
                        {sortOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {t(o.labelKey)}
                            </option>
                        ))}
                    </select>
                    <select
                        value={inventoryFilters.rarity}
                        onChange={(e) => updateFilters({ rarity: e.target.value })}
                        className={selectClass}
                    >
                        <option value="">{t("games.allRarities")}</option>
                        {Rarities.map((r) => (
                            <option key={r.id} value={String(r.id)}>
                                {t("rarity." + r.id)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex h-[420px] sm:h-[480px] flex-wrap gap-3 sm:gap-4 p-3.5 sm:p-5 overflow-y-auto justify-center content-start">
                {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton
                            width={156}
                            height={196}
                            highlightColor="#14110c"
                            baseColor="#221d16"
                            key={i}
                        />
                    ))
                ) : inventory.length > 0 ? (
                    inventory.map((item: any, index: number) => {
                        if (!item.case) return null;
                        const isSelected = selectedItems.some(
                            (selectedItem: { identifier: string }) => selectedItem.identifier === item.uniqueId
                        );
                        return (
                            <div
                                key={item.uniqueId || index}
                                onClick={() => handleItemClick(item)}
                                className={`cursor-pointer rounded-xl h-min relative transition-all duration-200 ${
                                    isSelected
                                        ? "ring-2 ring-[#ffe9a8] shadow-[0_0_24px_rgba(236,168,35,0.5)] scale-[1.03]"
                                        : "hover:scale-[1.02]"
                                }`}
                            >
                                {isSelected && (
                                    <span className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-[#ffd966] text-[#1a1204] text-[10px] font-black flex items-center justify-center shadow">
                                        ✓
                                    </span>
                                )}
                                <Item item={item} />
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 my-auto text-[#a89b82]">
                        <span className="font-semibold text-sm">{t("games.noItems")}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-4 py-3 border-t border-[#d4af37]/20 bg-black/35 text-xs sm:text-sm font-semibold text-[#e7ddc8]">
                <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="p-1 text-xl text-[#ECA823] disabled:text-[#555] disabled:cursor-not-allowed"
                    aria-label="Página anterior"
                >
                    <MdOutlineNavigateBefore />
                </button>
                <span className="font-mono tabular-nums">
                    {t("upg.page")} {currentPage}
                    {pageLimit > 0 ? ` / ${pageLimit}` : ""}
                </span>
                <button
                    type="button"
                    disabled={pageLimit === 0 || currentPage >= pageLimit}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="p-1 text-xl text-[#ECA823] disabled:text-[#555] disabled:cursor-not-allowed"
                    aria-label="Página siguiente"
                >
                    <MdOutlineNavigateNext />
                </button>
            </div>
        </div>
    );
};

export default UserItems;

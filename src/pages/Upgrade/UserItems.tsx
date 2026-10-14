import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdOutlineNavigateBefore, MdOutlineNavigateNext } from "react-icons/md";
import { AiOutlineClose, AiOutlineSearch } from "react-icons/ai";
import Skeleton from "react-loading-skeleton";
import Item from "../../components/Item";
import UserContext from "../../UserContext";
import { getInventory } from "../../services/users/UserServices";
import Rarities from "../../components/Rarities";

interface Inventory {
    selectedItems: any;
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

const UserItems: React.FC<Inventory> = ({ selectedItems, setSelectedItems, selectedCase, setSelectedCase, toggleReload, setSelectedTarget }) => {
  const { t } = useTranslation();
    const [inventory, setInventory] = useState<any>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pageLimit, setPageLimit] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [search, setSearch] = useState<string>("");
    const [inventoryFilters, setInventoryFilters] = useState({
        name: "",
        rarity: "",
        sortBy: "newer", // default: newest items first
        order: "asc",
        caseId: "",
    });
    const { userData } = useContext(UserContext);

    // any filter/sort change goes back to the first page
    const updateFilters = (patch: Partial<typeof inventoryFilters>) => {
        setInventoryFilters((prev) => ({ ...prev, ...patch }));
        setCurrentPage(1);
    };

    // debounce the search box into the name filter
    useEffect(() => {
        const timeout = setTimeout(() => {
            setInventoryFilters((prev) => (prev.name === search ? prev : { ...prev, name: search }));
            setCurrentPage(1);
        }, 400);
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
                const inventory = await getInventory(userData.id, currentPage, newFilters);
                setInventory(inventory.items);
                setPageLimit(inventory.totalPages);
            } catch (error) {
                console.log(error);
            }
        }
        setLoading(false);
    };

    const handleItemClick = (item: any) => {
        const itemIdentifier = item.uniqueId;
        const itemExists = selectedItems.some((selectedItem: { identifier: string }) => selectedItem.identifier === itemIdentifier);

        setSelectedItems(
            itemExists
                ? selectedItems.filter((selectedItem: { identifier: string }) => selectedItem.identifier !== itemIdentifier)
                : [...selectedItems, { item: item, identifier: itemIdentifier }]
        );
        setSelectedCase(item.case);
    };

    const clearCase = () => {
        setSelectedCase(null);
        setSelectedItems([]);
        setSelectedTarget(null);
        updateFilters({ caseId: "" });
    };

    useEffect(() => {
        getInventoryInfo();
    }, [currentPage, inventoryFilters, userData, selectedCase, toggleReload]);

    const selectClass = "bg-[#120e09] border border-[#d4af37]/30 hover:border-[#ECA823]/60 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-[#ECA823] transition-colors";

    return (
        <div className="flex flex-col lg:w-1/2 w-full rounded-2xl bg-gradient-to-b from-[#1f1911] via-[#14100b] to-[#0b0906] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="flex flex-col justify-center gap-3 bg-gradient-to-r from-[#241c12] via-[#1c160e] to-[#241c12] border-b border-[#d4af37]/25 px-6 py-4 min-h-[96px]">
                <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase tracking-widest text-[#FCE79C] text-sm md:text-base">
                        {t("games.inventory")}
                    </span>
                    {selectedCase && (
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/40 border border-[#d4af37]/30 text-[#e6c770] hover:text-white hover:border-[#ECA823] transition-all"
                            onClick={clearCase}
                        >
                            <AiOutlineClose />
                            <span>{t("games.clearCase")}</span>
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#120e09] border border-[#d4af37]/30 focus-within:border-[#ECA823] rounded-lg px-3 flex-1 min-w-[160px] transition-colors">
                        <AiOutlineSearch className="text-[#c89d3c]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("games.searchItems")}
                            className="bg-transparent py-1.5 w-full text-sm text-white placeholder-gray-500 focus:outline-none"
                        />
                        {search && (
                            <AiOutlineClose className="text-gray-400 hover:text-white cursor-pointer" onClick={() => setSearch("")} />
                        )}
                    </div>
                    <select
                        value={inventoryFilters.sortBy}
                        onChange={(e) => updateFilters({ sortBy: e.target.value })}
                        className={selectClass}
                    >
                        {sortOptions.map((o) => (
                            <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
                        ))}
                    </select>
                    <select
                        value={inventoryFilters.rarity}
                        onChange={(e) => updateFilters({ rarity: e.target.value })}
                        className={selectClass}
                    >
                        <option value="">{t("games.allRarities")}</option>
                        {Rarities.map((r) => (
                            <option key={r.id} value={String(r.id)}>{t("rarity." + r.id)}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex h-[500px] flex-wrap gap-4 p-5 overflow-y-auto justify-center content-start">
                {loading ? (
                    { array: Array(12).fill(0) }.array.map((_, i) => (
                        <Skeleton width={176} height={216} highlightColor="#14110c" baseColor="#221d16" key={i} />
                    ))
                ) : inventory.length > 0 ? (
                    inventory.map((item: any, index: number) => {
                        if (item.case) {
                            const isSelected = selectedItems.some(
                                (selectedItem: { identifier: string }) => selectedItem.identifier === item.uniqueId
                            );
                            return (
                                <div
                                    key={item.uniqueId || index}
                                    onClick={() => handleItemClick(item)}
                                    className={`cursor-pointer rounded-xl h-min transition-all duration-200 ${
                                        isSelected
                                            ? "ring-2 ring-[#ECA823] shadow-[0_0_25px_rgba(236,168,35,0.45)] scale-[1.03]"
                                            : "hover:scale-[1.02]"
                                    }`}
                                >
                                    <Item item={item} />
                                </div>
                            );
                        }
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 my-auto text-[#c7b99e]">
                        <span className="font-semibold">{t("games.noItems")}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center justify-center gap-4 py-3 border-t border-[#d4af37]/20 bg-black/30 text-sm font-semibold text-[#e7ddc8]">
                <MdOutlineNavigateBefore
                    className="text-xl"
                    style={{
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        color: currentPage === 1 ? "#555" : "#ECA823",
                    }}
                    onClick={() => {
                        if (currentPage !== 1) setCurrentPage((prev) => prev - 1);
                    }}
                />
                <span>{t("upg.page")} {currentPage}{pageLimit > 0 ? ` / ${pageLimit}` : ""}</span>
                <MdOutlineNavigateNext
                    className="text-xl"
                    style={{
                        cursor: currentPage === pageLimit ? "not-allowed" : "pointer",
                        color: currentPage === pageLimit ? "#555" : "#ECA823",
                    }}
                    onClick={() => {
                        if (currentPage !== pageLimit) setCurrentPage((prev) => prev + 1);
                    }}
                />
            </div>
        </div>
    );
};

export default UserItems;



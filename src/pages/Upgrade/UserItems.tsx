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

    const selectClass = "bg-[#1a1813] border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-[#e0b341]";

    return (
        <div className="flex flex-col md:w-1/2 gap-2">
            <div className="flex flex-col gap-3 bg-[#221d16] rounded px-6 py-4">
                <div className="flex items-center justify-between">
                    <span className="font-semibold">{t("games.inventory")}</span>
                    {selectedCase && (
                        <div
                            className="flex items-center gap-1 cursor-pointer border-b border-gray-500 text-gray-400 hover:text-white"
                            onClick={clearCase}
                        >
                            <AiOutlineClose />
                            <span>{t("games.clearCase")}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#1a1813] border border-gray-700 rounded px-2 flex-1 min-w-[160px]">
                        <AiOutlineSearch className="text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("games.searchItems")}
                            className="bg-transparent py-1 w-full text-sm focus:outline-none"
                        />
                        {search && (
                            <AiOutlineClose className="text-gray-400 cursor-pointer" onClick={() => setSearch("")} />
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
            <div className="flex h-[500px] border-2 border-[#221d16] flex-wrap gap-2 p-4 overflow-y-auto justify-around">
                {loading ? (
                    { array: Array(12).fill(0) }.array.map((_, i) => (
                        <Skeleton width={176} height={216} highlightColor="#14110c" baseColor="#221d16" key={i} />
                    ))
                ) : inventory.length > 0 ? (
                    inventory.map((item: any, index: number) => {
                        if (item.case) {
                            return (
                                <div
                                    key={index}
                                    onClick={() => handleItemClick(item)}
                                    className={`cursor-pointer border-2 h-min ${selectedItems.some((selectedItem: { identifier: string }) => selectedItem.identifier === item.uniqueId) ? " border-[#e0b341]" : "border-transparent"}`}
                                >
                                    <Item item={item} />
                                </div>
                            );
                        }
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4">
                        <span className="font-semibold">{t("games.noItems")}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4 text-white">
                <MdOutlineNavigateBefore
                    style={{
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        color: currentPage === 1 ? "gray" : "white",
                    }}
                    onClick={() => {
                        if (currentPage !== 1) setCurrentPage((prev) => prev - 1);
                    }}
                />
                <span>{t("upg.page")} {currentPage}{pageLimit > 0 ? ` / ${pageLimit}` : ""}</span>
                <MdOutlineNavigateNext
                    style={{
                        cursor: currentPage === pageLimit ? "not-allowed" : "pointer",
                        color: currentPage === pageLimit ? "gray" : "white",
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



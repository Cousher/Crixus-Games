import { BsSearch } from "react-icons/bs";
import { useTranslation } from "react-i18next";

interface Filters {
    filters: {
        name: string;
        rarity: string;
        sortBy: string;
        order: string;
    };
    setFilters: React.Dispatch<
        React.SetStateAction<{
            name: string;
            rarity: string;
            sortBy: string;
            order: string;
        }>
    >;
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const InventoryFilters: React.FC<Filters> = ({ filters, setFilters, onKeyPress }) => {
    const { t } = useTranslation();

    const controlClass =
        "bg-[#110e0a] text-[#efe6cf] placeholder-[#6e6250] border border-[#3a2e1f] focus:border-[#d4af37] rounded-xl px-3.5 py-2 text-sm outline-none transition-colors";

    return (
        <div className="flex flex-wrap items-center gap-3 mb-4 w-full justify-end">
            {/* Filter by name */}
            <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <BsSearch className="h-3.5 w-3.5 text-[#8a7a60]" aria-hidden="true" />
                </span>
                <input
                    type="text"
                    placeholder={t("games.searchItems")}
                    value={filters.name}
                    onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
                    onKeyPress={onKeyPress}
                    className={`${controlClass} w-full pl-9`}
                />
            </div>

            {/* Filter by rarity */}
            <select
                value={filters.rarity}
                onChange={(e) => setFilters((prev) => ({ ...prev, rarity: e.target.value }))}
                className={`${controlClass} cursor-pointer`}
            >
                <option value="">{t("games.allRarities")}</option>
                <option value="1">{t("rarity.1")}</option>
                <option value="2">{t("rarity.2")}</option>
                <option value="3">{t("rarity.3")}</option>
                <option value="4">{t("rarity.4")}</option>
                <option value="5">{t("rarity.5")}</option>
            </select>

            {/* Sort by */}
            <select
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                className={`${controlClass} cursor-pointer`}
            >
                <option value="">{t("market.sortBy")}</option>
                <option value="newer">{t("market.mostRecent")}</option>
                <option value="older">{t("market.oldestFirst")}</option>
                <option value="mostRare">{t("market.mostRareFirst")}</option>
                <option value="mostCommon">{t("market.mostCommonFirst")}</option>
            </select>

            {/* Button to clear all filters */}
            <button
                type="button"
                onClick={() => setFilters({ name: "", rarity: "", sortBy: "", order: "asc" })}
                className="px-4 py-2 bg-[#2a1614] hover:bg-[#3d1e1b] border border-red-800/50 text-red-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
            >
                {t("games.clear")}
            </button>
        </div>
    );
};

export default InventoryFilters;


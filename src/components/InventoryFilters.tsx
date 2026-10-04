import { BsSearch } from 'react-icons/bs';

interface Filters {
    filters: {
        name: string;
        rarity: string;
        sortBy: string;
        order: string;
    };
    setFilters: React.Dispatch<React.SetStateAction<{
        name: string;
        rarity: string;
        sortBy: string;
        order: string;
    }>>;
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;

}

import { useTranslation } from 'react-i18next';

const InventoryFilters: React.FC<Filters> = ({ filters, setFilters, onKeyPress }) => {
    const { t } = useTranslation();

    return (
    <div className="flex flex-wrap gap-4 mb-4 w-full justify-end">
        {/* Filter by name */}
        <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <BsSearch className="h-4 w-4 text-gray-500" aria-hidden="true" />
            </span>
            <input
                type="text"
                placeholder={t("games.searchItems")}
                value={filters.name}
                onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
                onKeyPress={onKeyPress}
                className="pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:border-blue-500"
            />
        </div>

        {/* Filter by rarity */}
        <select
            value={filters.rarity}
            onChange={(e) => setFilters((prev) => ({ ...prev, rarity: e.target.value }))}
            className="px-3 py-2 border rounded-md focus:outline-none focus:border-blue-500"
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
            className="px-3 py-2 border rounded-md focus:outline-none focus:border-blue-500"
        >
            <option value="">{t("market.sortBy")}</option>
            <option value="newer">{t("market.mostRecent")}</option>
            <option value="older">{t("market.oldestFirst")}</option>
            <option value="mostRare">{t("market.mostRareFirst")}</option>
            <option value="mostCommon">{t("market.mostCommonFirst")}</option>
        </select>


        {/* Button to clear all filters */}
        <button
            onClick={() => setFilters({ name: '', rarity: '', sortBy: '', order: 'asc' })}
            className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:border-red-700 focus:ring focus:ring-red-200"
        >
            {t("games.clear")}
        </button>
    </div>
)};

export default InventoryFilters;

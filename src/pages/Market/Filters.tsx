import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Rarities from "../../components/Rarities";
import { BsSearch } from "react-icons/bs";

interface FiltersProps {
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
}

const Filters: React.FC<FiltersProps> = ({ filters, setFilters }) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(localFilters);
    }, 450);

    return () => {
      clearTimeout(handler);
    };
  }, [localFilters, setFilters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalFilters((prev) => ({ ...prev, [name]: value }));
  };

  const controlClass =
    "bg-[#110e0a] text-[#efe6cf] placeholder-[#6e6250] border border-[#3a2e1f] focus:border-[#d4af37] rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors";

  return (
    <div className="w-full mb-4">
      <div className="w-full rounded-2xl bg-gradient-to-b from-[#1a1510] to-[#120e0a] border border-[#33281b] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a7a60] text-sm pointer-events-none" />
          <input
            type="text"
            name="name"
            placeholder={t("market.searchByName")}
            value={localFilters.name}
            onChange={handleChange}
            className={`${controlClass} w-full pl-10`}
          />
        </div>

        {/* Selects */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <select
            name="rarity"
            value={localFilters.rarity}
            onChange={handleChange}
            className={`${controlClass} flex-1 sm:flex-initial min-w-[140px] cursor-pointer`}
          >
            <option value="">{t("games.allRarities")}</option>
            {Rarities.map((rarity, index) => (
              <option key={index} value={rarity.id}>
                {t("rarity." + rarity.id)}
              </option>
            ))}
          </select>

          <select
            name="sortBy"
            value={localFilters.sortBy}
            onChange={handleChange}
            className={`${controlClass} flex-1 sm:flex-initial min-w-[140px] cursor-pointer`}
          >
            <option value="">{t("market.sortBy")}</option>
            <option value="price">{t("market.price")}</option>
            <option value="rarity">{t("market.rarity")}</option>
          </select>

          <select
            name="order"
            value={localFilters.order}
            onChange={handleChange}
            className={`${controlClass} flex-1 sm:flex-initial min-w-[130px] cursor-pointer`}
          >
            <option value="asc">{t("market.ascending")}</option>
            <option value="desc">{t("market.descending")}</option>
          </select>

          {(localFilters.name || localFilters.rarity || localFilters.sortBy) && (
            <button
              type="button"
              onClick={() => {
                const reset = { name: "", rarity: "", sortBy: "", order: "asc" };
                setLocalFilters(reset);
                setFilters(reset);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#2a1614] hover:bg-[#3d1e1b] border border-red-800/50 text-red-200 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              {t("games.clear")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Filters;



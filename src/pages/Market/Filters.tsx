import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import Rarities from '../../components/Rarities';
import { FiFilter } from 'react-icons/fi';

interface FiltersProps {
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
}

const Filters: React.FC<FiltersProps> = ({ filters, setFilters }) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState(filters);
  const [openFilters, setOpenFilters] = useState<boolean>(false);


  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(localFilters);
    }, 1500);

    return () => {
      clearTimeout(handler);
    };
  }, [localFilters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className='w-full max-w-[1200px] md:-mt-[72px] mb-4 '  >
      <div className="flex flex-col items-center md:items-end gap-4 mt-4 justify-end w-full">
               <div onClick={() => setOpenFilters(!openFilters)} className="border p-2 rounded-md cursor-pointer">
              <FiFilter className="text-2xl " />
            </div>
      {
        openFilters && (
          <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          name="name"
          placeholder={t("market.searchByName")}
          value={localFilters.name}
          onChange={handleChange}
          className="border rounded px-4 py-2"
        />
        <select name="rarity" value={localFilters.rarity} onChange={handleChange} className="border rounded px-4 py-2">
          <option value="">{t("market.rarity")}</option>
          {Rarities.map((rarity, index) => (
            <option key={index} value={rarity.id}>{t("rarity." + rarity.id)}</option>
          ))}
        </select>
        <select name="sortBy" value={localFilters.sortBy} onChange={handleChange} className="border rounded px-4 py-2">
          <option value="">{t("market.sortBy")}</option>
          <option value="price">{t("market.price")}</option>
          <option value="rarity">{t("market.rarity")}</option>
        </select>
        <select name="order" value={localFilters.order} onChange={handleChange} className="border rounded px-4 py-2">
          <option value="asc">{t("market.ascending")}</option>
          <option value="desc">{t("market.descending")}</option>
        </select>
      </div>
        )
      }
    </div>
    </div>
  );
};

export default Filters;


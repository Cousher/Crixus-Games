import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import MainButton from "../../components/MainButton";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Rarities from "../../components/Rarities";

interface Props {
  item: {
    image: string;
    name: string;
    rarity: number;
    _id: string;
    uniqueId: string
    cheapestPrice: number;
    totalListings: number;
  }
}

const MarketItem: React.FC<Props> = ({ item }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const handleImageLoad = () => {
    setLoading(false);
  };

  const color = Rarities.find((rarity) => rarity.id == item?.rarity)?.color || "#d4af37";
  const hasListings = item.totalListings > 0 && item.cheapestPrice !== null;

  return (
    <div
      onClick={() => navigate(`/marketplace/item/${item._id}`)}
      className="group relative flex flex-col justify-between rounded-2xl p-4 bg-gradient-to-b from-[#1b1510] via-[#130f0b] to-[#0c0a07] border border-[#33281b] hover:border-[#d4af37]/60 transition-all duration-300 cursor-pointer hover:-translate-y-1 shadow-[0_12px_30px_rgba(0,0,0,0.65)] overflow-hidden"
    >
      {/* Top rarity accent bar */}
      <div
        className="absolute top-0 inset-x-0 h-[3px] opacity-85"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />

      {/* Header: Rarity Pill + Name */}
      <div className="flex flex-col gap-1 z-10">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border"
            style={{
              color,
              borderColor: `${color}55`,
              backgroundColor: `${color}15`,
            }}
          >
            {t(`rarity.${item.rarity}`)}
          </span>
          <span className="text-[11px] font-semibold text-[#a39475]">
            {item.totalListings} {t("market.announced")}
          </span>
        </div>
        <span className="text-base font-extrabold text-[#f5ead4] truncate mt-1 group-hover:text-[#ffe9a8] transition-colors">
          {item.name}
        </span>
      </div>

      {/* Relic Image Pedestal */}
      <div className="relative w-full h-40 my-3 flex items-center justify-center">
        <div
          className="absolute w-28 h-28 rounded-full blur-2xl opacity-25 group-hover:opacity-45 transition-opacity pointer-events-none"
          style={{ backgroundColor: color }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#e0b341]" />
          </div>
        )}
        <Link to={`/marketplace/item/${item._id}`} onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center justify-center">
          <img
            decoding="async"
            src={item.image}
            alt={item.name}
            className={`max-h-36 w-auto object-contain rounded-lg z-10 drop-shadow-[0_12px_16px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-all duration-300 ${
              loading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={handleImageLoad}
            onError={handleImageLoad}
          />
        </Link>
      </div>

      {/* Footer CTA */}
      <div className="z-10 pt-2 border-t border-[#261e14]">
        <MainButton
          textSize="text-xs"
          text={
            hasListings
              ? `${t("market.startingAt")} ${new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "DOL",
                  minimumFractionDigits: 0,
                })
                  .format(item.cheapestPrice)
                  .replace("DOL", "$")}`
              : t("market.noListings")
          }
          onClick={() => navigate(`/marketplace/item/${item._id}`)}
        />
      </div>
    </div>
  );
};

export default MarketItem;



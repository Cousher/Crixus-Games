import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import MainButton from "../../components/MainButton";
import UserContext from "../../UserContext";
import { Link } from "react-router-dom";
import { IMarketItem } from "../../components/Types";

interface Props {
  item: IMarketItem;
  click: () => void;
  remove: () => void;
  loadingRemoval: boolean;
}

const MarketItem: React.FC<Props> = ({ item, click, remove, loadingRemoval }) => {
  const { t } = useTranslation();
  const { isLogged, userData } = useContext(UserContext);
  const [loading, setLoading] = useState<boolean>(true);

  const handleImageLoad = () => {
    setLoading(false);
  };

  const isFromLoggedUser = userData?.id === item?.sellerId?._id;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl p-4 bg-gradient-to-b from-[#1b1510] via-[#130f0b] to-[#0c0a07] border border-[#33281b] hover:border-[#d4af37]/60 transition-all duration-300 shadow-[0_12px_30px_rgba(0,0,0,0.65)] overflow-hidden">
      <div className="flex flex-col gap-1 z-10">
        <span className="text-base font-extrabold text-[#f5ead4] truncate">
          {item.itemName}
        </span>
        <Link
          to={`/profile/${item.sellerId._id}`}
          className="text-xs text-[#a39475] hover:text-[#ffe9a8] underline truncate transition-colors"
        >
          @{item.sellerId.username}
        </Link>
      </div>

      <div className="relative w-full h-40 my-3 flex items-center justify-center">
        <div className="absolute w-28 h-28 rounded-full bg-[#d4af37]/20 blur-2xl pointer-events-none" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#e0b341]" />
          </div>
        )}
        <img
          decoding="async"
          src={item.itemImage}
          alt={item.itemName}
          className={`max-h-36 w-auto object-contain rounded-lg z-10 drop-shadow-[0_12px_16px_rgba(0,0,0,0.85)] transition-opacity ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={handleImageLoad}
          onError={handleImageLoad}
        />
      </div>

      <div className="flex flex-col gap-2.5 z-10 pt-2 border-t border-[#261e14]">
        <p className="text-[#25D160] font-black text-lg text-center truncate">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "DOL",
            minimumFractionDigits: 0,
          })
            .format(item.price)
            .replace("DOL", "$")}
        </p>
        <MainButton
          text={isFromLoggedUser ? t("market.remove", "Retirar") : t("market.buy", "Comprar")}
          onClick={click && (isFromLoggedUser ? remove : click)}
          disabled={!isLogged || loadingRemoval}
        />
      </div>
    </div>
  );
};

export default MarketItem;


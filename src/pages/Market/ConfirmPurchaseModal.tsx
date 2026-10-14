import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { buyItem } from "../../services/market/MarketService";
import MainButton from "../../components/MainButton";
import { toast } from "react-toastify";
import UserContext from "../../UserContext";
import { IMarketItem } from "../../components/Types";

interface Props {
  item: IMarketItem;
  isOpen: boolean;
  onClose: () => void;
  setRefresh?: (value: boolean) => void;
}

const ConfirmPurchaseModal: React.FC<Props> = ({
  item,
  isOpen,
  onClose,
  setRefresh,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const { userData, toogleUserData } = useContext(UserContext);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await buyItem(item._id as string);
      setRefresh && setRefresh(true);
      toogleUserData({
        ...userData,
        walletBalance: userData.walletBalance - item.price,
      });

      toast.success(t("toast.purchaseSuccess"));
    } catch (error: any) {
      toast.error(error);
      console.log(error);
    }finally{
      setLoading(false);
      onClose();
    }
   
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-[#1b1510] to-[#110d09] border border-[#d4af37]/40 p-6 md:p-8 rounded-2xl w-full max-w-[520px] shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#ffe9a8] border-b border-[#2e2418] pb-3 mb-5">
          {t("market.confirmPurchase")}
        </h2>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#120e0a] border border-[#2c2318] rounded-xl p-4">
          <p className="text-[#efe6cf] text-base leading-relaxed">
            {t("market.confirmBuy", { name: item.item.name, price: item.price })}
          </p>
          <img
            src={item.item.image}
            alt={item.item.name}
            className="h-24 w-24 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] shrink-0"
          />
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#2e2418]">
          <button
            type="button"
            className="bg-[#2a1614] hover:bg-[#3d1e1b] border border-red-800/50 text-red-200 font-bold py-2.5 px-5 rounded-xl text-sm transition-colors"
            onClick={onClose}
          >
            {t("market.cancel")}
          </button>
          <div className="w-44">
            <MainButton
              text={t("market.confirm")}
              onClick={handleConfirm}
              loading={loading}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPurchaseModal;



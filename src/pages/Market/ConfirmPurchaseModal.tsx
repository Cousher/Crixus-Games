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
    <div className="fixed flex items-center justify-center h-screen w-screen z-50 top-[40px] bg-black/40">
      <div className="bg-[#181410] p-8 rounded w-[600px] min-h-[290px] ">
        <h2 className="text-lg font-semibold mb-2">{t("market.confirmPurchase")}</h2>
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-white text-lg">
            {t("market.confirmBuy", { name: item.item.name, price: item.price })}
          </p>
          <img src={item.item.image} alt="" className="h-28" />
        </div>

        <div className="flex items-center justify-end gap-4 mt-12">
          <button
            className=" bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md"
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


import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { getItemListings, removeListing } from "../../services/market/MarketService";
import Item from "./Item";
import Pagination from "../../components/Pagination";
import Skeleton from "react-loading-skeleton";
import { IMarketItem } from "../../components/Types";
import SellItemModal from "./SellItemModal";
import ConfirmPurchaseModal from "./ConfirmPurchaseModal";

interface ItemData {
  totalPages: number;
  currentPage: number;
  items: IMarketItem[];
}

const defaultItem: IMarketItem = {
  _id: "",
  sellerId: {
    _id: "",
    username: "",
  },
  item: {
    _id: "",
    name: "",
    image: "",
    uniqueId: "",
  },
  price: 0,
  itemName: "",
  itemImage: "",
  __v: 0,
  uniqueId: "",
};

const ItemPage: React.FC = () => {
  const { t } = useTranslation();
  const { itemId } = useParams<{ itemId: string }>();
  const [items, setItems] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [loadingRemoval, setLoadingRemoval] = useState<boolean>(false);
  const [openBuyModal, setOpenBuyModal] = useState<boolean>(false);
  const [openSellModal, setOpenSellModal] = useState<boolean>(false);
  const [refresh, setRefresh] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<IMarketItem>(defaultItem);


  const fetchItemListings = async () => {
    setLoading(true);
    try {
      const items = await getItemListings(itemId as string, page);
      setItems(items);
      setLoading(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refresh) {
      fetchItemListings();
      setRefresh(false);
    }
  }, [refresh]);


  useEffect(() => {
    fetchItemListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, itemId]);

  
  const buyItem = (item: IMarketItem) => {
    setSelectedItem(item);
    setOpenBuyModal(true);
  }

  const removeItem = async (item: IMarketItem) => {
    setLoadingRemoval(true)
    try {
      await removeListing(item.uniqueId);
      setRefresh(true);
    } catch(err) {
      console.log(err);
    }finally{
      setLoadingRemoval(false)
    }
  }


  return (
    <div className="flex flex-col w-full items-center justify-center py-8 px-4 max-w-[1440px] mx-auto">
      <SellItemModal
        isOpen={openSellModal}
        onClose={() => setOpenSellModal(false)}
        setRefresh={setRefresh}
      />
      <ConfirmPurchaseModal
        isOpen={openBuyModal}
        onClose={() => setOpenBuyModal(false)}
        item={selectedItem}
        setRefresh={setRefresh}
      />

      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 pb-5 border-b border-[#2e2418]">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#17120c] border border-[#d4af37]/35 hover:border-[#ffd966] text-xs font-bold text-[#ffe9a8] transition-colors self-start sm:self-center"
        >
          <FaArrowLeft className="text-[10px]" />
          <span>{t("nav.back")}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-[0.14em] bg-gradient-to-b from-[#fff3c4] via-[#e5bc48] to-[#9c7316] bg-clip-text text-transparent text-center">
          {items?.items?.[0]?.itemName || t("market.itemListings")}
        </h1>
        <div className="w-[82px] hidden sm:block" />
      </div>

      {items?.totalPages && items?.totalPages > 1 ? (
        <div className="my-2">
          <Pagination totalPages={items.totalPages} currentPage={page} setPage={setPage} />
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 w-full my-6">
          {Array(10)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="w-full h-[330px] rounded-2xl overflow-hidden border border-[#2c2318]">
                <Skeleton height={330} baseColor="#16120d" highlightColor="#241d15" />
              </div>
            ))}
        </div>
      ) : (
        <div className="w-full my-6">
          {items && items.items && items.items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 w-full">
              {items.items.map((item) => (
                <Item
                  key={item._id}
                  item={item}
                  click={() => buyItem(item)}
                  remove={() => removeItem(item)}
                  loadingRemoval={loadingRemoval}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full py-16 px-4 rounded-2xl bg-[#14100b] border border-[#2c2318]">
              <h2 className="text-xl font-bold text-[#c4b497] text-center">
                {t("market.noListings")}
              </h2>
            </div>
          )}
        </div>
      )}

      {items?.totalPages && items?.totalPages > 1 ? (
        <div className="mt-4">
          <Pagination totalPages={items.totalPages} currentPage={page} setPage={setPage} />
        </div>
      ) : null}
    </div>
  );
};

export default ItemPage;



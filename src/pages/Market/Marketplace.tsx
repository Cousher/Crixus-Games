import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import MarketItem from "./MarketItem";
import { getItems } from "../../services/market/MarketService";
import SellItemModal from "./SellItemModal";
import MainButton from "../../components/MainButton";
import Title from "../../components/Title";
import Skeleton from "react-loading-skeleton";
import UserContext from "../../UserContext";
import Pagination from "../../components/Pagination";
import Filters from "./Filters";


interface Props {

    image: string;
    name: string;
    rarity: number;
    _id: string;
    uniqueId: string
    cheapestPrice: number;
    totalListings: number;
  
}


interface ItemData {
  totalPages: number;
  currentPage: number;
  items: Props[];
}

const Marketplace: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [openSellModal, setOpenSellModal] = useState<boolean>(false);
  const [refresh, setRefresh] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState({
    name: '',
    rarity: '',
    sortBy: '',
    order: 'asc'
  });

  const { isLogged } = useContext(UserContext);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const items = await getItems(page, filters);
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
      fetchItems();
      setRefresh(false);
    }
  }, [refresh]);

  useEffect(() => {
    setRefresh(true);
    scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    fetchItems();
  }, [filters]);

  const displayedItems = React.useMemo(() => {
    if (!items?.items) return [];
    const list = [...items.items];
    if (filters.sortBy === "price") {
      list.sort((a, b) => {
        const pa = a.cheapestPrice ?? Number.MAX_SAFE_INTEGER;
        const pb = b.cheapestPrice ?? Number.MAX_SAFE_INTEGER;
        return filters.order === "desc" ? pb - pa : pa - pb;
      });
    } else if (filters.sortBy === "rarity") {
      list.sort((a, b) => {
        const ra = Number(a.rarity) || 0;
        const rb = Number(b.rarity) || 0;
        return filters.order === "desc" ? rb - ra : ra - rb;
      });
    }
    return list;
  }, [items, filters.sortBy, filters.order]);

  return (
    <div className="flex flex-col w-full items-center justify-center py-8 px-4 max-w-[1440px] mx-auto">
      <SellItemModal
        isOpen={openSellModal}
        onClose={() => setOpenSellModal(false)}
        setRefresh={setRefresh}
      />

      {/* Imperial Bazaar Header */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-[#2e2418]">
        <div className="flex flex-col items-center md:items-start">
          <Title title={t("market.marketplace")} />
          <p className="text-xs md:text-sm text-[#9c8c72] -mt-2">
            {t("market.subtitle", "Comerciá reliquias y armamento del Coliseo con otros gladiadores")}
          </p>
        </div>

        {isLogged && (
          <div className="w-56 shrink-0">
            <MainButton
              onClick={() => setOpenSellModal(true)}
              text={t("market.sellItem")}
            />
          </div>
        )}
      </div>

      <Filters filters={filters} setFilters={setFilters} />

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
          {displayedItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 w-full">
              {displayedItems.map((item) => (
                <MarketItem key={item._id} item={item} />
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

export default Marketplace;



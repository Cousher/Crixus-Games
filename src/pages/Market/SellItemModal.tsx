import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { sellItem } from "../../services/market/MarketService";
import { getInventory } from "../../services/users/UserServices";
import UserContext from "../../UserContext";
import Item from "../../components/Item";
import MainButton from "../../components/MainButton";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import Pagination from "../../components/Pagination";
import Filters from "../../components/InventoryFilters";
import { FiFilter } from 'react-icons/fi'
import Modal from "../../components/Modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  setRefresh?: (value: boolean) => void;
}

interface InventoryItem {
  _id: string;
  name: string;
  image: string;
  rarity: string;
  uniqueId: string
}

interface Inventory {
  totalPages: number;
  currentPage: number;
  items: InventoryItem[];
}

const SellItemModal: React.FC<Props> = ({ isOpen, onClose, setRefresh }) => {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<any>();
  const [price, setPrice] = useState<number | undefined>();
  const [inventory, setInventory] = useState<Inventory>();
  const [invItems, setInvItems] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(true);
  const [loadingButton, setLoadingButton] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [openFilters, setOpenFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    name: '',
    rarity: '',
    sortBy: '',
    order: 'asc'
  });
  const delayDebounceFn = useRef<NodeJS.Timeout | null>(null);

  const { userData } = useContext(UserContext);

  const CloseModal = () => {
    setSelectedItem(null);
    setPrice(0);
    setInvItems([]);
    setPage(1);
    onClose();
  }

  const handleSubmit = async () => {
    setLoadingButton(true);

    if (price && (price < 0 || price > 1000000)) {
      setLoadingButton(false);
      return toast.error(t("toast.priceRange"), {});
    }

    try {
      await sellItem(selectedItem.uniqueId, price || 0);
      setRefresh && setRefresh(true);
      toast.success(t("toast.itemListed"), {});
      CloseModal();
    } catch (error: any) {
      console.log(error);
      toast.error(error.response.data.message);
    }
    setLoadingButton(false);
  };

  const getInventoryInfo = async (newPage?: number) => {
    try {
      const response = await getInventory(
        userData.id,
        page,
        filters
      );
      setInventory(response);
      newPage
        ? setInvItems((prev) => [...prev, ...response.items])
        : setInvItems(response.items);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleEnterPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Cancel the debounce
      clearTimeout(delayDebounceFn.current as NodeJS.Timeout);
      // Fetch the inventory immediately
      getInventoryInfo();
    }
  };

  useEffect(() => {
    if (invItems?.length > 0) {
      delayDebounceFn.current = setTimeout(() => {
        getInventoryInfo();
      }, 1000);
      return () => {
        if (delayDebounceFn.current) {
          clearTimeout(delayDebounceFn.current);
        }
      };
    }
  }, [filters]);

  useEffect(() => {
    if (isOpen) {
      setInvItems([]);
      getInventoryInfo(page);
    }
  }, [isOpen, page]);

  if (!isOpen) {
    return null;
  }

  return (
    <Modal open={isOpen} setOpen={onClose}>
      <div className="flex flex-col gap-4 text-[#efe6cf]">
        <div className="flex items-center justify-between border-b border-[#2e2418] pb-3">
          <h2 className="text-xl font-black uppercase tracking-wider text-[#ffe9a8]">
            {t("market.sellItemTitle")}
          </h2>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#120e0a] border border-[#2e2418] rounded-xl p-4">
          <div className="flex-1">
            <label
              className="block text-[#a39475] text-xs font-bold uppercase tracking-wider mb-2"
              htmlFor="price"
            >
              {t("market.price", "Precio")}
            </label>
            <input
              className="bg-[#1b1510] border border-[#3d3122] focus:border-[#d4af37] rounded-xl w-full py-2.5 px-3.5 text-[#efe6cf] placeholder-[#6e6250] leading-tight outline-none transition-colors"
              id="price"
              type="number"
              min={1}
              max={1000000}
              placeholder={t("market.priceInKP")}
              value={price || ""}
              onKeyDown={(event) => {
                if (!/[0-9]/.test(event.key) && event.key !== "Backspace" && event.key !== "Tab" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                  event.preventDefault();
                }
              }}
              onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
            />
            {!!price && price > 0 && (
              <p className="mt-2 text-xs text-[#9c8c72]">
                {t("market.feeNotice", "Comisión del mercado 5%. Vas a recibir:")}{" "}
                <span className="font-bold text-[#e5bc48]">
                  ${(Math.floor(price * 0.95 * 100) / 100).toLocaleString()}
                </span>
              </p>
            )}
          </div>

          {selectedItem && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#1a140e] border border-[#d4af37]/40">
              <img src={selectedItem.image} alt={selectedItem.name} className="h-16 w-16 object-contain" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold">
                  {t(`rarity.${selectedItem.rarity}`)}
                </span>
                <span className="text-[#f5ead4] text-sm font-extrabold">
                  {selectedItem.name}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col w-full items-start gap-3">
          <button
            type="button"
            onClick={() => setOpenFilters(!openFilters)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#16120d] border border-[#3a2e1f] hover:border-[#d4af37] text-xs font-bold uppercase tracking-wider text-[#d4af37] transition-colors"
          >
            <FiFilter className="text-base" />
            <span>{t("market.sortBy", "Filtros")}</span>
          </button>
          {openFilters && <Filters filters={filters} setFilters={setFilters} onKeyPress={handleEnterPress} />}
        </div>

        <div className="flex flex-col justify-center max-h-[240px] gap-4">
          <div className="flex flex-wrap justify-center gap-3 overflow-y-auto overflow-x-hidden py-2 pr-1">
            {loadingInventory ? (
              [1, 2, 3, 4].map((item) => (
                <div className="w-1/4 p-1" key={item}>
                  <Skeleton height={120} baseColor="#16120d" highlightColor="#241d15" />
                </div>
              ))
            ) : (
              invItems.map((item, index) => (
                <div
                  className={`p-1 rounded-xl cursor-pointer transition-transform ${
                    selectedItem?.uniqueId === item.uniqueId ? "ring-2 ring-[#d4af37] scale-105" : ""
                  }`}
                  key={item._id + index}
                  onClick={() => setSelectedItem(item)}
                >
                  <Item item={item} size="small" />
                </div>
              ))
            )}
            {inventory && inventory.totalPages > 1 && (
              <div className="w-full flex justify-center mt-2">
                <Pagination totalPages={inventory.totalPages} currentPage={inventory.currentPage} setPage={setPage} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2e2418]">
          <button
            type="button"
            className="bg-[#2a1614] hover:bg-[#3d1e1b] border border-red-800/50 text-red-200 font-bold py-2.5 px-5 rounded-xl text-sm transition-colors"
            onClick={CloseModal}
          >
            {t("market.cancel", "Cancelar")}
          </button>
          <div className="w-44">
            <MainButton
              text={t("market.sellItemBtn")}
              onClick={handleSubmit}
              loading={loadingButton}
              disabled={!selectedItem || !price || loadingButton}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SellItemModal;



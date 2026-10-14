import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getUser, getInventory } from "../../services/users/UserServices";
import { FiFilter } from 'react-icons/fi'
import UserInfo from "./UserInfo";
import FriendButton from "./FriendButton";
import Item from "../../components/Item";
import UserContext from "../../UserContext";
import Skeleton from "react-loading-skeleton";
import Filters from "../../components/InventoryFilters";
import Pagination from "../../components/Pagination";
import { User } from '../../components/Types'

interface Inventory {
  totalPages: number;
  currentPage: number;
  items: any[];
}


const Profile = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(true);
  const [inventory, setInventory] = useState<Inventory>();
  const [invItems, setInvItems] = useState<any[]>([]);
  const { userData } = useContext(UserContext);
  const [isSameUser, setIsSameUser] = useState<boolean>(false);
  const [refresh, setRefresh] = useState<boolean>(false);
  const [openFilters, setOpenFilters] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState({
    name: '',
    rarity: '',
    sortBy: 'newer',
    order: 'asc',
  });
  const delayDebounceFn = useRef<NodeJS.Timeout | null>(null);

  //get id from url
  const id = window.location.pathname.split("/")[2];

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


  const getUserInfo = async () => {
    try {
      const response = await getUser(id);
      setUser(response);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const getInventoryInfo = async (newPage?: boolean) => {
    setLoadingInventory(true);
    try {
      const response = await getInventory(
        id,
        page,
        filters
      );
      setInventory(response);
      newPage
        ? setInvItems((prev) => [...prev, ...response.items])
        : setInvItems(response.items);
    } catch (error) {
      console.log(error);
    }
    setLoadingInventory(false);
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
    if (userData) {
      if (userData.id == id) {
        setIsSameUser(true);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (refresh) {
      getUserInfo();
      getInventoryInfo();
      setRefresh(false);
    }
  }, [refresh]);

  useEffect(() => {
    getInventoryInfo();
  }, [page]);

  useEffect(() => {
    getUserInfo();
  }, []);


  return (
    <div className="flex flex-col items-center w-full py-6 px-4 max-w-[1360px] mx-auto gap-8">
      <div className="flex flex-col w-full">
        {loading ? (
          <div className="flex items-center justify-start pb-7">
            <Skeleton
              circle={true}
              height={144}
              width={144}
              highlightColor="#241d15"
              baseColor="#16120d"
            />
          </div>
        ) : (
          user && (
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-end">
                <FriendButton profileId={id as string} isSameUser={isSameUser} />
              </div>
              <UserInfo
                user={user}
                isSameUser={isSameUser}
                setRefresh={setRefresh}
              />
            </div>
          )
        )}
      </div>

      {/* Gladiator Armory / Inventory Section */}
      <div className="flex flex-col items-center w-full rounded-2xl bg-gradient-to-b from-[#1a1510] to-[#100d09] border border-[#33281b] shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-6 md:p-8 min-h-[60vh]">
        <div className="flex flex-col gap-5 w-full">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2c2318] pb-4">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#9c7316]" />
              <h2 className="text-2xl font-black uppercase tracking-[0.15em] text-[#f5ead4]">
                {t("games.inventory")}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setOpenFilters(!openFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                openFilters
                  ? "bg-[#2a2013] border-[#d4af37] text-[#ffe9a8]"
                  : "bg-[#14100b] border-[#3a2e1f] text-[#c4b497] hover:border-[#d4af37]/60"
              }`}
            >
              <FiFilter className="text-base text-[#d4af37]" />
              <span>{t("market.sortBy", "Filtros")}</span>
            </button>
          </div>

          {openFilters && (
            <Filters filters={filters} setFilters={setFilters} onKeyPress={handleEnterPress} />
          )}

          {inventory && inventory.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                totalPages={inventory.totalPages}
                currentPage={inventory.currentPage}
                setPage={setPage}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-5 justify-center py-4">
            {loadingInventory ? (
              Array(12)
                .fill(0)
                .map((_, i) => (
                  <Skeleton
                    width={176}
                    height={216}
                    highlightColor="#241d15"
                    baseColor="#16120d"
                    key={i}
                  />
                ))
            ) : invItems && Object.keys(invItems).length > 0 ? (
              invItems.map((item: any, i: number) => (
                <Item
                  item={item}
                  key={item?.uniqueId || item?.name + i}
                  fixable={isSameUser}
                  setRefresh={setRefresh}
                />
              ))
            ) : (
              <div className="py-16 text-center text-[#8a7f63] font-semibold">
                <h2>{t("profile.noItems")}</h2>
              </div>
            )}
          </div>

          {inventory && inventory.totalPages > 1 && (
            <div className="flex justify-center mt-2">
              <Pagination
                totalPages={inventory.totalPages}
                currentPage={inventory.currentPage}
                setPage={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;


import { useState, useEffect, useContext } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { getCase } from "../../services/cases/CaseServices";
import Title from "../../components/Title";
import Item from "../../components/Item";
import { openBox } from "../../services/games/GamesServices";
import UserContext from "../../UserContext";
import MainButton from "../../components/MainButton";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import { BasicItem } from "../../components/Types";
import QuantityButton from "../../components/QuantityButton";
import RouletteContainer from "./RoulleteContainer";
import Monetary from "../../components/Monetary";
import { useTranslation } from "react-i18next";
import { translateApiMessage } from "../../services/apiMessageI18n";

const CasePage = () => {
  const { id = "" } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [started, setStarted] = useState<boolean>(false);
  const [openedItems, setOpenedItems] = useState<BasicItem[]>([]);
  const [showPrize, setShowPrize] = useState<boolean>(false);
  const [hasSpinned, setHasSpinned] = useState<boolean>(false);
  const [animationAux, setAnimationAux] = useState<boolean>(false);
  const [animationAux2, setAnimationAux2] = useState<boolean>(false);
  const [loadingButton, setLoadingButton] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const { userData, toogleUserFlow } = useContext(UserContext);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(null);
    getCase(id)
      .then((response) => {
        setData(response);
      })
      .catch((error: any) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
    window.scrollTo(0, 0);
  }, [id]);

  const resetProps = () => {
    setShowPrize(false);
    setAnimationAux2(false);
    setAnimationAux((prev) => !prev);

    setTimeout(() => {
      setStarted(true);
      setHasSpinned(true);
    }, 500);

    setTimeout(() => {
      setStarted(false);
      setShowPrize(true);
    }, 7500);

    setTimeout(() => {
      setAnimationAux2(true);
      setLoadingButton(false);
    }, 8000);
  };

  const openCase = async () => {
    if (userData == null) {
      toogleUserFlow(true);
      return;
    }

    setLoadingButton(true);

    try {
      const response = await openBox(id, quantity);
      setOpenedItems(response.items);
    } catch (error: any) {
      console.log(error);
      setLoadingButton(false);
      toast.error(translateApiMessage(error, t("toast.connError")), {
        theme: "dark",
      });
      return;
    }

    resetProps();
  };

  const totalCost = data ? data.price * quantity : 0;
  const insufficientBalance = Boolean(userData && data && totalCost > userData.walletBalance);

  return (
    <div className="flex flex-col items-center w-full px-3 sm:px-4 pb-10">
      <div className="flex flex-col items-center overflow-hidden w-full max-w-[1440px]">
        {/* Top Back Link + Imperial Case Title */}
        <div className="w-full flex items-center justify-between pt-3 pb-5 gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#17120c] border border-[#d4af37]/35 hover:border-[#ffd966] text-xs font-bold text-[#ffe9a8] transition-colors"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>{t("nav.back")}</span>
          </Link>

          <h1 className="text-xl sm:text-3xl font-black uppercase tracking-[0.14em] gold-text text-center truncate">
            {loading ? (
              <Skeleton width={200} height={30} baseColor="#16120d" highlightColor="#241d15" />
            ) : (
              data?.title || (es ? "Caja no encontrada" : "Case not found")
            )}
          </h1>

          <div className="w-[82px] hidden sm:block" />
        </div>

        {!loading && !data ? (
          <div className="w-full max-w-md rounded-2xl border border-[#2f2518] bg-[#14100b] p-8 text-center my-8 flex flex-col items-center gap-4">
            <p className="text-sm text-[#c8bba0]">
              {es ? "No pudimos encontrar esta caja." : "We couldn't find this case."}
            </p>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black text-xs uppercase tracking-wider"
            >
              {t("nav.back")}
            </Link>
          </div>
        ) : (
          <>
            <RouletteContainer
              started={started}
              showPrize={showPrize}
              hasSpinned={hasSpinned}
              loading={loading}
              data={data}
              openedItems={openedItems}
              animationAux={animationAux}
              animationAux2={animationAux2}
              quantity={quantity}
            />

            {/* Centered Open Case Controls */}
            <div
              className={`flex flex-col sm:flex-row justify-center items-center gap-3.5 mt-7 ${
                started ? "opacity-0 pointer-events-none" : "opacity-100"
              } transition-opacity`}
            >
              {loading ? (
                <Skeleton width={240} height={44} baseColor="#16120d" highlightColor="#241d15" />
              ) : (
                <>
                  <div className="w-64">
                    <MainButton
                      text={
                        userData == null ? (
                          t("games.signInToPlay")
                        ) : (
                          <div className="flex items-center justify-center text-sm sm:text-base">
                            <span className="mr-1.5">{t("games.openCase")}</span>
                            <Monetary value={totalCost} />
                          </div>
                        )
                      }
                      onClick={openCase}
                      loading={loadingButton}
                      disabled={loadingButton || insufficientBalance}
                    />
                  </div>
                  <QuantityButton
                    quantity={quantity}
                    setQuantity={setQuantity}
                    disabled={started || loadingButton}
                  />
                </>
              )}
            </div>

            {insufficientBalance && !started && (
              <p className="mt-2 text-xs text-red-400 font-semibold">
                {t("toast.insufficientFunds")}
              </p>
            )}

            <div className="flex flex-col py-8 gap-3 items-center w-full">
              <Title title={t("games.itemsInCase")} />
              <div className="flex flex-wrap gap-4 sm:gap-5 px-2 sm:px-6 justify-center w-full">
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton
                        width={176}
                        height={216}
                        borderRadius={14}
                        highlightColor="#241d15"
                        baseColor="#16120d"
                        key={i}
                      />
                    ))
                  : (data?.items || []).map((item: any) => (
                      <Item item={item} key={item._id || item.name} />
                    ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CasePage;

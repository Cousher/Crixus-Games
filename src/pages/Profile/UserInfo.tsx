import { updateProfilePicture, updateTransferAlias } from "../../services/users/UserServices";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FaCheck, FaCopy, FaLock, FaUniversity } from "react-icons/fa";
import Countdown from "../../components/Countdown";
import FixedItem from "./FixedItem";
import Avatar from "../../components/Avatar";
import { User } from '../../components/Types';
import Monetary from "../../components/Monetary";
import { motion } from "framer-motion";
import { translateApiMessage } from "../../services/apiMessageI18n";
import { xpForLevel } from "../../utils/levels";
import UserContext from "../../UserContext";

interface UserProps {
  user: User;
  isSameUser: boolean;
  setRefresh?: React.Dispatch<React.SetStateAction<boolean>>;
}

const getPercentX = (x: number, y: number) => {
  return Math.round((x / y) * 100);
};

const TRANSFER_ALIAS_REGEX = /^[A-Za-z0-9.-]{6,30}$/;

const UserInfo: React.FC<UserProps> = ({
  user: { id, profilePicture, level, username, xp, fixedItem, nextBonus, walletBalance, weeklyWinnings },
  isSameUser,
  setRefresh,
}) => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { userData, toogleUserData } = useContext(UserContext);
  const fileInput = useRef<HTMLInputElement>(null);

  const savedAlias: string = userData?.transferAlias || "";
  const [aliasInput, setAliasInput] = useState<string>(savedAlias);
  const [savingAlias, setSavingAlias] = useState<boolean>(false);
  const [copiedAlias, setCopiedAlias] = useState<boolean>(false);

  useEffect(() => {
    setAliasInput(savedAlias);
  }, [savedAlias]);

  const trimmedAlias = aliasInput.trim();
  const aliasFormatValid = trimmedAlias === "" || TRANSFER_ALIAS_REGEX.test(trimmedAlias);
  const aliasChanged = trimmedAlias !== savedAlias;

  const handleSaveAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasFormatValid) {
      toast.error(
        es
          ? "El alias debe tener entre 6 y 30 caracteres (letras, números, puntos o guiones)"
          : "Alias must be 6-30 characters (letters, numbers, dots or hyphens)"
      );
      return;
    }
    setSavingAlias(true);
    try {
      const res = await updateTransferAlias(trimmedAlias);
      const nextAlias = res?.transferAlias ?? trimmedAlias;
      if (userData) {
        toogleUserData({ ...userData, transferAlias: nextAlias });
      }
      setAliasInput(nextAlias);
      toast.success(
        nextAlias
          ? translateApiMessage(res?.message, es ? "¡Alias guardado!" : "Alias saved!")
          : es
          ? "Alias eliminado"
          : "Alias cleared"
      );
    } catch (error: any) {
      toast.error(translateApiMessage(error, t("toast.connError")));
    } finally {
      setSavingAlias(false);
    }
  };

  const handleCopyAlias = async () => {
    if (!savedAlias) return;
    try {
      await navigator.clipboard.writeText(savedAlias);
      setCopiedAlias(true);
      toast.success(es ? "Alias copiado" : "Alias copied", { autoClose: 1800 });
      setTimeout(() => setCopiedAlias(false), 1800);
    } catch {
      toast.error(es ? "No se pudo copiar" : "Could not copy");
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileSizeMB = file.size / 1024 / 1024;
      const validFileTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const isValidFileType = validFileTypes.includes(file.type);

      if (fileSizeMB > 3) {
        toast.error(translateApiMessage('File size must be less than 3MB'));
        return;
      }

      if (!isValidFileType) {
        toast.error(translateApiMessage('File type must be jpeg, jpg or png'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await updateProfilePicture(reader.result as string);
          setRefresh && setRefresh(true);
          toast.success(translateApiMessage(res.message));
        } catch (error: any) {
          console.log(error);
          toast.error(translateApiMessage(error, t("toast.connError")));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const nextLevelXp = xpForLevel(level + 1);

  const cardClass =
    "bg-gradient-to-b from-[#1b1510] to-[#110d09] border border-[#33281b] hover:border-[#d4af37]/50 rounded-2xl p-6 shadow-[0_15px_35px_rgba(0,0,0,0.7)] flex flex-col gap-4 transition-colors";

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {/* User Identity Card */}
        <motion.div whileHover={{ y: -2 }} className={`${cardClass} justify-center`}>
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <Avatar
                image={profilePicture}
                loading={false}
                id={id}
                size={"large"}
                level={level}
                showLevel={true}
              />
              {isSameUser && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-85 bg-black/75 border-2 border-[#d4af37] transition-all flex items-center justify-center rounded-full cursor-pointer"
                >
                  <span className="text-[#ffe9a8] text-[11px] font-bold uppercase tracking-wider px-2 text-center">
                    {t("profile.itsYou")}
                  </span>
                </button>
              )}
              <input
                type="file"
                className="hidden"
                onChange={handleProfilePictureChange}
                ref={fileInput}
                accept="image/png, image/jpeg, image/jpg"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-2xl font-black text-[#f5ead4] truncate">{username}</span>
              <span className="inline-flex items-center self-start mt-1 px-2.5 py-0.5 rounded-full bg-[#2a2013] border border-[#d4af37]/40 text-xs font-bold text-[#e5bc48]">
                {t("profile.levelExplorer", { level })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Financial KPI Card */}
        <motion.div whileHover={{ y: -2 }} className={cardClass}>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[#9c8c72] font-bold">
              {t("profile.walletBalance")}
            </span>
            <span className="text-3xl font-black text-[#25D160]">
              <Monetary value={walletBalance || 0} />
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-[#261e14]">
            <span className="text-xs uppercase tracking-wider text-[#9c8c72] font-bold">
              {t("profile.weeklyWinnings")}
            </span>
            <span className="text-lg font-extrabold text-[#ffe9a8]">
              <Monetary value={weeklyWinnings || 0} />
            </span>
          </div>
        </motion.div>

        {/* Progression KPI Card */}
        <motion.div whileHover={{ y: -2 }} className={`${cardClass} justify-center`}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#9c8c72] font-bold">
              {t("profile.nextBonus")}
            </span>
            {nextBonus && new Date(nextBonus).getTime() > Date.now() ? (
              <Countdown nextBonus={nextBonus} color="#ffe9a8" />
            ) : (
              <span className="text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                {t("rewards.bonusAvailable")}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-[#0c0a07] border border-[#2e2418]">
              <div
                className="h-full bg-gradient-to-r from-[#9c7316] via-[#d4af37] to-[#ffe9a8] transition-all"
                style={{ width: `${Math.min(100, getPercentX(xp, nextLevelXp))}%` }}
              />
            </div>
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-mono text-[#a39475]">
                {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(xp)} /{" "}
                {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
                  nextLevelXp
                )}{" "}
                XP
              </span>
              <Tooltip id="my-tooltip" />
              <span
                className="text-xs text-[#e5bc48] cursor-help underline font-semibold"
                data-tooltip-id="my-tooltip"
                data-tooltip-content="Cada juego y caja otorga XP según su riesgo (de 1 a 5 XP por $1 apostado)."
              >
                Info
              </span>
            </div>
          </div>
        </motion.div>

        {/* Fixed Item Card */}
        <motion.div whileHover={{ y: -2 }} className={`${cardClass} items-center justify-center p-3`}>
          {fixedItem ? (
            <FixedItem fixedItem={fixedItem} isSameUser={isSameUser} setRefresh={setRefresh} />
          ) : (
            <span className="text-sm text-[#8a7f63] text-center font-medium">
              {t("profile.noItemPinned")}
            </span>
          )}
        </motion.div>
      </div>

      {/* Private Transfer Alias Card (visible ONLY on the user's own profile) */}
      {isSameUser && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b150e] via-[#130f0a] to-[#0d0a07] border border-[#d4af37]/30 shadow-[0_15px_35px_rgba(0,0,0,0.7)] p-5 sm:p-6">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#33260f] to-[#1a1308] border border-[#d4af37]/45 flex items-center justify-center text-[#ffd966] shrink-0 shadow-[0_0_16px_rgba(212,175,55,0.2)]">
                <FaUniversity className="text-lg" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#f5ead4]">
                    {es ? "Alias de transferencia" : "Transfer alias"}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a150d] border border-[#d4af37]/30 text-[10px] font-bold uppercase tracking-wider text-[#b9a77a]">
                    <FaLock className="text-[9px] text-[#d4af37]" />
                    {es ? "Privado · Solo vos" : "Private · Only you"}
                  </span>
                </div>
                <p className="text-xs text-[#9c8c72] max-w-xl">
                  {es
                    ? "Cargá tu alias bancario o de billetera virtual (CBU/CVU) para recibir transferencias. No se muestra a otros jugadores."
                    : "Save your bank or e-wallet transfer alias (CBU/CVU). It is never shown to other players."}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveAlias}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto lg:min-w-[420px]"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  maxLength={30}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={es ? "Alias de transferencia" : "Transfer alias"}
                  placeholder={es ? "Ej: mi.alias.mp" : "e.g. my.transfer.alias"}
                  className={`w-full h-11 px-3.5 ${
                    savedAlias ? "pr-10" : ""
                  } rounded-xl bg-[#0c0906] border text-sm font-mono text-[#f5ead4] placeholder-[#6c604d] outline-none transition-colors ${
                    !aliasFormatValid
                      ? "border-red-500/70 focus:border-red-400"
                      : "border-[#3a2f1d] focus:border-[#d4af37]"
                  }`}
                />
                {savedAlias && (
                  <button
                    type="button"
                    onClick={handleCopyAlias}
                    title={es ? "Copiar alias guardado" : "Copy saved alias"}
                    aria-label={es ? "Copiar alias guardado" : "Copy saved alias"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 p-0 rounded-lg bg-[#1c160e] hover:bg-[#2a2013] border border-[#d4af37]/30 text-[#ffe9a8] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {copiedAlias ? (
                      <FaCheck className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <FaCopy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={savingAlias || !aliasChanged || !aliasFormatValid}
                className="h-11 px-5 rounded-xl font-black uppercase tracking-wider text-xs text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] border border-[#fff2c2]/60 shadow-[0_0_16px_rgba(212,175,55,0.28)] hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed transition-all whitespace-nowrap cursor-pointer"
              >
                {savingAlias
                  ? es
                    ? "Guardando..."
                    : "Saving..."
                  : trimmedAlias === "" && savedAlias
                  ? es
                    ? "Borrar alias"
                    : "Clear alias"
                  : es
                  ? "Guardar alias"
                  : "Save alias"}
              </button>
            </form>
          </div>

          {!aliasFormatValid && (
            <p className="mt-2.5 text-xs font-semibold text-red-400">
              {es
                ? "Usá entre 6 y 30 caracteres: solo letras, números, puntos (.) o guiones (-), sin espacios."
                : "Use 6 to 30 characters: letters, numbers, dots (.) or hyphens (-) only, no spaces."}
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default UserInfo;


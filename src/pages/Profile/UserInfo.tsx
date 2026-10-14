import { updateProfilePicture } from "../../services/users/UserServices";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import { useRef } from "react";
import { toast } from "react-toastify";
import Countdown from "../../components/Countdown";
import FixedItem from "./FixedItem";
import Avatar from "../../components/Avatar";
import { User } from '../../components/Types';
import Monetary from "../../components/Monetary";
import { motion } from "framer-motion";

interface UserProps {
  user: User;
  isSameUser: boolean;
  setRefresh?: React.Dispatch<React.SetStateAction<boolean>>;
}

const getPercentX = (x: number, y: number) => {
  return Math.round((x / y) * 100);
};

const UserInfo: React.FC<UserProps> = ({
  user: { id, profilePicture, level, username, xp, fixedItem, nextBonus, walletBalance, weeklyWinnings },
  isSameUser,
  setRefresh,
}) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileSizeMB = file.size / 1024 / 1024;
      const validFileTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const isValidFileType = validFileTypes.includes(file.type);

      if (fileSizeMB > 3) {
        toast.error('File size must be less than 3MB');
        return;
      }

      if (!isValidFileType) {
        toast.error('File type must be jpeg, jpg or png');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await updateProfilePicture(reader.result as string);
          setRefresh && setRefresh(true);
          toast.success(res.message);
        } catch (error: any) {
          console.log(error);
          toast.error(error.message);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateRequiredXP = (level: number) => {
    const baseXP = 1000;
    let requiredXP = baseXP;
    for (let i = 1; i <= level; i++) {
      requiredXP += baseXP * Math.pow(1.25, i - 1);
    }
    return Math.round(requiredXP);
  };

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
                style={{ width: `${Math.min(100, getPercentX(xp, calculateRequiredXP(level)))}%` }}
              />
            </div>
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-mono text-[#a39475]">
                {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(xp)} /{" "}
                {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
                  calculateRequiredXP(level)
                )}{" "}
                XP
              </span>
              <Tooltip id="my-tooltip" />
              <span
                className="text-xs text-[#e5bc48] cursor-help underline font-semibold"
                data-tooltip-id="my-tooltip"
                data-tooltip-content="Por cada $1 apostado ganás 5 XP."
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
    </div>
  );
};

export default UserInfo;


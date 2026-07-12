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

  // Tremor-style Card Classes
  const cardClass = "bg-[#14120e] border border-[#2a251c] rounded-xl p-6 shadow-xl flex flex-col gap-4";

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
        
        {/* User Identity Card */}
        <motion.div whileHover={{ y: -2 }} className={cardClass}>
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <Avatar image={profilePicture} loading={false} id={id} size={'large'} level={level} showLevel={true} />
              {isSameUser && (
                <button
                  className="absolute inset-0 w-full h-full opacity-0 hover:opacity-70 bg-blue-500 transition-all flex items-center justify-center rounded-full cursor-pointer group-hover:opacity-70"
                >
                  <span className="text-white text-xs">{t("profile.itsYou")}</span>
                </button>
              )}
              <input type="file" className="hidden" onChange={handleProfilePictureChange} ref={fileInput} accept="image/png, image/jpeg, image/jpg" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-[#efe6cf]">{username}</span>
              <span className="text-sm text-gray-500">Level {level} Explorer</span>
            </div>
          </div>
        </motion.div>

        {/* Financial KPI Card */}
        <motion.div whileHover={{ y: -2 }} className={cardClass}>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gray-500 font-medium">Wallet Balance</span>
            <span className="text-3xl font-bold text-emerald-400">
              <Monetary value={walletBalance || 0} />
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-auto">
            <span className="text-sm text-gray-500 font-medium">Weekly Winnings</span>
            <span className="text-lg font-semibold text-[#efe6cf]">
              <Monetary value={weeklyWinnings || 0} />
            </span>
          </div>
        </motion.div>

        {/* Progression KPI Card */}
        <motion.div whileHover={{ y: -2 }} className={`${cardClass} justify-center`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">Next Bonus</span>
            {nextBonus && new Date(nextBonus).getTime() > Date.now() ? (
              <Countdown nextBonus={nextBonus} color="#efe6cf" />
            ) : (
              <span className="text-emerald-400 text-sm font-bold">{t("rewards.bonusAvailable")}</span>
            )}
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex w-full h-2 rounded-full overflow-hidden bg-[#3a2f14]">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${getPercentX(xp, calculateRequiredXP(level))}%` }}
              />
            </div>
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-gray-400">
                {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(xp)} / {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(calculateRequiredXP(level))} XP
              </span>
              <Tooltip id="my-tooltip" />
              <span className="text-xs text-blue-400 cursor-help underline" data-tooltip-id="my-tooltip" data-tooltip-content="To every 1K₽ spent, you get 5 XP.">
                Info
              </span>
            </div>
          </div>
        </motion.div>

        {/* Fixed Item Card */}
        <motion.div whileHover={{ y: -2 }} className={`${cardClass} items-center justify-center`}>
          {fixedItem ? (
            <FixedItem fixedItem={fixedItem} isSameUser={isSameUser} setRefresh={setRefresh} />
          ) : (
            <span className="text-sm text-gray-500 text-center">No item pinned</span>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default UserInfo;

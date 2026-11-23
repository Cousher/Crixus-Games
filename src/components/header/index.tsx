import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { BiArrowBack } from "react-icons/bi";
import { toast } from "react-toastify";
import UserFlow from "./userFlow";
import Navbar from "./Navbar/Navbar";
import UserContext from "../../UserContext";
import CaseOpenedNotification from "./CaseOpenedNotification";
import Notifications from "./Navbar/Notifications";
import Sidebar from "./Sidebar";
import { BasicItem } from "../Types";
import sound from "../../services/sound";
import { translateNotificationContent } from "../../services/notificationI18n";

interface CaseOpeningItem {
  caseImage: string;
  timestamp: number;
  user: {
    id: string;
    name: string;
    profilePicture: string;
  };
  winningItems: BasicItem[];
}

interface HeaderProps {
  onlineUsers: number;
  recentCaseOpenings: CaseOpeningItem[];
  notification: any;
  setNotification: React.Dispatch<React.SetStateAction<any>>;
}

interface ItemsQueue {
  items: BasicItem[];
  caseImages: string[];
  user: {
    id: string;
    name: string;
    profilePicture: string;
  };
}

const Header: React.FC<HeaderProps> = ({
  onlineUsers,
  recentCaseOpenings,
  notification,
  setNotification,
}) => {
  const { t } = useTranslation();
  const [openNotifications, setOpenNotifications] = useState<boolean>(false);
  const [openSidebar, setOpenSidebar] = useState<boolean>(false);
  const [ItemsQueue, setItemsQueue] = useState<ItemsQueue[]>([]);

  const { isLogged, openUserFlow } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    if (openNotifications === true) {
      setNotification([]);
    }
  }, [openNotifications, setNotification]);

  useEffect(() => {
    if (notification?.message) {
      sound.play("notify");
      toast.info(translateNotificationContent(notification.message, t));
    }
  }, [notification, t]);

  useEffect(() => {
    if (recentCaseOpenings.length > 0) {
      const newItems = recentCaseOpenings.map((opening) => ({
        items: opening.winningItems,
        caseImages: [opening.caseImage],
        user: opening.user,
      }));
      setItemsQueue(newItems);
    }
  }, [recentCaseOpenings]);

  return (
    <header className="flex flex-col px-2 sm:px-4 pt-2.5 sm:pt-3 pb-1 w-full items-center relative z-40">
      <Navbar
        onlineUsers={onlineUsers}
        openNotifications={openNotifications}
        setOpenNotifications={setOpenNotifications}
        openSidebar={openSidebar}
        setOpenSidebar={setOpenSidebar}
      />

      {/* Modals / Popovers anchored cleanly */}
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center justify-center relative w-full max-w-[1600px]">
          {openUserFlow && <UserFlow />}
          {isLogged && openNotifications && (
            <Notifications
              openNotifications={openNotifications}
              setOpenNotifications={setOpenNotifications}
            />
          )}
        </div>
      </div>

      {/* Live Case Drops Ticker */}
      {recentCaseOpenings.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 items-center justify-center w-full">
          <div className="flex flex-col max-w-[1600px] w-full">
            <span className="text-[#9c8f73] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
              {t("nav.liveDrop")}
            </span>
            <div className="flex h-28 bg-[#0e0c0a] rounded-xl border border-[#d4af37]/20 overflow-hidden">
              <div className="flex overflow-hidden justify-start transition-all">
                {ItemsQueue.map((opening, index) => (
                  <CaseOpenedNotification
                    key={index}
                    item={opening.items[0]}
                    caseImage={opening.caseImages[0]}
                    user={opening.user}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back Button on inner pages */}
      {!isHome && (
        <div className="w-full max-w-[1600px] pt-2.5 pb-1 px-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#17120c]/80 hover:bg-[#241c12] border border-[#d4af37]/25 hover:border-[#d4af37]/60 text-xs font-bold uppercase tracking-wider text-[#b9a77a] hover:text-[#ffe9a8] transition-all"
          >
            <BiArrowBack className="text-sm text-[#d4af37]" />
            <span>{t("nav.back")}</span>
          </button>
        </div>
      )}

      {openSidebar && <Sidebar closeSidebar={() => setOpenSidebar(false)} />}
    </header>
  );
};

export default Header;

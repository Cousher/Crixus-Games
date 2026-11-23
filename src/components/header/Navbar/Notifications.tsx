import { useEffect, useRef, useState } from "react";
import { FaBell, FaCrown, FaUserPlus } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import useOutsideClick from "../../../hooks/useOutsideClick";
import { getNotifications } from "../../../services/users/UserServices";
import { RotatingLines } from "react-loader-spinner";
import moment from "moment";
import "moment/locale/es";
import { useTranslation } from "react-i18next";
import {
  translateNotificationContent,
  translateNotificationTitle,
} from "../../../services/notificationI18n";

interface NotificationsProps {
  openNotifications: boolean;
  setOpenNotifications: React.Dispatch<React.SetStateAction<boolean>>;
}

interface NotificationItem {
  content: string;
  createdAt: string;
  read: boolean;
  title: string;
  type: "friendRequest" | "message" | "alert";
}

const Notifications: React.FC<NotificationsProps> = ({
  openNotifications,
  setOpenNotifications,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useOutsideClick(notificationsRef, () => setOpenNotifications(false));

  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "es").startsWith("en") ? "en" : "es";
  const es = lang === "es";

  useEffect(() => {
    if (!openNotifications) return;
    setLoading(true);
    getNotifications(1)
      .then((response) => setNotifications(Array.isArray(response) ? response : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [openNotifications]);

  if (!openNotifications) return null;

  return (
    <div
      ref={notificationsRef}
      className="fixed sm:absolute right-3 sm:right-6 top-16 sm:top-2 z-[70] w-[calc(100vw-24px)] sm:w-[360px] rounded-2xl border border-[#d4af37]/40 bg-gradient-to-b from-[#1e1811] via-[#15110c] to-[#0f0c08] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1d160e] border-b border-[#d4af37]/25">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffe9a8]">
          <FaBell className="text-[#d4af37]" />
          {es ? "Notificaciones" : "Notifications"}
        </span>
        <button
          type="button"
          onClick={() => setOpenNotifications(false)}
          aria-label="Cerrar notificaciones"
          className="w-7 h-7 p-0 rounded-full bg-[#130f0a] border border-[#3a2f1d] text-[#b9a77a] hover:text-white flex items-center justify-center cursor-pointer"
        >
          <IoMdClose className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-[#d4af37]/10">
        {loading ? (
          <div className="flex justify-center items-center py-14">
            <RotatingLines strokeColor="#d4af37" width="38" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification, index) => {
            const isRecent = moment().diff(notification.createdAt, "hours") < 24;
            const icon =
              notification.type === "friendRequest" ? (
                <FaUserPlus className="text-emerald-300 text-sm" />
              ) : (
                <FaCrown className="text-[#ffd966] text-sm" />
              );

            return (
              <div
                key={index}
                className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[#d4af37]/[0.04] ${
                  !notification.read ? "bg-[#d4af37]/[0.07]" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#241c10] border border-[#d4af37]/35 flex items-center justify-center shrink-0 mt-0.5">
                  {icon}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <p className="text-[#ffe9a8] text-xs font-bold leading-snug">
                    {translateNotificationTitle(notification.title, t)}
                  </p>
                  <p className="text-[#d8ccb2] text-xs leading-relaxed break-words">
                    {translateNotificationContent(notification.content, t)}
                  </p>
                  <p
                    className={`text-[10px] mt-1 font-semibold ${
                      isRecent ? "text-[#d4af37]" : "text-[#8a7f63]"
                    }`}
                  >
                    {moment(notification.createdAt).locale(lang).fromNow()}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-14 px-6 text-center">
            <FaBell className="text-2xl text-[#5a4e39]" />
            <p className="text-xs uppercase tracking-widest text-[#9b8d6f] font-semibold">
              {t("nav.noNotifications")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

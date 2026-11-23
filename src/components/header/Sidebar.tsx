import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsCoin } from "react-icons/bs";
import { GiCrossedSwords, GiMineExplosion, GiUpgrade } from "react-icons/gi";
import { MdOutlineSell } from "react-icons/md";
import { FaDice, FaFire, FaGift, FaHome, FaRocket } from "react-icons/fa";
import { IoMdClose, IoMdExit } from "react-icons/io";
import ClaimBonus from "../header/ClaimBonus";
import UserContext from "../../UserContext";
import Monetary from "../Monetary";
import LanguageSwitcher from "../LanguageSwitcher";

interface SidebarProps {
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ closeSidebar }) => {
  const { isLogged, userData, toogleUserFlow, logout } =
    useContext(UserContext);
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const handleLogout = () => {
    logout();
    closeSidebar();
  };

  const links = [
    { name: es ? "Inicio" : "Home", path: "/", icon: <FaHome className="text-lg" /> },
    { name: t("nav.road"), path: "/road", icon: <FaFire className="text-lg" />, isNew: true },
    { name: t("nav.crash"), path: "/crash", icon: <FaRocket className="text-lg" /> },
    { name: t("nav.slots"), path: "/slot", icon: <FaDice className="text-lg" /> },
    { name: t("nav.mines"), path: "/mines", icon: <GiMineExplosion className="text-lg" /> },
    { name: t("nav.coinflip"), path: "/coinflip", icon: <BsCoin className="text-lg" /> },
    { name: es ? "Duelos 1v1" : "1v1 Duels", path: "/duel", icon: <GiCrossedSwords className="text-lg" /> },
    { name: t("nav.upgrade"), path: "/upgrade", icon: <GiUpgrade className="text-lg" /> },
    { name: t("nav.market"), path: "/marketplace", icon: <MdOutlineSell className="text-lg" /> },
    { name: t("nav.rewards"), path: "/rewards", icon: <FaGift className="text-lg" /> },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSidebar();
      }}
    >
      <aside className="w-[86vw] max-w-[330px] min-h-screen max-h-screen overflow-y-auto bg-gradient-to-b from-[#1e1811] via-[#15110c] to-[#0e0b08] border-r border-[#d4af37]/35 p-4 flex flex-col gap-5 shadow-[20px_0_60px_rgba(0,0,0,0.9)]">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#2e2418]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/images/logo-crixus-v2.jpg"
              alt="Crixus Games"
              className="w-10 h-10 object-cover rounded-full border-2 border-[#d4af37]/65 shadow-[0_0_12px_rgba(212,175,55,0.4)] shrink-0"
            />
            <span className="font-black text-base gold-text tracking-wide truncate">
              Crixus Games
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={closeSidebar}
              aria-label="Cerrar menú"
              className="w-9 h-9 p-0 rounded-full bg-[#120e09] border border-[#d4af37]/35 text-[#ffe9a8] flex items-center justify-center cursor-pointer"
            >
              <IoMdClose className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Account Summary or Sign-In CTA */}
        {isLogged && userData ? (
          <div className="rounded-xl bg-[#120e09] border border-[#2f2518] p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9b8d6f] uppercase tracking-wider font-bold">
                {t("games.balance")}
              </span>
              <span className="font-mono font-black text-base text-emerald-400">
                <Monetary value={Math.floor(userData.walletBalance || 0)} />
              </span>
            </div>
            <ClaimBonus bonusDate={userData.nextBonus} userData={userData} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              toogleUserFlow(true);
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black text-xs uppercase tracking-wider shadow-[0_0_18px_rgba(212,175,55,0.35)] cursor-pointer"
          >
            {t("nav.signIn")}
          </button>
        )}

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 flex-1">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#2e220d] to-[#1a1409] border-[#d4af37]/70 text-[#ffe9a8]"
                    : "bg-transparent border-transparent text-[#d8ccb2] hover:bg-[#221a10] hover:text-[#ffe9a8]"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-[#d4af37]">{link.icon}</span>
                <span>{link.name}</span>
              </div>
              {link.isNew && (
                <span className="px-1.5 py-0.5 rounded bg-[#d4af37] text-[#1a1204] text-[9px] font-black uppercase">
                  {t("ux.badge_new")}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Logout Button (previously missing on small screens!) */}
        {isLogged && (
          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-950/35 hover:bg-red-950/60 border border-red-500/35 text-red-300 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            <IoMdExit className="w-4 h-4 shrink-0" />
            <span>{es ? "Cerrar sesión" : "Sign Out"}</span>
          </button>
        )}
      </aside>
    </div>
  );
};

export default Sidebar;

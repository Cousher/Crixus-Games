import { Link, NavLink } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { MdOutlineSell } from "react-icons/md";
import { BsCoin } from "react-icons/bs";
import { GiCrossedSwords, GiUpgrade, GiMineExplosion } from "react-icons/gi";
import { FaGift, FaBars, FaDice, FaRocket, FaFire } from "react-icons/fa";
import UserContext from "../../../UserContext";
import { clearTokens } from "../../../services/auth/authUtils";
import { me } from "../../../services/auth/auth";
import RightContent from "./RightContent";
import LanguageSwitcher from "../../LanguageSwitcher";
import SoundToggle from "../../SoundToggle";

interface NavbarProps {
  onlineUsers: number;
  openNotifications: boolean;
  setOpenNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  openSidebar: boolean;
  setOpenSidebar: React.Dispatch<React.SetStateAction<boolean>>;
}

const Navbar: React.FC<NavbarProps> = ({
  onlineUsers,
  openNotifications,
  setOpenNotifications,
  openSidebar,
  setOpenSidebar,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const { isLogged, toggleLogin, toogleUserData, userData, openUserFlow, toogleUserFlow } =
    useContext(UserContext);

  const toggleUserFlow = () => toogleUserFlow(!openUserFlow);
  const toggleSidebar = () => setOpenSidebar(!openSidebar);

  const Logout = () => {
    clearTokens();
    toggleLogin();
    toogleUserData(null);
  };

  const getUserInfo = async () => {
    await me()
      .then((response: any) => {
        toogleUserData(response);
        setLoading(false);
      })
      .catch((error: any) => {
        console.log(error);
        toast.error(t("toast.loginAgain"));
        Logout();
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isLogged === true) {
      getUserInfo();
      toogleUserFlow(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogged]);

  const gameLinks = [
    { name: t("nav.road"), path: "/road", icon: <FaFire className="text-sm" />, isNew: true },
    { name: t("nav.crash"), path: "/crash", icon: <FaRocket className="text-sm" /> },
    { name: t("nav.slots"), path: "/slot", icon: <FaDice className="text-sm" /> },
    { name: t("nav.mines"), path: "/mines", icon: <GiMineExplosion className="text-base" /> },
    { name: t("nav.coinflip"), path: "/coinflip", icon: <BsCoin className="text-sm" /> },
    { name: es ? "Duelos 1v1" : "1v1 Duels", path: "/duel", icon: <GiCrossedSwords className="text-base" /> },
    { name: t("nav.upgrade"), path: "/upgrade", icon: <GiUpgrade className="text-base" /> },
  ];

  const utilityLinks = [
    { name: t("nav.market"), path: "/marketplace", icon: <MdOutlineSell className="text-base" /> },
    { name: t("nav.rewards"), path: "/rewards", icon: <FaGift className="text-sm" /> },
  ];

  const renderNavLink = (link: { name: string; path: string; icon: JSX.Element; isNew?: boolean }) => (
    <NavLink
      to={link.path}
      key={link.path}
      className={({ isActive }) =>
        `group relative shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs xl:text-sm font-bold whitespace-nowrap transition-all border ${
          isActive
            ? "bg-gradient-to-b from-[#33260e] to-[#1e1608] border-[#d4af37]/75 text-[#ffe9a8] shadow-[0_0_16px_rgba(212,175,55,0.22)]"
            : "bg-transparent border-transparent text-[#c8bba0] hover:text-[#ffe9a8] hover:bg-[#231b10]/70 hover:border-[#d4af37]/25"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`transition-colors ${
              isActive ? "text-[#ffd966]" : "text-[#9b8d6f] group-hover:text-[#e0b341]"
            }`}
          >
            {link.icon}
          </span>
          <span>{link.name}</span>
          {link.isNew && (
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.9)]" />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="w-full flex justify-center">
      <nav className="w-full max-w-[1600px] rounded-2xl border border-[#d4af37]/35 bg-gradient-to-b from-[#1e1811]/95 via-[#15110c]/95 to-[#100d09]/95 backdrop-blur-md shadow-[0_14px_40px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.12)] overflow-hidden">
        {/* Top Imperial Accent Hairline */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/75 to-transparent" />

        {/* ===== Tier 1: Brand + Live Online + Account Controls ===== */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5">
          {/* Left: Mobile Menu + Brand Emblem */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Menú"
              className="md:hidden shrink-0 w-9 h-9 p-0 rounded-xl bg-[#17120c] border border-[#d4af37]/35 text-[#ffe9a8] flex items-center justify-center"
            >
              <FaBars className="w-4 h-4 shrink-0" />
            </button>

            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
                <img
                  src="/images/logo-crixus-v2.jpg"
                  alt="Crixus Games"
                  width={44}
                  height={44}
                  className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 object-cover rounded-full border-2 border-[#d4af37]/65 shadow-[0_0_14px_rgba(212,175,55,0.45)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="hidden sm:flex flex-col justify-center leading-tight whitespace-nowrap">
                <span className="font-black text-lg md:text-xl tracking-wide gold-text">
                  Crixus Games
                </span>
                <span className="text-[9px] text-[#9b8d6f] uppercase tracking-[0.24em] font-bold">
                  Premium Casino
                </span>
              </div>
            </Link>

            {/* Live Online Indicator Pill */}
            <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0e1d13] border border-emerald-500/30 text-[11px] font-mono tabular-nums font-bold text-emerald-300 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{onlineUsers}</span>
              <span className="font-sans text-[10px] uppercase tracking-wider text-emerald-300/75">
                online
              </span>
            </div>
          </div>

          {/* Right: Sound, Language & Account Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <SoundToggle />
            <div className="hidden sm:block shrink-0">
              <LanguageSwitcher />
            </div>

            {isLogged === true ? (
              <RightContent
                loading={loading}
                userData={userData}
                openNotifications={openNotifications}
                setOpenNotifications={setOpenNotifications}
                Logout={Logout}
              />
            ) : (
              <button
                type="button"
                onClick={toggleUserFlow}
                className="shrink-0 h-9 px-4 sm:px-5 rounded-full font-black uppercase tracking-[0.14em] text-xs text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] border border-[#fff2c2]/70 shadow-[0_0_18px_rgba(212,175,55,0.35)] hover:brightness-110 transition-all whitespace-nowrap"
              >
                {t("nav.signIn")}
              </button>
            )}
          </div>
        </div>

        {/* ===== Tier 2 (Desktop): Spacious Colosseum Games & Nav Bar ===== */}
        <div className="hidden md:flex items-center justify-between gap-3 px-4 py-2 border-t border-[#d4af37]/15 bg-[#0e0b08]/80 overflow-x-auto">
          <div className="flex items-center gap-1 xl:gap-1.5">
            {gameLinks.map(renderNavLink)}
          </div>

          <div className="flex items-center gap-1 xl:gap-1.5 pl-3 border-l border-[#d4af37]/20">
            {utilityLinks.map(renderNavLink)}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;

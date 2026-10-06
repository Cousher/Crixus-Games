

import { Link } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import UserContext from "../../../UserContext";
import MainButton from "../../MainButton";
import { clearTokens } from "../../../services/auth/authUtils";
import { me } from "../../../services/auth/auth";
import "react-loading-skeleton/dist/skeleton.css";
import { MdOutlineSell } from "react-icons/md";
import { BsCoin } from "react-icons/bs";
import { SlPlane } from "react-icons/sl";
import { GiUpgrade } from 'react-icons/gi';
import { TbCat } from "react-icons/tb";
import { GiMineExplosion } from "react-icons/gi";
import { FaGift } from "react-icons/fa";
import { toast } from "react-toastify";
import { FaBars } from 'react-icons/fa';
import RightContent from "./RightContent";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../LanguageSwitcher";
import SoundToggle from "../../SoundToggle";
import { NavLink } from "react-router-dom";

interface Navbar {
  openNotifications: boolean;
  setOpenNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  openSidebar: boolean;
  setOpenSidebar: React.Dispatch<React.SetStateAction<boolean>>;
}

const Navbar: React.FC<Navbar> = ({ openNotifications, setOpenNotifications, openSidebar, setOpenSidebar }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation();

  const { isLogged, toggleLogin, toogleUserData, userData, openUserFlow, toogleUserFlow } = useContext(UserContext);

  const toggleUserFlow = () => {
    toogleUserFlow(!openUserFlow);
  }

  const toggleSidebar = () => {
    setOpenSidebar(!openSidebar);
  };

  const Logout = () => {
    clearTokens();
    toggleLogin();
    toogleUserData(null);
  };

  const getUserInfo = async () => {
    await me()
      .then((response: { data: any }) => {
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


  const links = [
    { name: t("nav.market"), path: "/marketplace", icon: <MdOutlineSell className="text-2xl" /> },
    { name: t("nav.coinflip"), path: "/coinflip", icon: <BsCoin className="text-2xl" /> },
    { name: t("nav.crash"), path: "/crash", icon: <SlPlane className="text-2xl" /> },
    { name: t("nav.upgrade"), path: "/upgrade", icon: <GiUpgrade className="text-2xl" /> },
    { name: t("nav.slots"), path: "/slot", icon: <TbCat className="text-2xl" /> },
    { name: t("nav.mines"), path: "/mines", icon: <GiMineExplosion className="text-2xl" /> },
    { name: t("nav.rewards"), path: "/rewards", icon: <FaGift className="text-2xl" /> }
  ];


  useEffect(() => {

    if (isLogged == true) {
      getUserInfo();
      toogleUserFlow(false);
    }
  }, [isLogged]);



  return (
    <div className="w-full flex justify-center">
      <nav className=" py-4 px-8 bg-[#1a1813] w-[calc(100vw-2rem)] max-w-[1920px] flex justify-center notched ">
        <div className="flex items-center justify-between w-full ">
          <div className="md:hidden">
            <FaBars onClick={toggleSidebar} className="text-2xl cursor-pointer" />
          </div>
          <div className="hidden md:flex">
            <Link to="/">
              <div
                className="flex items-center gap-2"
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                  <img
                    src="/images/logo-crixus-v2.jpg"
                    alt="Crixus Games"
                    width={56}
                    height={56}
                    className="relative w-14 h-14 object-cover rounded-full border-2 border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.5)] transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="hidden md:flex flex-col justify-center ml-1">
                  <div className="font-bold text-2xl bg-gradient-to-r from-[#ffe9a8] via-[#d4af37] to-[#8a7f63] bg-clip-text text-transparent tracking-wide drop-shadow-sm">
                    Crixus Games
                  </div>
                  <div className="text-[10px] text-[#8a7f63] uppercase tracking-[0.2em] -mt-1 font-semibold">
                    Premium Casino
                  </div>
                </div>
              </div>
            </Link>
            {
              <div className="hidden md:flex items-center gap-5 ml-6">
                {links.map((link, index) => (<NavLink
                  to={link.path}
                  key={index}
                  className={({ isActive }) => `nav-link group relative flex items-center gap-2 font-normal text-xs 2xl:text-lg cursor-pointer py-1 ${isActive ? "nav-link-active" : ""}`}
                >
                  <span className="nav-icon text-[#8a7f63] group-hover:text-[#e0b341] transition-all group-hover:scale-110">
                    {link.icon}
                  </span>
                  <span className="nav-text text-white group-hover:text-[#ffe9a8] transition-all whitespace-nowrap ">
                    {link.name}
                  </span>
                </NavLink>
                ))}
              </div>
            }
          </div>

          <div className="flex items-center gap-3">
            <SoundToggle />
            <LanguageSwitcher />
            {isLogged === true ? (
              <RightContent loading={loading} userData={userData}
                openNotifications={openNotifications} setOpenNotifications={setOpenNotifications}
                Logout={Logout} />
            ) : (
              <MainButton
                text={t("nav.signIn")}
                onClick={toggleUserFlow} />
            )}
          </div>

        </div>
      </nav>
    </div>
  );
};

export default Navbar;




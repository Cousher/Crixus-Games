import { BsCoin } from "react-icons/bs";
import { GiUpgrade, GiMineExplosion } from "react-icons/gi";
import { MdOutlineSell } from "react-icons/md";
import { FaHome, FaGift, FaDice, FaRocket } from "react-icons/fa";
import { Link } from "react-router-dom";
import ClaimBonus from "../header/ClaimBonus";
import { useContext } from "react";
import UserContext from "../../UserContext";
import Monetary from "../Monetary";
import { useTranslation } from "react-i18next";

interface Sidebar {
    closeSidebar: () => void;
}

const Sidebar: React.FC<Sidebar> = ({ closeSidebar }) => {
    const { userData } = useContext(UserContext);
    const { t } = useTranslation();

    const links = [
        {
            name: "Inicio",
            path: "/",
            icon: <FaHome className="text-2xl" />,
        },
        {
            name: t("nav.market"),
            path: "/marketplace",
            icon: <MdOutlineSell className="text-2xl" />,
        },
        {
            name: t("nav.coinflip"),
            path: "/coinflip",
            icon: <BsCoin className="text-2xl" />,
        },
        {
            name: t("nav.crash"),
            path: "/crash",
            icon: <FaRocket className="text-2xl" />,
        },
        {
            name: t("nav.upgrade"),
            path: "/upgrade",
            icon: <GiUpgrade className="text-2xl" />,
        },
        {
            name: t("nav.slots"),
            path: "/slot",
            icon: <FaDice className="text-2xl" />,
        },
        {
            name: t("nav.mines"),
            path: "/mines",
            icon: <GiMineExplosion className="text-2xl" />,
        },
        {
            name: t("nav.rewards"),
            path: "/rewards",
            icon: <FaGift className="text-2xl" />,
        }
    ];

    return (
        <div className="fixed top-0 left-0 bg-black bg-opacity-50 z-[100]">
            <div className="bg-[#1a1813] p-4  w-screen min-h-[100vh]">
                <div className="flex flex-col">
                    <div className="flex justify-between">
                        <div
                            className="flex items-center gap-3 justify-center"
                        >
                            <img
                                src="/images/logo-crixus-v2.jpg"
                                alt="Crixus Games"
                                className="w-14 h-14 object-cover rounded-full border-2 border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                            />
                            <div className="font-bold text-xl bg-gradient-to-r from-[#ffe9a8] via-[#d4af37] to-[#8a7f63] bg-clip-text text-transparent tracking-wide">
                                Crixus Games
                            </div>
                        </div>
                        <button onClick={closeSidebar} className="bg-transparent">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div className="mt-8">

                        <div className="text-[#e0b341] py-1 font-semibold">
                            Saldo:{" "}
                            <Monetary value={Math.floor(userData?.walletBalance || 0)} />
                        </div>

                        <ClaimBonus bonusDate={userData?.nextBonus} userData={userData} />
                    </div>
                    <div className="flex flex-col space-y-4 mt-6">
                        {links.map((link, index) => (
                            <Link key={index} to={link.path} onClick={closeSidebar}>
                                <div className="flex items-center gap-4 p-2 text-white hover:text-[#ffe9a8] transition-colors">
                                    <span className="text-[#e0b341]">{link.icon}</span>
                                    <p className="font-medium">{link.name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Sidebar;

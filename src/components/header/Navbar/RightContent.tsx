import React, { useEffect, useState } from "react"
import Avatar from "../../Avatar";
import { FaRegBell } from "react-icons/fa";
import { FaRegBellSlash } from "react-icons/fa";
import ClaimBonus from "../ClaimBonus";
import { IoMdExit } from "react-icons/io";
import { BiWallet } from "react-icons/bi";
import AnimatedBalance from "../../AnimatedBalance";
import XpBar from "../../XpBar";
import { User } from '../../../components/Types';

interface RightContentProps {
    loading: boolean;
    userData: User;
    openNotifications: boolean;
    setOpenNotifications: React.Dispatch<React.SetStateAction<boolean>>;
    Logout: () => void;
}

const RightContent: React.FC<RightContentProps> = ({ loading, userData, openNotifications, setOpenNotifications, Logout }) => {
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)
    const isMobile = window.innerWidth <= 768

    useEffect(() => {
        if (userData?.hasUnreadNotifications) {
            setHasUnreadNotifications(true)
        }
    }, [userData?.hasUnreadNotifications])

    useEffect(() => {
        if (openNotifications) {
            setHasUnreadNotifications(false)
        }
    }, [openNotifications])

    return (
        <div className="flex items-center gap-4">
            <div className="hidden md:flex ">
                {
                    !loading && (
                        //button to claim bonus 
                        <ClaimBonus bonusDate={userData?.nextBonus} userData={userData} />
                    )
                }
            </div>

            {!loading && (
                <div className="flex items-center gap-2 text-green-400 font-semibold text-lg hover:text-green-300 transition-all px-3 py-1 rounded-full bg-black/30 border border-green-500/20">
                    <BiWallet className="text-2xl hidden md:block " />
                    <div className="max-w-[90px] md:max-w-[160px] text-sm md:text-lg ">
                        <AnimatedBalance value={Math.floor(userData?.walletBalance)} />
                    </div>
                </div>
            )}

            {!loading && userData && (
                <div className="hidden lg:block">
                    <XpBar xp={userData.xp} level={userData.level} />
                </div>
            )}

            <div className="relative cursor-pointer" onClick={() => setOpenNotifications(!openNotifications)}
            >
                {
                    openNotifications ? (
                        <div>
                            <FaRegBellSlash style={{
                                fontSize: "20px",
                            }} />
                        </div>) : (
                        <div>
                            <FaRegBell style={{
                                width: "20px",
                            }} />
                        </div>)
                }
                {
                    hasUnreadNotifications && !openNotifications && (
                        <div className="absolute -top-1 -right-[2px] w-3 h-3 bg-red-500 rounded-full " />
                    )

                }
            </div>
            <Avatar image={userData?.profilePicture} loading={loading} id={userData?.id} size={isMobile ? "small" : "medium"} level={userData?.level} showLevel={true} />
            <div
                className="text-[#8a7f63] font-normal text-lg cursor-pointer hover:text-gray-200 transition-all "
                onClick={Logout}
            >
                <IoMdExit className="text-2xl" />
            </div>
        </div>
    )
}

export default RightContent

import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import Login from "./Login";
import SignUp from "./SignUp";
import "./UserFlow.css";
import UserContext from "../../../UserContext";
import Modal from "../../Modal";
import { getStoredReferral } from "../../../utils/referral";

const UserFlow: React.FC = () => {
  // Default to SignUp when visitor arrived via a referral link (?ref=...)
  const [isLogin, setIsLogin] = useState<boolean>(() => !getStoredReferral());
  const { toogleUserFlow } = useContext(UserContext);
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  return (
    <Modal open={true} setOpen={toogleUserFlow} width="440px">
      <div className="flex flex-col gap-5 pt-1">
        {/* Imperial Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <img
            src="/images/logo-crixus-v2.jpg"
            alt="Crixus Games"
            className="w-14 h-14 rounded-full object-cover border-2 border-[#d4af37]/70 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          />
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-[0.18em] gold-text">
              Crixus Games
            </h2>
            <p className="text-xs text-[#9b8d6f] mt-0.5">
              {isLogin
                ? t("auth.signInTitle")
                : es
                  ? "Creá tu cuenta gratis y recibí $700 de bienvenida"
                  : "Create your free account & get $700 welcome bonus"}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0e0b08] border border-[#2f2518]">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              isLogin
                ? "bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] text-[#1a1204] shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                : "text-[#b9a77a] hover:text-[#ffe9a8]"
            }`}
          >
            {t("auth.signIn")}
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              !isLogin
                ? "bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] text-[#1a1204] shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                : "text-[#b9a77a] hover:text-[#ffe9a8]"
            }`}
          >
            {t("auth.signUp")}
          </button>
        </div>

        {/* Active Form */}
        {isLogin ? <Login /> : <SignUp />}
      </div>
    </Modal>
  );
};

export default UserFlow;

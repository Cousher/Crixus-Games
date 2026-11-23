import React, { useContext, useState } from "react";
import { register } from "../../../services/auth/auth";
import MainButton from "../../MainButton";
import UserContext from "../../../UserContext";
import { useTranslation } from "react-i18next";
import { translateApiMessage } from "../../../services/apiMessageI18n";
import { clearStoredReferral, getStoredReferral } from "../../../utils/referral";

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const pendingRef = getStoredReferral();

  const { toggleLogin } = useContext(UserContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, nickname, null);
      clearStoredReferral();
      toggleLogin();
    } catch (err) {
      setError(
        translateApiMessage(err, translateApiMessage("Invalid format. Please try again."))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {pendingRef && (
        <div className="px-3.5 py-2.5 rounded-xl bg-[#2a200d] border border-[#d4af37]/50 text-[#ffe9a8] text-xs font-semibold text-center">
          {es
            ? `🏛️ Invitado por @${pendingRef} — llegá a Nivel 3 y cobrá +$500 extra`
            : `🏛️ Invited by @${pendingRef} — reach Level 3 for +$500 bonus`}
        </div>
      )}

      {error && (
        <div className="px-3.5 py-2.5 rounded-xl bg-red-950/50 border border-red-500/45 text-red-200 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-nickname"
          className="text-[11px] font-bold uppercase tracking-wider text-[#b9a77a]"
        >
          {t("auth.nickname")}
        </label>
        <input
          id="signup-nickname"
          name="nickname"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={24}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={es ? "Ej: GladiadorAR" : "e.g. GladiatorAR"}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0c08] border border-[#3a2f1d] focus:border-[#d4af37] text-sm text-[#f5ead4] placeholder-[#6c604d] outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-email"
          className="text-[11px] font-bold uppercase tracking-wider text-[#b9a77a]"
        >
          {t("auth.email")}
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="gladiador@email.com"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0c08] border border-[#3a2f1d] focus:border-[#d4af37] text-sm text-[#f5ead4] placeholder-[#6c604d] outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-password"
          className="text-[11px] font-bold uppercase tracking-wider text-[#b9a77a]"
        >
          {t("auth.password")}
        </label>
        <div className="relative">
          <input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={es ? "Mínimo 6 caracteres" : "At least 6 characters"}
            className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-[#0f0c08] border border-[#3a2f1d] focus:border-[#d4af37] text-sm text-[#f5ead4] placeholder-[#6c604d] outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-[#d4af37] hover:text-[#ffe9a8] cursor-pointer"
          >
            {showPassword ? (es ? "Ocultar" : "Hide") : es ? "Mostrar" : "Show"}
          </button>
        </div>
      </div>

      <div className="pt-1">
        <MainButton
          text={t("auth.signUp")}
          onClick={() => {}}
          disabled={loading}
          loading={loading}
          type="success"
          submit
        />
      </div>
    </form>
  );
};

export default SignUpPage;

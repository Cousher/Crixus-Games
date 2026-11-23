import React, { useContext, useState } from "react";
import { login, googleLogin } from "../../../services/auth/auth";
import MainButton from "../../MainButton";
import UserContext from "../../../UserContext";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { translateApiMessage } from "../../../services/apiMessageI18n";
import { clearStoredReferral } from "../../../utils/referral";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingButton, setLoadingButton] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toggleLogin } = useContext(UserContext);
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoadingButton(true);
    try {
      await login(email, password);
      toggleLogin();
    } catch (error) {
      setErrorMessage(translateApiMessage(error, t("auth.invalid")));
    } finally {
      setLoadingButton(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setErrorMessage("");
    try {
      const data = await googleLogin(credentialResponse.credential);
      if (data?.authenticated || data?.token) {
        clearStoredReferral();
        toggleLogin();
      }
    } catch (error) {
      setErrorMessage(
        translateApiMessage(
          error,
          es ? "Error al iniciar sesión con Google" : "Error during Google sign-in"
        )
      );
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {errorMessage && (
        <div className="px-3.5 py-2.5 rounded-xl bg-red-950/50 border border-red-500/45 text-red-200 text-xs font-semibold text-center">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-email"
          className="text-[11px] font-bold uppercase tracking-wider text-[#b9a77a]"
        >
          {t("auth.email")}
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="gladiador@email.com"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0c08] border border-[#3a2f1d] focus:border-[#d4af37] text-sm text-[#f5ead4] placeholder-[#6c604d] outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-password"
          className="text-[11px] font-bold uppercase tracking-wider text-[#b9a77a]"
        >
          {t("auth.password")}
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
          text={t("auth.signIn")}
          onClick={() => {}}
          disabled={loadingButton}
          loading={loadingButton}
          submit
        />
      </div>

      <div className="flex items-center gap-3 my-1">
        <span className="h-[1px] flex-1 bg-[#2c2318]" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a7f63] font-bold">
          {es ? "o continuá con" : "or continue with"}
        </span>
        <span className="h-[1px] flex-1 bg-[#2c2318]" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleLoginSuccess}
          onError={() =>
            setErrorMessage(
              es ? "No se pudo iniciar sesión con Google" : "Google sign-in failed"
            )
          }
          theme="filled_black"
          shape="pill"
        />
      </div>
    </form>
  );
};

export default LoginPage;

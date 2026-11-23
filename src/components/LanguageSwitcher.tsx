import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = (i18n.language || "es").startsWith("en") ? "en" : "es";
  const change = (lng: string) => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem("lang", lng);
    } catch {
      /* ignore */
    }
  };

  return (
    <select
      value={current}
      onChange={(e) => change(e.target.value)}
      className="shrink-0 h-9 bg-[#17120c] hover:bg-[#221a10] text-[#ffe9a8] text-xs font-bold uppercase tracking-wider border border-[#d4af37]/35 hover:border-[#d4af37]/70 rounded-full px-2.5 cursor-pointer focus:outline-none focus:border-[#ffd966] transition-colors"
      aria-label="Language"
    >
      <option value="es" className="bg-[#14100b] text-white">
        ES
      </option>
      <option value="en" className="bg-[#14100b] text-white">
        EN
      </option>
    </select>
  );
};

export default LanguageSwitcher;

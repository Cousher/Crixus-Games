import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = (i18n.language || "es").startsWith("en") ? "en" : "es";
  const change = (lng: string) => {
    i18n.changeLanguage(lng);
    try { localStorage.setItem("lang", lng); } catch (e) { /* ignore */ }
  };
  return (
    <select
      value={current}
      onChange={(e) => change(e.target.value)}
      className="bg-[#1a1813] text-white text-xs border border-[#2a2747] rounded px-2 py-1 cursor-pointer focus:outline-none"
      aria-label="Language"
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  );
};

export default LanguageSwitcher;

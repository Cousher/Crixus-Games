import { useContext } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaGift, FaRocket, FaCrown } from "react-icons/fa";
import UserContext from "../../UserContext";
import { levelProgress } from "../../utils/levels";

/**
 * Hero + quick actions. On mobile it replaces the (desktop-only) banner
 * carousel; on desktop it sits right under it as a call-to-action strip.
 */
const HomeHero = () => {
  const { t } = useTranslation();
  const { isLogged, userData, toogleUserFlow } = useContext(UserContext);
  const pct = userData ? Math.round(levelProgress(userData.xp, userData.level) * 100) : 0;

  const cards = [
    {
      key: "play",
      to: "/crash",
      icon: <FaRocket />,
      title: t("ux.heroPlayTitle"),
      text: t("ux.heroPlayText"),
      accent: "from-[#9b1c1c] to-[#5a0f0f]",
    },
    {
      key: "rewards",
      to: "/rewards",
      icon: <FaGift />,
      title: t("ux.heroRewardsTitle"),
      text: t("ux.heroRewardsText"),
      accent: "from-[#b8901f] to-[#5c470f]",
    },
    {
      key: "level",
      to: userData ? `/profile/${userData.id}` : "/rewards",
      icon: <FaCrown />,
      title: userData ? t("ux.heroLevelTitle", { level: userData.level }) : t("ux.heroLevelTitleGuest"),
      text: userData ? t("ux.heroLevelText", { pct }) : t("ux.heroLevelTextGuest"),
      accent: "from-[#1d4ed8] to-[#172554]",
      progress: userData ? pct : null,
    },
  ];

  return (
    <section className="w-full flex justify-center px-4 mt-2 md:-mt-10 relative z-10">
      <div className="w-full max-w-7xl flex flex-col gap-4">
        {/* mobile-only hero headline */}
        <div className="md:hidden relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#3b0d0d] via-[#1a1813] to-[#0e0e12] p-6 text-center">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#d4af37]/20 blur-3xl" />
          <img src="/images/logo-emblem.webp" alt="Crixus" className="w-20 h-20 mx-auto mb-2 rounded-full drop-shadow-[0_0_14px_rgba(212,175,55,0.6)]" />
          <h1 className="text-3xl font-black tracking-wider gold-text">CRIXUS GAMES</h1>
          <p className="text-sm text-[#e7ddc8] mt-1">{t("ux.heroSubtitle")}</p>
          {!isLogged && (
            <button
              onClick={() => toogleUserFlow(true)}
              className="mt-4 w-full py-3 rounded-full bg-gradient-to-r from-[#b8901f] to-[#ffd966] text-black font-extrabold tracking-wide shadow-[0_0_24px_rgba(212,175,55,0.5)] cta-pulse"
            >
              {t("ux.heroSignup")}
            </button>
          )}
        </div>

        {/* quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {cards.map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className={`group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${c.accent} p-4 flex items-center gap-4 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300`}
            >
              <span className="game-card-shine" aria-hidden="true" />
              <div className="w-12 h-12 shrink-0 rounded-full bg-black/30 border border-white/20 flex items-center justify-center text-2xl text-[#ffd966] group-hover:scale-110 transition-transform">
                {c.icon}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-extrabold text-white leading-tight">{c.title}</span>
                <span className="text-xs text-white/75 truncate">{c.text}</span>
                {c.progress !== undefined && c.progress !== null && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                    <div className="xp-fill h-full rounded-full" style={{ width: `${Math.max(4, c.progress)}%` }} />
                  </div>
                )}
              </div>
              <span className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeHero;

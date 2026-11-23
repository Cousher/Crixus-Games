import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FaGift, FaFire, FaCrown, FaChevronLeft, FaChevronRight, FaPlay } from "react-icons/fa";
import UserContext from "../../UserContext";
import { levelProgress } from "../../utils/levels";

interface HeroSlide {
  id: string;
  badgeEs: string;
  badgeEn: string;
  titleEs: string;
  titleEn: string;
  descEs: string;
  descEn: string;
  ctaEs: string;
  ctaEn: string;
  to: string;
  bgStyle: string;
  bgImg?: string;
  visual: "road" | "crash" | "slot";
}

const SLIDES: HeroSlide[] = [
  {
    id: "road",
    badgeEs: "NUEVO JUEGO · HASTA x450",
    badgeEn: "NEW GAME · UP TO x450",
    titleEs: "CAMINO DEL GLADIADOR",
    titleEn: "GLADIATOR ROAD",
    descEs: "Esquivá las trampas de fuego del Coliseo paso a paso y alcanzá el Cofre Imperial con 98% RTP.",
    descEn: "Dodge the Colosseum fire traps step by step and reach the Imperial Chest with 98% RTP.",
    ctaEs: "Jugar Camino",
    ctaEn: "Play Road",
    to: "/road",
    bgStyle:
      "radial-gradient(65% 80% at 78% 50%, rgba(234,88,12,0.32), transparent 68%), radial-gradient(50% 60% at 20% 20%, rgba(212,175,55,0.18), transparent 65%), linear-gradient(135deg, #1b110a 0%, #110c09 55%, #240c0d 100%)",
    visual: "road",
  },
  {
    id: "crash",
    badgeEs: "EN VIVO · CARRUAJE IMPERIAL",
    badgeEn: "LIVE · IMPERIAL CHARIOT",
    titleEs: "CRIXUS CRASH",
    titleEn: "CRIXUS CRASH",
    descEs: "Subite al carruaje dorado, multiplicá tu apuesta en tiempo real y retirá antes de la explosión.",
    descEn: "Ride the golden chariot, multiply your stake in real time and cash out before it explodes.",
    ctaEs: "Volar en Crash",
    ctaEn: "Play Crash",
    to: "/crash",
    bgStyle:
      "radial-gradient(60% 75% at 75% 45%, rgba(192,38,45,0.35), transparent 70%), linear-gradient(135deg, #120918 0%, #170d12 55%, #2a1012 100%)",
    bgImg: "/images/crash/arena_sky.jpg",
    visual: "crash",
  },
  {
    id: "slot",
    badgeEs: "JACKPOT HASTA x500",
    badgeEn: "JACKPOT UP TO x500",
    titleEs: "FORTUNA DEL COLISEO",
    titleEn: "COLOSSEUM SLOTS",
    descEs: "Alineá reliquias romanas y el comodín León Dorado en 5 líneas ganadoras para premios épicos.",
    descEn: "Match Roman relics and the Golden Lion Wild across 5 paylines for imperial payouts.",
    ctaEs: "Girar Rodillos",
    ctaEn: "Spin Slots",
    to: "/slot",
    bgStyle:
      "radial-gradient(65% 80% at 75% 50%, rgba(212,175,55,0.3), transparent 68%), linear-gradient(135deg, #1c1509 0%, #110d08 55%, #23190b 100%)",
    visual: "slot",
  },
];

const HomeHero = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { isLogged, userData, toogleUserFlow } = useContext(UserContext);
  const [slideIdx, setSlideIdx] = useState(0);

  const pct = userData ? Math.round(levelProgress(userData.xp, userData.level) * 100) : 0;

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % SLIDES.length);
    }, 6500);
    return () => clearInterval(id);
  }, []);

  const current = SLIDES[slideIdx];

  const cards = [
    {
      key: "road",
      to: "/road",
      icon: <FaFire />,
      title: es ? "Nuevo: Camino del Gladiador" : "New: Gladiator Road",
      text: es ? "Esquivá las llamas hasta x450" : "Dodge the flames up to x450",
      border: "border-[#c0262d]/45 hover:border-[#ff6b6b]",
      bg: "from-[#2d1012] via-[#1c0d0e] to-[#110a0a]",
      iconBg: "bg-[#c0262d]/25 text-[#ff8a93] border-[#e63946]/40",
    },
    {
      key: "rewards",
      to: "/rewards",
      icon: <FaGift />,
      title: t("ux.heroRewardsTitle"),
      text: t("ux.heroRewardsText"),
      border: "border-[#d4af37]/45 hover:border-[#ffd966]",
      bg: "from-[#2c210d] via-[#1b1409] to-[#100c07]",
      iconBg: "bg-[#d4af37]/20 text-[#ffe9a8] border-[#d4af37]/45",
    },
    {
      key: "level",
      to: userData ? `/profile/${userData.id}` : "/rewards",
      icon: <FaCrown />,
      title: userData ? t("ux.heroLevelTitle", { level: userData.level }) : t("ux.heroLevelTitleGuest"),
      text: userData ? t("ux.heroLevelText", { pct }) : t("ux.heroLevelTextGuest"),
      border: "border-[#a67e1c]/40 hover:border-[#ffe9a8]",
      bg: "from-[#231b10] via-[#16110b] to-[#0e0b08]",
      iconBg: "bg-[#d4af37]/15 text-[#ffd966] border-[#d4af37]/35",
      progress: userData ? pct : null,
    },
  ];

  const renderVisual = (type: HeroSlide["visual"]) => {
    if (type === "road") {
      return (
        <div className="relative flex items-center justify-center w-full h-full">
          <div className="absolute w-44 h-44 sm:w-60 sm:h-60 rounded-full bg-orange-500/25 blur-3xl pointer-events-none" />
          <img
            src="/images/road/gladiator.webp"
            alt="Crixus Gladiator"
            className="road-hero-idle relative z-20 w-36 h-36 sm:w-52 sm:h-52 md:w-60 md:h-60 object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.85)]"
          />
          <img
            src="/images/cases/legendaria.webp"
            alt="Imperial Chest"
            className="relative z-10 -ml-6 mt-12 w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-[0_12px_20px_rgba(255,215,0,0.45)]"
          />
        </div>
      );
    }

    if (type === "crash") {
      return (
        <div className="relative flex items-center justify-center w-full h-full">
          <div className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-[#d4af37]/25 blur-3xl pointer-events-none" />
          <img
            src="/images/crash/gold_shield.png"
            alt=""
            className="absolute right-6 top-2 w-24 h-24 sm:w-32 sm:h-32 object-contain opacity-90 drop-shadow-[0_0_20px_rgba(212,175,55,0.55)]"
          />
          <img
            src="/images/crash/chariot_sprite.png"
            alt="Crixus Crash"
            className="crash-float relative z-20 w-44 sm:w-64 md:w-72 object-contain drop-shadow-[0_16px_26px_rgba(0,0,0,0.85)]"
          />
        </div>
      );
    }

    return (
      <div className="relative flex items-center justify-center gap-2 sm:gap-3 w-full h-full">
        <div className="absolute w-52 h-52 rounded-full bg-[#d4af37]/25 blur-3xl pointer-events-none" />
        <img
          src="/images/slot/hakkero.webp"
          alt=""
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-2 border-[#d4af37]/60 shadow-2xl -rotate-6 object-cover"
        />
        <img
          src="/images/slot/wild.webp"
          alt="Golden Lion Wild"
          className="road-hero-idle relative z-20 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-2 border-[#ffe9a8] shadow-[0_0_32px_rgba(255,215,0,0.55)] object-cover"
        />
        <img
          src="/images/slot/green.webp"
          alt=""
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-2 border-[#d4af37]/60 shadow-2xl rotate-6 object-cover"
        />
      </div>
    );
  };

  return (
    <section className="w-full flex justify-center px-3 sm:px-4 pt-2 pb-4 relative z-10">
      <div className="w-full max-w-[1440px] flex flex-col gap-4">
        {/* Imperial Showcase Carousel Banner (Desktop + Mobile) */}
        <div className="relative w-full rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 shadow-[0_28px_70px_-15px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,233,168,0.16)] bg-[#110d09]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0.25 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.25 }}
              transition={{ duration: 0.4 }}
              className="relative w-full min-h-[300px] sm:min-h-[340px] md:min-h-[370px] flex flex-col md:flex-row items-center justify-between gap-6 px-5 sm:px-10 md:px-14 py-7 sm:py-9 overflow-hidden"
              style={{ background: current.bgStyle }}
            >
              {/* Optional subtle atmospheric background photo */}
              {current.bgImg && (
                <img
                  src={current.bgImg}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity pointer-events-none select-none"
                />
              )}

              {/* Subtle Crixus emblem watermark */}
              <div
                className="absolute -left-16 -bottom-16 w-72 h-72 opacity-[0.06] pointer-events-none bg-contain bg-no-repeat"
                style={{ backgroundImage: 'url("/images/logo-emblem.webp")' }}
              />

              {/* Left Text & CTAs */}
              <div className="relative z-20 flex flex-col items-center md:items-start text-center md:text-left max-w-xl gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120d06]/85 border border-[#d4af37]/55 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#ffe9a8] shadow">
                  <FaCrown className="text-[#ffd966] text-[10px]" />
                  {es ? current.badgeEs : current.badgeEn}
                </span>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-[0.08em] leading-tight gold-text">
                  {es ? current.titleEs : current.titleEn}
                </h1>

                <p className="text-xs sm:text-sm md:text-base text-[#dfd3bc] leading-relaxed max-w-lg">
                  {es ? current.descEs : current.descEn}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 w-full sm:w-auto">
                  <Link
                    to={current.to}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-[0.14em] text-xs sm:text-sm text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] border border-[#fff2c2]/70 shadow-[0_8px_26px_rgba(212,175,55,0.4)] transition-all active:scale-[0.98]"
                  >
                    <FaPlay className="text-[11px]" />
                    <span>{es ? current.ctaEs : current.ctaEn}</span>
                  </Link>

                  {!isLogged && (
                    <button
                      type="button"
                      onClick={() => toogleUserFlow(true)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold uppercase tracking-[0.12em] text-xs sm:text-sm text-[#ffe9a8] bg-[#1a1309]/85 hover:bg-[#2a1f0e] border border-[#d4af37]/55 transition-all"
                    >
                      {t("ux.heroSignup")}
                    </button>
                  )}
                </div>
              </div>

              {/* Right Visual Stage */}
              <div className="relative z-20 w-full md:w-[44%] h-[175px] sm:h-[230px] md:h-[270px] flex items-center justify-center shrink-0">
                {renderVisual(current.visual)}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Carousel Prev / Next Controls (Desktop) */}
          <button
            type="button"
            onClick={() => setSlideIdx((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
            aria-label="Anterior"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 border border-[#d4af37]/40 text-[#ffe9a8] items-center justify-center transition-all"
          >
            <FaChevronLeft className="text-xs" />
          </button>
          <button
            type="button"
            onClick={() => setSlideIdx((prev) => (prev + 1) % SLIDES.length)}
            aria-label="Siguiente"
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 border border-[#d4af37]/40 text-[#ffe9a8] items-center justify-center transition-all"
          >
            <FaChevronRight className="text-xs" />
          </button>

          {/* Slide Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlideIdx(idx)}
                aria-label={s.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === slideIdx
                    ? "w-7 bg-[#ffd966] shadow-[0_0_10px_rgba(255,217,102,0.8)]"
                    : "w-2 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Quick Action Imperial Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {cards.map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className={`group relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-4 flex items-center gap-3.5 hover:-translate-y-1 shadow-[0_12px_30px_rgba(0,0,0,0.55)] transition-all duration-300`}
            >
              <span className="game-card-shine" aria-hidden="true" />
              <div
                className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center text-xl group-hover:scale-110 transition-transform ${c.iconBg}`}
              >
                {c.icon}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-extrabold text-sm sm:text-base text-[#f5efe0] group-hover:text-[#ffe9a8] transition-colors leading-tight truncate">
                  {c.title}
                </span>
                <span className="text-xs text-[#b9a77a] truncate mt-0.5">{c.text}</span>
                {c.progress !== undefined && c.progress !== null && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-black/50 border border-[#d4af37]/20 overflow-hidden">
                    <div className="xp-fill h-full rounded-full" style={{ width: `${Math.max(4, c.progress)}%` }} />
                  </div>
                )}
              </div>
              <span className="text-[#d4af37]/70 group-hover:text-[#ffe9a8] group-hover:translate-x-1 transition-all font-bold">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeHero;

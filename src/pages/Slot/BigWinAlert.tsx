import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import { motion, AnimatePresence } from "framer-motion";
import sound from "../../services/sound";

interface BigWinAlertProps {
  value: number;
  betAmount?: number;
  onClose?: () => void;
}

const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const radius = 140 + (i % 3) * 48;
  return {
    id: i,
    tx: Math.cos(angle) * radius,
    ty: Math.sin(angle) * radius,
    size: 4 + (i % 3) * 3,
    delay: (i % 5) * 0.09,
  };
});

const BigWinAlert: React.FC<BigWinAlertProps> = ({ value, betAmount = 1, onClose }) => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const [animatedValue, setAnimatedValue] = useState(0);

  const safeBet = Math.max(1, betAmount);
  const multiplier = value / safeBet;
  const currentMult = animatedValue / safeBet;

  // Dynamic tier escalation as the counter climbs (Pragmatic / Hacksaw style)
  const tier =
    currentMult >= 100
      ? {
          label: es ? "¡JACKPOT IMPERIAL!" : "IMPERIAL JACKPOT!",
          accent: "#fff7cc",
          ring: "border-[#fff2b2] shadow-[0_0_100px_rgba(255,215,0,0.75),inset_0_2px_18px_rgba(255,245,200,0.35)]",
        }
      : currentMult >= 50
      ? {
          label: es ? "¡SÚPER VICTORIA!" : "SUPER WIN!",
          accent: "#ffe680",
          ring: "border-[#ffd966] shadow-[0_0_90px_rgba(255,190,40,0.65),inset_0_2px_16px_rgba(255,233,168,0.28)]",
        }
      : currentMult >= 20
      ? {
          label: es ? "¡MEGA VICTORIA!" : "MEGA WIN!",
          accent: "#ffd966",
          ring: "border-[#e6b83a] shadow-[0_0_80px_rgba(212,175,55,0.55),inset_0_2px_14px_rgba(255,233,168,0.22)]",
        }
      : {
          label: es ? "¡GRAN VICTORIA!" : "BIG WIN!",
          accent: "#f7d36a",
          ring: "border-[#d4af37] shadow-[0_0_70px_rgba(212,175,55,0.45),inset_0_2px_12px_rgba(255,233,168,0.2)]",
        };

  useEffect(() => {
    let rafId = 0;
    const duration = multiplier >= 50 ? 2400 : multiplier >= 20 ? 2000 : 1600;
    let startTime = 0;
    let lastCoinTick = 0;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(value * eased);

      if (progress < 0.96 && now - lastCoinTick > 220) {
        lastCoinTick = now;
        sound.play("tick", 1 + progress * 4);
      }

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setAnimatedValue(value);
      }
    };

    const delayTimer = setTimeout(() => {
      rafId = requestAnimationFrame(tick);
    }, 220);

    return () => {
      clearTimeout(delayTimer);
      cancelAnimationFrame(rafId);
    };
  }, [value, multiplier]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-md p-4 cursor-pointer select-none overflow-hidden"
      >
        {/* Rotating Imperial Golden Sunburst */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          className="absolute w-[700px] h-[700px] md:w-[960px] md:h-[960px] rounded-full pointer-events-none opacity-40"
          style={{
            background:
              "repeating-conic-gradient(from 0deg, rgba(255,215,70,0.48) 0deg 10deg, transparent 10deg 22deg)",
            maskImage: "radial-gradient(circle, black 18%, transparent 66%)",
            WebkitMaskImage: "radial-gradient(circle, black 18%, transparent 66%)",
          }}
        />

        {/* Radial Golden Ember Sparks */}
        <div className="absolute left-1/2 top-1/2 pointer-events-none">
          {SPARKS.map((s) => (
            <motion.span
              key={s.id}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: [0, s.tx],
                y: [0, s.ty],
                opacity: [0, 1, 0],
                scale: [0.4, 1.3, 0.2],
              }}
              transition={{
                duration: 1.5,
                delay: s.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{ width: s.size, height: s.size }}
              className="absolute rounded-full bg-[#ffe999] shadow-[0_0_12px_#ffd966]"
            />
          ))}
        </div>

        {/* Central Celebration Card */}
        <motion.div
          initial={{ scale: 0.42, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.72, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 17 }}
          className={`relative z-10 flex flex-col items-center text-center px-8 py-8 md:px-14 md:py-10 rounded-3xl bg-gradient-to-b from-[#2f220e]/95 via-[#18120a]/96 to-[#0d0904]/96 border-2 transition-shadow duration-300 max-w-[92vw] ${tier.ring}`}
        >
          {/* Golden Lion Crest */}
          <motion.div
            animate={{ scale: [1, 1.09, 1], rotate: [-2, 2, -2] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 bg-gradient-to-b from-[#fff7cc] via-[#ffd966] to-[#7a5b14] shadow-[0_0_40px_rgba(255,215,0,0.75)] -mt-16 md:-mt-20 mb-4"
          >
            <img
              src="/images/slot/wild.webp"
              alt="Golden Lion"
              className="w-full h-full rounded-full object-cover"
            />
          </motion.div>

          <span className="px-3.5 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#ffe9a8]/60 text-[#fff3c4] text-xs font-black font-mono tracking-[0.22em] uppercase mb-2">
            {multiplier.toFixed(1).replace(/\.0$/, "")}x
          </span>

          <motion.h2
            key={tier.label}
            initial={{ scale: 0.85, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
            className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-[0.14em] gold-text"
          >
            {tier.label}
          </motion.h2>

          <div
            className="mt-4 text-5xl sm:text-6xl md:text-7xl font-black font-mono tabular-nums"
            style={{
              color: tier.accent,
              textShadow:
                "0 4px 22px rgba(212,175,55,0.9), 0 2px 0 #7a5b14, 0 0 42px rgba(255,180,0,0.5)",
            }}
          >
            <Monetary value={animatedValue} showFraction={value % 1 !== 0} />
          </div>

          <div className="mt-5" onClick={(e) => e.stopPropagation()}>
            <ShareWinButton
              gameName={es ? "Fortuna del Coliseo" : "Colosseum Slots"}
              multiplier={multiplier}
              payout={value}
            />
          </div>

          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#b9a77a]/85 animate-pulse">
            {es ? "Tocá en cualquier lugar para continuar" : "Click anywhere to continue"}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BigWinAlert;

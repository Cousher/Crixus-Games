import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const COLORS = ["#d4af37", "#ffd966", "#ff4d4d", "#4ade80", "#60a5fa", "#ffffff"];

/** Lightweight CSS confetti burst (no extra dependency). */
export const Confetti: React.FC<{ pieces?: number }> = ({ pieces = 90 }) => {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 200,
        round: Math.random() > 0.6,
      })),
    [pieces]
  );
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]" aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as any]: `${p.drift}px`,
            ["--rot" as any]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
};

interface LevelUpProps {
  level: number | null;
  onClose: () => void;
}

/** Full-screen celebration shown when the player reaches a new level. */
const LevelUpCelebration: React.FC<LevelUpProps> = ({ level, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reward = level ? 500 + 250 * level : 0; // mirrors backend/utils/missions.js levelReward

  useEffect(() => {
    if (level === null) return;
    const id = setTimeout(onClose, 6000);
    return () => clearTimeout(id);
  }, [level, onClose]);

  return createPortal(
    <AnimatePresence>
      {level !== null && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Confetti />
          <motion.div
            className="relative flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#2a2112] to-[#0e0e12] shadow-[0_0_80px_rgba(212,175,55,0.45)] text-center"
            initial={{ scale: 0.4, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs tracking-[0.4em] text-[#b9a77a]">{t("ux.levelUp")}</div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl bg-[#d4af37]/40 animate-pulse" />
              <div className="relative w-28 h-28 rounded-full border-4 border-[#d4af37] flex items-center justify-center bg-[#1a1813] text-5xl font-black text-[#ffd966] gold-text">
                {level}
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">{t("ux.levelReached", { level })}</div>
            <div className="text-sm text-[#d6c79f]">
              {t("ux.levelRewardReady")} <span className="text-green-400 font-bold">+${reward.toLocaleString()}</span>
            </div>
            <button
              className="mt-2 px-6 py-2 rounded-full bg-gradient-to-r from-[#b8901f] to-[#ffd966] text-black font-bold hover:scale-105 transition-transform"
              onClick={() => {
                onClose();
                navigate("/rewards");
              }}
            >
              {t("ux.claimReward")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LevelUpCelebration;

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import { motion, AnimatePresence } from "framer-motion";

interface BigWinAlertProps {
    value: number;
    betAmount?: number;
    onClose?: () => void;
}

const BigWinAlert: React.FC<BigWinAlertProps> = ({ value, betAmount = 1, onClose }) => {
    const { i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");
    const [animatedValue, setAnimatedValue] = useState(0);

    const multiplier = betAmount > 0 ? value / betAmount : 8;
    const tierLabel =
        multiplier >= 50
            ? es
                ? "¡JACKPOT IMPERIAL!"
                : "IMPERIAL JACKPOT!"
            : multiplier >= 20
                ? es
                    ? "¡MEGA VICTORIA!"
                    : "MEGA WIN!"
                : es
                    ? "¡GRAN VICTORIA!"
                    : "BIG WIN!";

    useEffect(() => {
        let rafId = 0;
        const duration = 1600;
        const startTime = performance.now();

        const tick = (now: number) => {
            const progress = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedValue(value * eased);
            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                setAnimatedValue(value);
            }
        };

        const delayTimer = setTimeout(() => {
            rafId = requestAnimationFrame(tick);
        }, 250);

        return () => {
            clearTimeout(delayTimer);
            cancelAnimationFrame(rafId);
        };
    }, [value]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-pointer select-none overflow-hidden"
            >
                {/* Rotating Imperial Golden Sunburst */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[680px] h-[680px] md:w-[900px] md:h-[900px] rounded-full pointer-events-none opacity-35"
                    style={{
                        background:
                            "repeating-conic-gradient(from 0deg, rgba(212,175,55,0.45) 0deg 10deg, transparent 10deg 25deg)",
                        maskImage: "radial-gradient(circle, black 20%, transparent 68%)",
                        WebkitMaskImage: "radial-gradient(circle, black 20%, transparent 68%)",
                    }}
                />

                {/* Central Celebration Card */}
                <motion.div
                    initial={{ scale: 0.4, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                    className="relative z-10 flex flex-col items-center text-center px-8 py-8 md:px-12 md:py-10 rounded-3xl bg-gradient-to-b from-[#2b2110]/95 via-[#18120a]/95 to-[#0e0a05]/95 border-2 border-[#d4af37] shadow-[0_0_80px_rgba(212,175,55,0.45),inset_0_2px_12px_rgba(255,233,168,0.2)] max-w-[92vw]"
                >
                    {/* Golden Lion Crest */}
                    <motion.div
                        animate={{ scale: [1, 1.07, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 bg-gradient-to-b from-[#fff2c2] via-[#d4af37] to-[#7a5b14] shadow-[0_0_35px_rgba(255,215,0,0.65)] -mt-16 md:-mt-20 mb-4"
                    >
                        <img
                            src="/images/slot/wild.webp"
                            alt="Golden Lion"
                            className="w-full h-full rounded-full object-cover"
                        />
                    </motion.div>

                    <span className="px-3 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/50 text-[#ffe9a8] text-xs font-black tracking-[0.25em] uppercase mb-2">
                        {multiplier.toFixed(1).replace(/\.0$/, "")}x
                    </span>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-[0.14em] gold-text">
                        {tierLabel}
                    </h2>

                    <div
                        className="mt-4 text-5xl sm:text-6xl md:text-7xl font-black font-mono tabular-nums text-[#fff3c4]"
                        style={{
                            textShadow:
                                "0 4px 20px rgba(212,175,55,0.85), 0 2px 0 #7a5b14, 0 0 40px rgba(255,180,0,0.45)",
                        }}
                    >
                        <Monetary value={animatedValue} showFraction={value % 1 !== 0} />
                    </div>

                    <div className="mt-5">
                        <ShareWinButton
                            gameName={es ? "Fortuna del Coliseo" : "Colosseum Slots"}
                            multiplier={multiplier}
                            payout={value}
                        />
                    </div>

                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#b9a77a]/80 animate-pulse">
                        {es ? "Tocá en cualquier lugar para continuar" : "Click anywhere to continue"}
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BigWinAlert;

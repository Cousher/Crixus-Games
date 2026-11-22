import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SlotColumnProps {
    symbols: string[];
    isSpinning: boolean;
    position: number;
    winningLines?: string[];
}

const SYMBOL_IMAGES: Record<string, string> = {
    red: "/images/slot/red.webp",
    blue: "/images/slot/shangai.webp",
    green: "/images/slot/lily.webp",
    yin_yang: "/images/slot/yin.webp",
    hakkero: "/images/slot/hakkero.webp",
    yellow: "/images/slot/green.webp",
    wild: "/images/slot/wild.webp",
};

const OPTIONS = ["red", "blue", "green", "yin_yang", "hakkero", "yellow", "wild"];

const SlotColumn: React.FC<SlotColumnProps> = ({ symbols, isSpinning, position, winningLines = [] }) => {
    const rollsize = 5260;
    const [rouletteItems, setRouletteItems] = useState<string[]>([]);
    const [translateValue, setTranslateValue] = useState<string>(`-${rollsize}px`);
    const rouletteRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const newItems = symbols.slice();
        for (let i = 0; i < 46; i++) {
            newItems.unshift(OPTIONS[Math.floor(Math.random() * OPTIONS.length)]);
        }
        newItems[47] = symbols[0];
        newItems[48] = symbols[1];
        newItems[49] = symbols[2];
        setRouletteItems(newItems);
    }, [symbols]);

    useEffect(() => {
        if (isSpinning) {
            setTranslateValue(`-${rollsize}px`);
        }
    }, [isSpinning]);

    const calculateDelay = (pos: number) => {
        if (pos === 0) return "slotSpin 2s cubic-bezier(0.1, 0, 0.2, 1)";
        if (pos === 1) return "slotSpin 2.4s cubic-bezier(0.1, 0, 0.2, 1)";
        return "slotSpin 2.8s cubic-bezier(0.1, 0, 0.2, 1)";
    };

    useEffect(() => {
        if (!rouletteRef.current) return;
        if (isSpinning) {
            rouletteRef.current.style.animation = calculateDelay(position);
        } else {
            rouletteRef.current.style.animation = "";
            rouletteRef.current.style.transform = `translateY(${translateValue})`;
        }
    }, [isSpinning, translateValue, position]);

    const hasWin = !isSpinning && winningLines.length > 0;

    const isWinningSymbol = (index: number) => {
        if (index < 47) return false;
        for (const line of winningLines) {
            if (line === "Horizontal 1" && index === 47) return true;
            if (line === "Horizontal 2" && index === 48) return true;
            if (line === "Horizontal 3" && index === 49) return true;
            if (line === "Diagonal 1") {
                if (position === 0 && index === 47) return true;
                if (position === 1 && index === 48) return true;
                if (position === 2 && index === 49) return true;
            }
            if (line === "Diagonal 2") {
                if (position === 0 && index === 49) return true;
                if (position === 1 && index === 48) return true;
                if (position === 2 && index === 47) return true;
            }
        }
        return false;
    };

    return (
        <div className="h-[340px] max-h-[340px] w-full overflow-hidden flex justify-center">
            <div ref={rouletteRef} className="will-change-transform w-full">
                {rouletteItems.map((symbol, index) => {
                    const isWin = hasWin && isWinningSymbol(index);
                    const isDimmed = hasWin && !isWin && index >= 47;
                    const isWild = symbol === "wild";

                    return (
                        <motion.div
                            key={index}
                            className="w-full max-w-[112px] mx-auto h-28 relative p-1 sm:p-2 flex items-center justify-center"
                            animate={
                                isWin
                                    ? {
                                          scale: [1, 1.09, 1],
                                          filter: ["brightness(1.05)", "brightness(1.38)", "brightness(1.05)"],
                                      }
                                    : {
                                          scale: isDimmed ? 0.92 : 1,
                                          filter: isDimmed ? "brightness(0.45) saturate(0.65)" : "brightness(1)",
                                      }
                            }
                            transition={
                                isWin
                                    ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
                                    : { duration: 0.35 }
                            }
                        >
                            {/* Inlaid obsidian tile frame */}
                            <div
                                className={`relative w-full h-full rounded-xl overflow-hidden transition-all duration-300 ${
                                    isWin
                                        ? "ring-2 ring-[#ffe9a8] shadow-[0_0_24px_rgba(255,215,0,0.75),inset_0_0_12px_rgba(255,233,168,0.4)]"
                                        : isWild
                                            ? "ring-1 ring-[#d4af37]/50 shadow-[inset_0_0_10px_rgba(212,175,55,0.2)]"
                                            : "ring-1 ring-[#d4af37]/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)]"
                                } bg-[#0b0a09]`}
                            >
                                <img
                                    src={SYMBOL_IMAGES[symbol] || SYMBOL_IMAGES.red}
                                    alt={symbol}
                                    draggable={false}
                                    className="w-full h-full object-cover select-none"
                                />
                                {/* Subtle stone-bezel top reflection */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/30 pointer-events-none" />
                                {/* Golden aura on winning cell */}
                                {isWin && (
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background:
                                                "radial-gradient(circle, rgba(255,233,168,0.25) 0%, rgba(212,175,55,0.08) 60%, transparent 100%)",
                                        }}
                                    />
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            <style>{`
                @keyframes slotSpin {
                    from {
                        transform: translateY(0%);
                    }
                    to {
                        transform: translateY(${translateValue});
                    }
                }
            `}</style>
        </div>
    );
};

export default SlotColumn;

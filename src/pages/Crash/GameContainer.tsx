import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Videos from "./Videos";
import { Key, useState, useEffect } from "react";
import Lottie from "lottie-react";

interface GameHistory {
    crashPoint: number | null;
    multiplier: number;
    animationSrc: string;
    setAnimationSrc: any;
    gameEnded: boolean;
    countDown: number;
    up: string;
    idle: string;
    falling: string;
    history: any;
    userCashedOut?: boolean;
    userMultiplier?: number;
}

const GameContainer: React.FC<GameHistory> = ({ crashPoint, multiplier, animationSrc, gameEnded, countDown, setAnimationSrc, up, idle, falling, history, userCashedOut, userMultiplier }) => {
    const { t } = useTranslation();
    const [bgLottie, setBgLottie] = useState<any>(null);

    // Load a generic space speed/stars Lottie for the background
    useEffect(() => {
        // We removed the external Lottie fetch in favor of a native, highly optimized CSS grid
    }, []);

    // Color logic for multiplier
    const getMultiplierColor = () => {
        if (gameEnded) return "text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]";
        if (multiplier >= 10) return "text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,1)]";
        if (multiplier >= 2) return "text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)]";
        return "text-white drop-shadow-md";
    };

    return (
        <div className="flex flex-col relative w-full">
            <div className="flex lg:w-[800px] border-b border-gray-800 p-4 w-full">
                {/* Screen shake on crash */}
                <motion.div 
                    animate={gameEnded ? { x: [-15, 15, -10, 10, -5, 5, 0], y: [-5, 5, -5, 5, 0] } : { x: 0, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex rounded-xl items-center flex-col justify-center w-full h-[380px] relative overflow-hidden bg-[#0a0807] shadow-2xl border border-gray-800/50"
                >
                    {/* Animated Neon Grid Background */}
                    <div className="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden">
                        <div 
                            className="w-[200%] h-[200%] absolute left-[-50%] bottom-0"
                            style={{
                                backgroundImage: `
                                    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                                `,
                                backgroundSize: '40px 40px',
                                transform: 'perspective(500px) rotateX(60deg)',
                                transformOrigin: 'bottom',
                                animation: gameEnded ? 'none' : `gridMove ${Math.max(0.5, 3 / multiplier)}s linear infinite`,
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#0a0807]/80 to-[#0a0807] z-10" />
                        <style>{`
                            @keyframes gridMove {
                                0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
                                100% { transform: perspective(500px) rotateX(60deg) translateY(40px); }
                            }
                        `}</style>
                    </div>

                    {/* Big Win Celebration Overlay */}
                    <AnimatePresence>
                        {userCashedOut && !gameEnded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                className="absolute inset-0 z-30 flex items-center justify-center bg-green-500/10 backdrop-blur-sm"
                            >
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="flex flex-col items-center p-6 bg-[#1c1813]/90 rounded-3xl border border-emerald-500/50 shadow-[0_0_40px_rgba(52,211,153,0.3)]"
                                >
                                    <span className="text-2xl font-black text-emerald-400 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                                        Success!
                                    </span>
                                    <span className="text-lg text-white font-bold mt-1">
                                        Cashed out at {userMultiplier?.toFixed(2)}X
                                    </span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Next Game Countdown */}
                    {gameEnded && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 px-6 py-2 rounded-full border border-gray-700 backdrop-blur-md">
                            <span className="text-gray-300 font-medium text-sm tracking-widest uppercase">
                                Next game in <span className="text-white font-bold">{countDown.toFixed(1)}s</span>
                            </span>
                        </div>
                    )}

                    {/* Massive Central Multiplier */}
                    <motion.div 
                        className="absolute z-10 flex flex-col items-center justify-center pointer-events-none"
                        animate={gameEnded ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {gameEnded && <span className="text-red-500 font-bold text-xl uppercase tracking-widest mb-2 bg-black/50 px-4 py-1 rounded-full">Crashed</span>}
                        <motion.h1 
                            className={`text-7xl md:text-9xl font-black tabular-nums transition-colors duration-300 ${getMultiplierColor()}`}
                            animate={!gameEnded && multiplier > 1 ? { scale: [1, 1.02, 1] } : {}}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        >
                            {gameEnded ? (crashPoint ? crashPoint.toFixed(2) : "1.00") : multiplier.toFixed(2)}x
                        </motion.h1>
                    </motion.div>

                    <Videos
                        animationSrc={animationSrc}
                        setAnimationSrc={setAnimationSrc}
                        up={up}
                        idle={idle}
                        falling={falling} 
                    />
                </motion.div>
            </div>
            
            {/* History Bar */}
            <div className="flex w-full lg:w-[800px] p-4 flex-col">
                <h3 className="mb-2 text-sm text-gray-500 font-semibold uppercase tracking-widest">{t("games.gameHistory")}</h3>
                <div className="flex items-center gap-2 justify-end w-full overflow-hidden h-[32px]">
                    {history.map((e: { crashPoint: number | null }, i: Key) => {
                        const isRed = e.crashPoint && e.crashPoint < 2;
                        const isGold = e.crashPoint && e.crashPoint >= 10;
                        
                        let bgColor = "bg-green-500/20 text-green-400 border-green-500/30";
                        if (isRed) bgColor = "bg-red-500/20 text-red-400 border-red-500/30";
                        if (isGold) bgColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

                        return (
                            <motion.div
                                key={i}
                                className={`min-h-[28px] rounded-md px-3 flex items-center justify-center border font-bold text-sm ${bgColor}`}
                                initial={i === history.length - 1 ? { opacity: 0, x: 30 } : {}}
                                animate={i === history.length - 1 ? { opacity: 1, x: 0 } : {}}
                                transition={{ ease: "easeOut", duration: 0.5 }}
                            >
                                {e.crashPoint}x
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}

export default GameContainer

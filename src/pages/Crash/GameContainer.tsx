import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Videos from "./Videos";
import { Key } from "react";

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

    const animationSpeed = Math.max(50 / multiplier, 50);

    const backgroundStyle = gameEnded
        ? { backgroundColor: '#1a1813' }
        : {
            background: `linear-gradient(to right, var(--color1), var(--color2), var(--color3), var(--color6))`,
            backgroundSize: '600% 100%',
            animation: `gradient ${animationSpeed}s linear infinite`,
        };

    return (
        <div className="flex flex-col relative">
            <div className="flex lg:w-[800px] border-b border-gray-700 p-4">
                <div className="flex rounded items-center flex-col justify-center w-full h-[340px] relative overflow-hidden"
                    style={backgroundStyle}
                >
                    {/* Big Win Celebration Overlay */}
                    <AnimatePresence>
                        {userCashedOut && !gameEnded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                className="absolute inset-0 z-30 flex items-center justify-center bg-green-500/20 backdrop-blur-sm"
                            >
                                <motion.div 
                                    animate={{ y: [0, -20, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="flex flex-col items-center p-8 bg-[#1c1813]/90 rounded-2xl border-2 border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)]"
                                >
                                    <span className="text-3xl font-black text-emerald-400 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                                        Success!
                                    </span>
                                    <span className="text-xl text-white font-bold mt-2">
                                        Cashed out at {userMultiplier?.toFixed(2)}X
                                    </span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {
                        gameEnded && <div className="absolute top-0 left-0 p-2 z-20">
                            <span>
                                Next game in: {countDown.toFixed(1)}
                            </span>
                        </div>
                    }
                    <div className={`absolute top-6 left-1/2 -translate-x-1/2 font-semibold p-4 min-w-[250px] rounded text-2xl flex items-center z-10 justify-center ${gameEnded ? "bg-red-500" : "bg-[#1c1813] "}`}>
                        {
                            gameEnded ? <span>Crashed at {crashPoint && crashPoint.toFixed(2)}X</span>
                                : <div className="flex items-center justify-between w-[93%] ">
                                    <span>{t("games.multiplier")}</span> {multiplier.toFixed(2)}X</div>}

                    </div>
                    <Videos
                        animationSrc={animationSrc}
                        setAnimationSrc={setAnimationSrc}
                        up={up}
                        idle={idle}
                        falling={falling} />
                </div>
            </div>
            <div className="flex w-screen lg:w-[800px] p-4 flex-col">
                <h3 className="mb-2 text-lg font-semibold">{t("games.gameHistory")}</h3>
                <div className="flex items-center gap-2 justify-end w-full overflow-hidden h-[24px]">
                    {history.map((e: { crashPoint: number | null }, i: Key) => (
                        <motion.div
                            key={i}
                            className={`min-h-[24px] rounded-lg p-2 ${e.crashPoint && e.crashPoint < 2 ? "bg-red-500" : "bg-green-500"}`}
                            initial={i === history.length - 1 ? { opacity: 0, x: 30 } : {}}
                            animate={i === history.length - 1 ? { opacity: 1, x: 0 } : {}}
                            transition={{ ease: "easeOut", duration: 1 }}
                        >
                            <span className="font-bold">{e.crashPoint}x</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default GameContainer

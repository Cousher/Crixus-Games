import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import Game from './Game';
import { spinSlots } from '../../services/games/GamesServices';
import { toast } from 'react-toastify';
import { SlotProps } from './Types';
import BigWinAlert from './BigWinAlert';
import RenderMike from './RenderMike';
import bigwin from "/bigwin.mp3"
import ValueViewer from './ValueViewer';
import UserContext from '../../UserContext';
import sound from '../../services/sound';
import { coinRainEmitter } from '../../components/CoinRain';
// import { RotatingLines } from "react-loader-spinner";

const renderPlaceholder = () => {
    const options = ['red', 'blue', 'green', 'yin_yang', 'hakkero', 'yellow', 'wild'];
    return Array.from({ length: 9 }, () => options[Math.floor(Math.random() * options.length)]);
};

const Slots = () => {
  const { t } = useTranslation();
    const [grid, setGrid] = useState<string[]>(renderPlaceholder());
    const [response, setResponse] = useState<SlotProps | null>(null);
    const [betAmount, setBetAmount] = useState<number>(10);
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [winningLines, setWinningLines] = useState<any[]>([]);
    const [totalWins, setTotalWins] = useState<number>(0);
    const [openBigWin, setOpenBigWin] = useState<boolean>(false);
    const [lostCount, setLostCount] = useState<number>(0);
    const [loadedImages, setLoadedImages] = useState<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { userData, toogleUserFlow } = useContext(UserContext);

    const startAudio = () => {
        setTimeout(() => {
            if (audioRef.current && !sound.isMuted()) {
                audioRef.current.volume = 0.2 * sound.getVolume();
                audioRef.current.play().catch(() => { });
            }
        }, 2800);
    };

    const pauseAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };


    const handleClick = () => {
        if (openBigWin) {
            setOpenBigWin(false);
            pauseAudio();
        }
    };

    useEffect(() => {
        setTimeout(() => {
            setTotalWins(response?.totalPayout || 0);
        }, 3000);
    }, [response]);

    useEffect(() => {
        window.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('click', handleClick);
        };
    }, [openBigWin]);

    // clear pending reel sounds if the player leaves mid-spin
    const soundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    useEffect(() => () => soundTimers.current.forEach(clearTimeout), []);

    const playSpinSounds = (payout: number) => {
        soundTimers.current.forEach(clearTimeout);
        sound.play("spin");
        soundTimers.current = [
            ...[2000, 2400, 2800].map((ms) => setTimeout(() => sound.play("reelStop"), ms)),
            setTimeout(() => {
                if (payout >= betAmount * 8) sound.play("bigWin");
                else if (payout > 0) sound.play("win");
            }, 2900),
        ];
    };


    const handleSpin = async () => {
        setIsSpinning(true)
        if (userData == null) {
            toogleUserFlow(true);
            return;
        }
        setOpenBigWin(false);
        setTotalWins(0);

        if (userData?.walletBalance < betAmount) {
            toast.error(t("toast.insufficientFunds"));
            setIsSpinning(false)
            return;
        }

        try {
            const response = await spinSlots(betAmount);
            setResponse(response);
            setGrid(response.gridState);
            setWinningLines(response?.lastSpinResult.map((result: { line: any; }) => result.line) || [])
            playSpinSounds(response.totalPayout || 0);
            if (response.totalPayout >= betAmount * 8) {
                setOpenBigWin(true);
                startAudio();
                coinRainEmitter.trigger(100);
            }

            if (response.totalPayout == 0) {
                setLostCount(lostCount + 1);
            } else {
                setLostCount(0);
            }

            setTimeout(() => {
                setIsSpinning(false);
            }, 3000);
        } catch (e: any) {
            console.error(e.response?.data.message || "Error spinning slots");
            toast.error(e.response?.data.message || "Error spinning slots");
            setIsSpinning(false);
        }
    };

    const handleChangeBet = (type: "add" | "subtract") => {
        return (
            <button
                data-no-sfx
                onClick={() => {
                    const newBetAmount = type === "subtract" ? betAmount / 2 : betAmount * 2;
                    if (newBetAmount >= 1 && newBetAmount <= 50000) {
                        setBetAmount(newBetAmount);
                        sound.play("chip");
                    }
                }}
                className={`w-6 h-10 bg-transparent text-white font-bold py-2 px-4 
                       rounded-full transition-all border-4 hover:border-unique flex items-center justify-center
                       border-[#ECA823]`}
            >
                {type === "subtract" ? "-" : "+"}
            </button>
        );
    };

    const getCurrentMike = () => {
        if (response) {
            if (openBigWin) {
                return "jackpot";
            } else if (response?.totalPayout > 0) {
                return "win";
            } else if (lostCount >= 3) {
                return "losing";
            } else {
                return "normal";
            }
        }
    }

    return (
        <div className='w-full flex justify-center -mt-6'>
            {
                openBigWin && <BigWinAlert value={response?.totalPayout || 0} />
            }
            <audio
                ref={audioRef}
                src={bigwin}
            />

            <div className={`md:p-4 pb-1 relative z-10 w-full max-w-[600px] flex flex-col items-center`}>
                {/* The mascot/mike above the machine */}
                <div className="-mb-2 relative z-20 w-full flex justify-center">
                    <RenderMike status={
                        getCurrentMike() as "normal" | "win" | "losing" | "jackpot"
                    } />
                </div>

                {/* The main slot machine chassis */}
                <div className="w-full bg-gradient-to-b from-[#2a2315] via-[#1f1a10] to-[#14110b] rounded-[2rem] p-3 md:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.1)] border-2 border-[#d4af37]/60 relative before:absolute before:inset-0 before:bg-[url('/images/noise.png')] before:opacity-5 before:rounded-[2rem] before:pointer-events-none">
                    {/* Metallic inner bezel */}
                    <div className="w-full bg-[#0a0a0c] rounded-2xl p-2 md:p-4 border-[6px] border-[#3e3219] shadow-[inset_0_0_40px_rgba(0,0,0,1),0_0_15px_rgba(212,175,55,0.3)] relative">
                        {/* Inner glowing edge */}
                        <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_10px_rgba(212,175,55,0.2)] pointer-events-none z-10"></div>
                        <Game grid={grid} isSpinning={isSpinning} data={response} winningLines={winningLines} loadedImages={loadedImages} setLoadedImages={setLoadedImages} />
                    </div>

                    {/* Win/Payout Bar (LED Display Style) */}
                    <div className='bg-[#050505] w-full mt-6 rounded-xl border-[3px] border-[#1a1a1a] shadow-[inset_0_4px_15px_rgba(0,0,0,1),0_2px_0_rgba(255,255,255,0.05)] flex items-center justify-center min-h-[64px] relative overflow-hidden'>
                        {/* Glass reflection */}
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent rounded-t-lg pointer-events-none"></div>
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                        <span className="font-mono text-2xl md:text-3xl font-black uppercase tracking-[0.2em] z-10" style={{
                            color: response?.totalPayout && response?.totalPayout > 0 && !isSpinning ? '#39ff14' : '#e6b800',
                            textShadow: response?.totalPayout && response?.totalPayout > 0 && !isSpinning ? '0 0 10px rgba(57,255,20,0.6)' : '0 0 10px rgba(230,184,0,0.4)'
                        }}>
                            {response?.totalPayout && response?.totalPayout > 0 && !isSpinning ? `${t("games.won")}${new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "DOL",
                                minimumFractionDigits: 0,
                            })
                                .format(response?.totalPayout)
                                .replace("DOL", "$")
                                }` : (isSpinning ? t("games.spinning") : t("games.goodLuck"))}
                        </span>
                    </div>

                    {/* Control Panel */}
                    <div className="flex flex-col justify-center p-5 mt-6 bg-gradient-to-b from-[#1a160d] to-[#0d0b07] rounded-2xl border-t border-[#d4af37]/30 shadow-[inset_0_10px_30px_rgba(0,0,0,0.8),0_5px_15px_rgba(0,0,0,0.5)] relative">
                        
                        {/* Values Row */}
                        <div className="flex w-full items-center justify-between md:justify-center gap-3 md:gap-8 mb-4">
                            {
                                ["balance", "bet", "wins"].map((type) => <ValueViewer key={type} type={type as "balance" | "bet" | "wins"} betAmount={betAmount} totalWins={totalWins} />
                                )
                            }
                        </div>

                        {/* Buttons Row */}
                        <div className="flex items-center justify-center gap-8 md:gap-14">
                            {handleChangeBet("subtract")}
                            <div className="relative group">
                                {/* Button outer glow */}
                                <div className={`absolute inset-[-4px] rounded-full blur-lg opacity-60 transition-opacity duration-300 ${isSpinning ? 'bg-[#ff3333]/0' : 'bg-[#ff1a1a]/40 group-hover:bg-[#ff1a1a]/70 animate-pulse'}`}></div>
                                
                                <button 
                                    onClick={handleSpin} 
                                    disabled={isSpinning} 
                                    className="relative w-24 h-24 md:w-28 md:h-28 rounded-full transition-transform active:scale-95 flex items-center justify-center disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100"
                                    style={{
                                        background: isSpinning 
                                            ? "radial-gradient(circle at 30% 30%, #4a1515 0%, #1a0505 100%)" 
                                            : "radial-gradient(circle at 30% 30%, #ff3b3b 0%, #990000 60%, #4a0000 100%)",
                                        boxShadow: isSpinning 
                                            ? "inset 0px -6px 15px rgba(0,0,0,0.8), inset 0px 4px 10px rgba(255,255,255,0.1), 0 8px 20px rgba(0,0,0,0.8)" 
                                            : "inset 0px -8px 20px rgba(0,0,0,0.6), inset 0px 4px 15px rgba(255,150,150,0.5), 0 10px 25px rgba(0,0,0,0.7), 0 0 30px rgba(255,0,0,0.4)",
                                        border: "4px solid",
                                        borderImage: "linear-gradient(to bottom, #ffe9a8, #d4af37, #8a7f63) 1",
                                        borderColor: "#d4af37" // Fallback
                                    }}
                                >
                                    {/* Glass reflection */}
                                    {!isSpinning && <div className="absolute top-1 left-2 right-2 h-[40%] rounded-t-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>}
                                    
                                    <span className="text-white font-black text-xl md:text-2xl uppercase tracking-[0.15em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10"
                                          style={{ textShadow: isSpinning ? 'none' : '0 0 15px rgba(255,255,255,0.4)' }}>
                                        {t("games.spin")}
                                    </span>
                                </button>
                            </div>
                            {handleChangeBet("add")}
                        </div>
                    </div>
                </div>
            </div >
        </div>

    );
};

export default Slots;



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
                <div className="w-full bg-gradient-to-b from-[#3a0d0d] via-[#1a0505] to-[#2b0808] rounded-3xl p-2 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-yellow-900/40 relative">
                    {/* Metallic inner bezel */}
                    <div className="w-full bg-[#0f0f11] rounded-2xl p-1 md:p-3 border-4 border-[#3d1b1b] shadow-[inset_0_0_30px_rgba(0,0,0,1)]">
                        <Game grid={grid} isSpinning={isSpinning} data={response} winningLines={winningLines} loadedImages={loadedImages} setLoadedImages={setLoadedImages} />
                    </div>

                    {/* Win/Payout Bar */}
                    <div className='bg-gradient-to-r from-[#200505] via-[#4a0d0d] to-[#200505] w-full mt-3 rounded-lg border-2 border-[#ECA823]/30 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center min-h-[56px] relative overflow-hidden'>
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                        <span className="text-[#ECA823] text-xl md:text-2xl font-black uppercase tracking-widest drop-shadow-[0_0_10px_rgba(236,168,35,0.5)]">
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
                    <div className="flex flex-col justify-center p-4 mt-3 bg-gradient-to-b from-[#2a0b0b] to-[#120303] rounded-xl border-t-2 border-[#ECA823]/20 gap-5 shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)] relative">
                        
                        {/* Values Row */}
                        <div className="flex w-full items-center justify-between md:justify-center gap-2 md:gap-4">
                            {
                                ["balance", "bet", "wins"].map((type) => <ValueViewer key={type} type={type as "balance" | "bet" | "wins"} betAmount={betAmount} totalWins={totalWins} />
                                )
                            }
                        </div>

                        {/* Buttons Row */}
                        <div className="flex items-center justify-center gap-6 md:gap-10">
                            {handleChangeBet("subtract")}
                            <button 
                                onClick={handleSpin} 
                                disabled={isSpinning} 
                                className="group relative w-20 h-20 md:w-24 md:h-24 rounded-full transition-all flex items-center justify-center disabled:opacity-75 disabled:cursor-not-allowed"
                                style={{
                                    background: isSpinning ? "radial-gradient(circle, #555 0%, #222 100%)" : "radial-gradient(circle, #25D160 0%, #12632b 100%)",
                                    boxShadow: isSpinning 
                                        ? "inset 0px -4px 10px rgba(0,0,0,0.8), 0 5px 15px rgba(0,0,0,0.5)" 
                                        : "inset 0px -4px 10px rgba(0,0,0,0.5), 0 0 20px rgba(37,209,96,0.4)",
                                    border: "4px solid #ECA823"
                                }}
                            >
                                {/* Inner glow/shimmer on button */}
                                {!isSpinning && <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />}
                                
                                <span className="text-white font-black text-lg md:text-xl uppercase tracking-widest drop-shadow-md z-10">
                                    {t("games.spin")}
                                </span>
                            </button>
                            {handleChangeBet("add")}
                        </div>
                    </div>
                </div>
            </div >
        </div>

    );
};

export default Slots;



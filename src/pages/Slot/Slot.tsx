import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCrown, FaInfoCircle } from "react-icons/fa";
import Game from "./Game";
import { spinSlots } from "../../services/games/GamesServices";
import { toast } from "react-toastify";
import { SlotProps } from "./Types";
import BigWinAlert from "./BigWinAlert";
import bigwin from "/bigwin.mp3";
import ValueViewer from "./ValueViewer";
import Paytable from "./Paytable";
import UserContext from "../../UserContext";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import Monetary from "../../components/Monetary";

const BET_STEPS = [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
const QUICK_CHIPS = [1, 5, 10, 50, 100, 500];
const MIN_BET = 1;
const MAX_BET = 50000;

const renderPlaceholder = () => {
    const options = ["red", "blue", "green", "yin_yang", "hakkero", "yellow", "wild"];
    return Array.from({ length: 9 }, () => options[Math.floor(Math.random() * options.length)]);
};

const Slots = () => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    const [grid, setGrid] = useState<string[]>(renderPlaceholder());
    const [response, setResponse] = useState<SlotProps | null>(null);
    const [betAmount, setBetAmount] = useState<number>(10);
    const [betInput, setBetInput] = useState<string>("10");
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [winningLines, setWinningLines] = useState<string[]>([]);
    const [totalWins, setTotalWins] = useState<number>(0);
    const [openBigWin, setOpenBigWin] = useState<boolean>(false);
    const [showPaytableModal, setShowPaytableModal] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const spinTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const { userData, toogleUserData, toogleUserFlow } = useContext(UserContext);

    const clearAllTimers = () => {
        spinTimers.current.forEach(clearTimeout);
        spinTimers.current = [];
    };

    useEffect(() => clearAllTimers, []);

    const setCleanBet = (value: number, playSound = true) => {
        const clamped = Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(value)));
        setBetAmount(clamped);
        setBetInput(String(clamped));
        if (playSound) sound.play("chip");
    };

    const stepBet = (direction: "subtract" | "add") => {
        if (isSpinning) return;
        if (direction === "subtract") {
            const lower = [...BET_STEPS].reverse().find((s) => s < betAmount);
            setCleanBet(lower ?? MIN_BET);
        } else {
            const higher = BET_STEPS.find((s) => s > betAmount);
            setCleanBet(higher ?? MAX_BET);
        }
    };

    const handleBetInputChange = (raw: string) => {
        const digitsOnly = raw.replace(/[^0-9]/g, "");
        setBetInput(digitsOnly);
        if (digitsOnly !== "") {
            const parsed = Math.min(MAX_BET, Math.max(MIN_BET, parseInt(digitsOnly, 10)));
            if (Number.isFinite(parsed)) {
                setBetAmount(parsed);
            }
        }
    };

    const handleBetInputBlur = () => {
        const parsed = parseInt(betInput, 10);
        if (!Number.isFinite(parsed) || parsed < MIN_BET) {
            setCleanBet(MIN_BET, false);
        } else {
            setCleanBet(parsed, false);
        }
    };

    const pauseAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const closeBigWin = () => {
        setOpenBigWin(false);
        pauseAudio();
    };

    const playSpinSounds = (payout: number, stake: number) => {
        sound.play("spin");
        const timers: ReturnType<typeof setTimeout>[] = [
            ...[2000, 2400, 2800].map((ms) => setTimeout(() => sound.play("reelStop"), ms)),
            setTimeout(() => {
                if (payout >= stake * 8) {
                    sound.play("bigWin");
                    if (audioRef.current && !sound.isMuted()) {
                        audioRef.current.volume = 0.2 * sound.getVolume();
                        audioRef.current.play().catch(() => {});
                    }
                    setOpenBigWin(true);
                    coinRainEmitter.trigger(100);
                } else if (payout > 0) {
                    sound.play("win");
                }
            }, 2880),
        ];
        spinTimers.current.push(...timers);
    };

    const handleSpin = async () => {
        if (isSpinning) return;

        if (userData == null) {
            toogleUserFlow(true);
            return;
        }

        const cleanBet = Math.floor(Number(betAmount));
        if (!Number.isFinite(cleanBet) || cleanBet < MIN_BET || cleanBet > MAX_BET) {
            toast.error(es ? "La apuesta debe ser un entero entre $1 y $50.000" : "Bet must be an integer between $1 and $50,000");
            return;
        }

        const currentBalance = Number(userData?.walletBalance ?? 0);
        if (!Number.isFinite(currentBalance) || currentBalance < cleanBet) {
            toast.error(t("toast.insufficientFunds"));
            return;
        }

        clearAllTimers();
        setIsSpinning(true);
        setOpenBigWin(false);
        setTotalWins(0);
        setWinningLines([]);

        try {
            const res: SlotProps = await spinSlots(cleanBet);
            setResponse(res);
            setGrid(res.gridState);
            setWinningLines(res?.lastSpinResult?.map((r) => r.line) || []);
            playSpinSounds(res.totalPayout || 0, cleanBet);

            const finishTimer = setTimeout(() => {
                setTotalWins(res.totalPayout || 0);
                setIsSpinning(false);
                // Keep client wallet synced from HTTP response even if Socket.IO missed an event
                if (typeof res.walletBalance === "number") {
                    toogleUserData((prev: any) =>
                        prev
                            ? {
                                  ...prev,
                                  walletBalance: res.walletBalance,
                                  xp: typeof res.xp === "number" ? res.xp : prev.xp,
                                  level: typeof res.level === "number" ? res.level : prev.level,
                              }
                            : prev
                    );
                }
            }, 3000);
            spinTimers.current.push(finishTimer);
        } catch (e: any) {
            const serverMsg = e?.response?.data?.message || "";
            if (serverMsg === "Insufficient balance") {
                toast.error(t("toast.insufficientFunds"));
            } else if (serverMsg === "Invalid bet amount") {
                toast.error(es ? "Apuesta inválida (debe ser un entero entre $1 y $50.000)" : "Invalid bet amount");
            } else {
                toast.error(serverMsg || t("toast.connError"));
            }
            setIsSpinning(false);
        }
    };

    const hasWon = !isSpinning && Boolean(response?.totalPayout && response.totalPayout > 0);
    const maxAffordable = Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(Number(userData?.walletBalance ?? 10))));

    return (
        <div className="w-full flex justify-center px-2 sm:px-4 pb-10 -mt-2">
            {openBigWin && (
                <BigWinAlert
                    value={response?.totalPayout || 0}
                    betAmount={response?.betAmount || betAmount}
                    onClose={closeBigWin}
                />
            )}
            {showPaytableModal && (
                <Paytable betAmount={betAmount} isModal onClose={() => setShowPaytableModal(false)} />
            )}
            <audio ref={audioRef} src={bigwin} />

            <div className="w-full max-w-[980px] flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 relative z-10">
                {/* Main Slot Cabinet Column */}
                <div className="w-full max-w-[540px] flex flex-col items-center">
                    {/* Imperial Roman Pediment / Marquee Header */}
                    <div className="w-[92%] relative z-20 -mb-2">
                        <div className="relative bg-gradient-to-b from-[#3d2e14] via-[#261d0e] to-[#171209] rounded-t-3xl border-t-2 border-x-2 border-[#d4af37]/80 px-4 py-2.5 shadow-[0_-6px_24px_rgba(212,175,55,0.18),inset_0_2px_6px_rgba(255,233,168,0.2)] flex items-center justify-between gap-2">
                            {/* Subtle corner ornament studs */}
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shrink-0 shadow-[0_0_12px_rgba(212,175,55,0.5)]">
                                    <div className="w-full h-full rounded-full bg-[#1a1308] flex items-center justify-center">
                                        <FaCrown className="text-[#ffd966] text-xs" />
                                    </div>
                                </div>
                                <div className="flex flex-col leading-tight min-w-0">
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] gold-text truncate">
                                        {es ? "Fortuna del Coliseo" : "Colosseum Slots"}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#9b8d6f] font-semibold">
                                        {es ? "5 Líneas · Comodín León" : "5 Paylines · Lion Wild"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="px-2.5 py-1 rounded-full bg-[#120d06] border border-[#d4af37]/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.9)] flex items-center gap-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#b9a77a]">MAX</span>
                                    <span className="text-xs font-black font-mono text-[#ffe9a8]">500x</span>
                                </div>
                                {/* Mobile/tablet Paytable trigger */}
                                <button
                                    type="button"
                                    onClick={() => setShowPaytableModal(true)}
                                    className="lg:hidden w-8 h-8 rounded-full bg-[#1f180c] border border-[#d4af37]/50 text-[#ffd966] hover:bg-[#312512] flex items-center justify-center transition-colors"
                                    title={es ? "Ver Tabla de Pagos" : "View Paytable"}
                                    aria-label={es ? "Tabla de Pagos" : "Paytable"}
                                >
                                    <FaInfoCircle className="text-sm" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Slot Machine Chassis */}
                    <div className="w-full bg-gradient-to-b from-[#2a2113] via-[#1c160d] to-[#110d08] rounded-[1.75rem] p-3 sm:p-5 shadow-[0_30px_70px_rgba(0,0,0,0.92),inset_0_2px_4px_rgba(255,233,168,0.12)] border-2 border-[#d4af37]/65 relative">
                        {/* Metallic inner bezel housing the reels */}
                        <div className="w-full bg-[#090807] rounded-2xl p-2 sm:p-3.5 border-[4px] border-[#3e3017] shadow-[inset_0_0_36px_rgba(0,0,0,1),0_0_18px_rgba(212,175,55,0.2)] relative">
                            <Game
                                grid={grid}
                                isSpinning={isSpinning}
                                data={response}
                                winningLines={winningLines}
                            />
                        </div>

                        {/* Imperial LED Win / Status Display */}
                        <div
                            className={`w-full mt-4 rounded-xl border-[2px] flex items-center justify-center min-h-[54px] px-3 relative overflow-hidden transition-all duration-300 ${
                                hasWon
                                    ? "bg-gradient-to-r from-[#1a1306] via-[#2b1f09] to-[#1a1306] border-[#d4af37] shadow-[inset_0_0_20px_rgba(212,175,55,0.25),0_0_20px_rgba(212,175,55,0.3)]"
                                    : "bg-[#070605] border-[#2c2314] shadow-[inset_0_4px_14px_rgba(0,0,0,0.95)]"
                            }`}
                        >
                            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
                            <span
                                className={`font-mono tabular-nums text-lg sm:text-2xl font-black uppercase tracking-[0.16em] z-10 text-center ${
                                    hasWon
                                        ? "text-[#ffe9a8] drop-shadow-[0_0_14px_rgba(255,217,102,0.85)]"
                                        : isSpinning
                                            ? "text-[#e6ca6a] animate-pulse"
                                            : "text-[#c8a84b]"
                                }`}
                            >
                                {hasWon ? (
                                    <>
                                        {t("games.won")}
                                        <Monetary
                                            value={response?.totalPayout || 0}
                                            showFraction={(response?.totalPayout || 0) % 1 !== 0}
                                        />
                                        {winningLines.length > 1 && (
                                            <span className="ml-2 text-xs sm:text-sm align-middle text-[#d4af37]">
                                                ({winningLines.length} {es ? "líneas" : "lines"})
                                            </span>
                                        )}
                                    </>
                                ) : isSpinning ? (
                                    t("games.spinning")
                                ) : (
                                    t("games.goodLuck")
                                )}
                            </span>
                        </div>

                        {/* Control Panel */}
                        <div className="flex flex-col gap-4 p-3.5 sm:p-4 mt-4 bg-gradient-to-b from-[#17120a] to-[#0d0a06] rounded-2xl border border-[#d4af37]/25 shadow-[inset_0_8px_24px_rgba(0,0,0,0.8)]">
                            {/* Stats Row */}
                            <div className="flex w-full items-stretch gap-2 sm:gap-3">
                                <ValueViewer type="balance" betAmount={betAmount} totalWins={totalWins} />
                                <ValueViewer type="bet" betAmount={betAmount} totalWins={totalWins} />
                                <ValueViewer type="wins" betAmount={betAmount} totalWins={totalWins} />
                            </div>

                            {/* Quick Bet Chips + Editable Integer Input */}
                            <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-7 gap-1.5">
                                    {QUICK_CHIPS.map((chip) => {
                                        const selected = betAmount === chip;
                                        return (
                                            <button
                                                key={chip}
                                                type="button"
                                                disabled={isSpinning}
                                                data-no-sfx
                                                onClick={() => setCleanBet(chip)}
                                                className={`py-1.5 rounded-lg text-[11px] sm:text-xs font-black font-mono tabular-nums transition-all border disabled:opacity-50 ${
                                                    selected
                                                        ? "bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] text-[#1a1204] border-[#fff2c2] shadow-[0_0_12px_rgba(212,175,55,0.45)]"
                                                        : "bg-[#1f190f] text-[#d8ccb2] border-[#3e3219] hover:border-[#d4af37]/70 hover:text-[#ffe9a8]"
                                                }`}
                                            >
                                                ${chip}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        disabled={isSpinning}
                                        data-no-sfx
                                        onClick={() => setCleanBet(maxAffordable)}
                                        className="py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#2b1515] text-[#ffb3b3] border border-[#7a2323] hover:border-[#d4af37] hover:text-[#ffe9a8] transition-all disabled:opacity-50"
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

                            {/* Main Action Row: [-] + Bet Input + SPIN + [+] */}
                            <div className="flex items-center justify-center gap-4 sm:gap-7 pt-1">
                                <button
                                    type="button"
                                    data-no-sfx
                                    disabled={isSpinning || betAmount <= MIN_BET}
                                    onClick={() => stepBet("subtract")}
                                    aria-label={es ? "Reducir apuesta" : "Decrease bet"}
                                    className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-b from-[#2b2213] to-[#0d0a06] text-[#e6ca6a] text-2xl font-black rounded-full transition-all border-2 border-[#5c4710] hover:border-[#ffe9a8] hover:text-[#ffe9a8] hover:shadow-[0_0_14px_rgba(212,175,55,0.4)] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.65)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    −
                                </button>

                                {/* Center Spin Button */}
                                <div className="relative group">
                                    <div
                                        className={`absolute inset-[-5px] rounded-full blur-lg transition-opacity duration-300 ${
                                            isSpinning
                                                ? "opacity-0"
                                                : "bg-[#c0262d]/55 opacity-70 group-hover:opacity-100 animate-pulse"
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSpin}
                                        disabled={isSpinning}
                                        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full transition-transform active:scale-95 flex flex-col items-center justify-center disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100"
                                        style={{
                                            background: isSpinning
                                                ? "radial-gradient(circle at 30% 30%, #4a1515 0%, #1a0505 100%)"
                                                : "radial-gradient(circle at 30% 25%, #e63939 0%, #9b0f14 58%, #4d0407 100%)",
                                            boxShadow: isSpinning
                                                ? "0 0 0 4px #5c4710, 0 0 0 6px #2a2315, inset 0px -6px 15px rgba(0,0,0,0.8), 0 8px 20px rgba(0,0,0,0.8)"
                                                : "0 0 0 4px #d4af37, 0 0 0 6px #5c4710, inset 0px -8px 20px rgba(0,0,0,0.6), inset 0px 4px 14px rgba(255,180,180,0.45), 0 10px 25px rgba(0,0,0,0.75), 0 0 28px rgba(192,38,45,0.45)",
                                        }}
                                    >
                                        {!isSpinning && (
                                            <div className="absolute top-1 left-2 right-2 h-[38%] rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                                        )}
                                        <span className="text-white font-black text-lg sm:text-xl uppercase tracking-[0.14em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] z-10">
                                            {t("games.spin")}
                                        </span>
                                        <span className="text-[11px] font-mono tabular-nums font-bold text-[#ffe9a8]/90 z-10 mt-0.5">
                                            ${betAmount.toLocaleString("en-US")}
                                        </span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    data-no-sfx
                                    disabled={isSpinning || betAmount >= MAX_BET}
                                    onClick={() => stepBet("add")}
                                    aria-label={es ? "Aumentar apuesta" : "Increase bet"}
                                    className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-b from-[#2b2213] to-[#0d0a06] text-[#e6ca6a] text-2xl font-black rounded-full transition-all border-2 border-[#5c4710] hover:border-[#ffe9a8] hover:text-[#ffe9a8] hover:shadow-[0_0_14px_rgba(212,175,55,0.4)] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.65)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    +
                                </button>
                            </div>

                            {/* Exact Custom Bet Input */}
                            <div className="flex items-center justify-center gap-2 pt-1 border-t border-[#d4af37]/15">
                                <label
                                    htmlFor="slot-custom-bet"
                                    className="text-[11px] uppercase tracking-widest text-[#9b8d6f] font-bold"
                                >
                                    {es ? "Apuesta exacta:" : "Custom bet:"}
                                </label>
                                <div className="flex items-center bg-[#090806] border border-[#3e3219] focus-within:border-[#d4af37] rounded-lg px-2.5 py-1 w-28 transition-colors">
                                    <span className="text-[#d4af37] font-bold text-xs mr-1">$</span>
                                    <input
                                        id="slot-custom-bet"
                                        type="text"
                                        inputMode="numeric"
                                        disabled={isSpinning}
                                        value={betInput}
                                        onChange={(e) => handleBetInputChange(e.target.value)}
                                        onBlur={handleBetInputBlur}
                                        className="w-full bg-transparent text-white font-mono tabular-nums font-bold text-xs sm:text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Side Paytable Panel */}
                <div className="hidden lg:block w-[320px] shrink-0 pt-2">
                    <Paytable betAmount={betAmount} />
                </div>
            </div>
        </div>
    );
};

export default Slots;

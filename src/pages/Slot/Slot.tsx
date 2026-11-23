import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBolt,
  FaCrown,
  FaFire,
  FaInfoCircle,
  FaInfinity,
  FaPlay,
  FaStop,
  FaSyncAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import Game from "./Game";
import { spinSlots } from "../../services/games/GamesServices";
import { SlotProps, SlotWinLine } from "./Types";
import BigWinAlert from "./BigWinAlert";
import bigwin from "/bigwin.mp3";
import ValueViewer from "./ValueViewer";
import Paytable from "./Paytable";
import UserContext from "../../UserContext";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import { translateApiMessage } from "../../services/apiMessageI18n";
import {
  PAYLINE_BY_ID,
  createInitialGrid,
  detectReel3Anticipation,
} from "./slotConfig";

const BET_STEPS = [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
const QUICK_CHIPS = [1, 5, 10, 50, 100, 500];
const AUTO_PRESETS = [
  { label: "10", count: 10 },
  { label: "25", count: 25 },
  { label: "50", count: 50 },
  { label: "∞", count: -1 },
];
const MIN_BET = 1;
const MAX_BET = 50000;
const VAULT_BG = "/images/slot/vault_backdrop.webp";

interface SpinHistoryEntry {
  id: number;
  mult: number;
  payout: number;
  bet: number;
}

interface PendingSpin {
  res: SlotProps;
  cleanBet: number;
  anticipation: boolean;
}

const AMBIENT_EMBERS = [
  { id: 0, left: "14%", delay: 0.0, dur: 4.4 },
  { id: 1, left: "18%", delay: 1.6, dur: 3.9 },
  { id: 2, left: "23%", delay: 0.8, dur: 4.8 },
  { id: 3, left: "77%", delay: 0.4, dur: 4.2 },
  { id: 4, left: "82%", delay: 2.1, dur: 3.7 },
  { id: 5, left: "86%", delay: 1.1, dur: 4.6 },
];

const Slots = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const [grid, setGrid] = useState<string[]>(() => createInitialGrid());
  const [response, setResponse] = useState<SlotProps | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [betInput, setBetInput] = useState<string>("10");

  // Physical reel engine coordination state
  const [spinId, setSpinId] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [resultReady, setResultReady] = useState<boolean>(true);
  const [slamStopSeq, setSlamStopSeq] = useState<number>(0);
  const [leverPulledSeq, setLeverPulledSeq] = useState<number>(0);
  const [stopDelays, setStopDelays] = useState<[number, number, number]>([950, 1360, 1780]);
  const [reel3Anticipation, setReel3Anticipation] = useState<boolean>(false);

  // Win celebration & UI controls
  const [winLines, setWinLines] = useState<SlotWinLine[]>([]);
  const [totalWins, setTotalWins] = useState<number>(0);
  const [displayWin, setDisplayWin] = useState<number>(0);
  const [openBigWin, setOpenBigWin] = useState<boolean>(false);
  const [winShakeSeq, setWinShakeSeq] = useState<number>(0);
  const [showPaytableModal, setShowPaytableModal] = useState<boolean>(false);
  const [hoveredPayline, setHoveredPayline] = useState<string | null>(null);

  // AAA Quality-of-Life: Turbo mode, Autoplay, & Spin History
  const [turbo, setTurbo] = useState<boolean>(false);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState<number>(0); // 0 = off, >0 = remaining, -1 = infinite
  const [showAutoMenu, setShowAutoMenu] = useState<boolean>(false);
  const [spinHistory, setSpinHistory] = useState<SpinHistoryEntry[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSpinRef = useRef<PendingSpin | null>(null);
  const slamRequestedRef = useRef<boolean>(false);
  const winCountRafRef = useRef<number>(0);
  const { userData, toogleUserData, toogleUserFlow } = useContext(UserContext);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(winCountRafRef.current);
    };
  }, []);

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

  const animateLedWinCounter = useCallback((target: number) => {
    cancelAnimationFrame(winCountRafRef.current);
    if (target <= 0) {
      setDisplayWin(0);
      return;
    }
    const start = performance.now();
    const dur = Math.min(950, Math.max(420, 420 + Math.log10(target + 1) * 180));
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayWin(target * eased);
      if (p < 1) {
        winCountRafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayWin(target);
      }
    };
    winCountRafRef.current = requestAnimationFrame(tick);
  }, []);

  const triggerSlamStop = useCallback(() => {
    if (!isSpinning || !resultReady || slamRequestedRef.current) return;
    slamRequestedRef.current = true;
    setReel3Anticipation(false);
    setSlamStopSeq((s) => s + 1);
  }, [isSpinning, resultReady]);

  const handleSpin = useCallback(async () => {
    if (isSpinning) {
      triggerSlamStop();
      return;
    }

    if (userData == null) {
      setAutoSpinsLeft(0);
      toogleUserFlow(true);
      return;
    }

    const cleanBet = Math.floor(Number(betAmount));
    if (!Number.isFinite(cleanBet) || cleanBet < MIN_BET || cleanBet > MAX_BET) {
      setAutoSpinsLeft(0);
      toast.error(
        es
          ? "La apuesta debe ser un entero entre $1 y $50.000"
          : "Bet must be an integer between $1 and $50,000"
      );
      return;
    }

    const currentBalance = Number(userData?.walletBalance ?? 0);
    if (!Number.isFinite(currentBalance) || currentBalance < cleanBet) {
      setAutoSpinsLeft(0);
      toast.error(t("toast.insufficientFunds"));
      return;
    }

    cancelAnimationFrame(winCountRafRef.current);
    slamRequestedRef.current = false;
    pendingSpinRef.current = null;
    setShowAutoMenu(false);
    setHoveredPayline(null);
    setOpenBigWin(false);
    pauseAudio();
    setTotalWins(0);
    setDisplayWin(0);
    setWinLines([]);
    setReel3Anticipation(false);
    setIsSpinning(true);
    setResultReady(false);
    setSpinId((id) => id + 1);
    setLeverPulledSeq((s) => s + 1);

    sound.play("lever");
    sound.play("spin");

    try {
      const res: SlotProps = await spinSlots(cleanBet);
      const tease = detectReel3Anticipation(res.gridState);
      const useAnticipation = !turbo && tease.active;

      const delays: [number, number, number] = turbo
        ? [340, 520, 700]
        : useAnticipation
        ? [880, 1280, 2450]
        : [880, 1260, 1660];

      pendingSpinRef.current = {
        res,
        cleanBet,
        anticipation: useAnticipation,
      };

      setStopDelays(delays);
      setGrid(res.gridState);
      setResultReady(true);
    } catch (e: any) {
      setAutoSpinsLeft(0);
      toast.error(translateApiMessage(e, t("toast.connError")));
      pendingSpinRef.current = null;
      setResultReady(true);
      setSlamStopSeq((s) => s + 1);
      setIsSpinning(false);
    }
  }, [betAmount, es, isSpinning, t, toogleUserFlow, triggerSlamStop, turbo, userData]);

  // Exact mechanical reel stop callback fired on the slam frame of each column
  const handleReelStopped = useCallback(
    (colIndex: 0 | 1 | 2, landedWild: boolean) => {
      sound.play("reelStop", colIndex + 1);
      if (landedWild) {
        sound.play("wildLand");
      }

      const pending = pendingSpinRef.current;

      // Ignite dramatic golden lightning anticipation on Column 3 once Column 2 slams!
      if (colIndex === 1 && pending?.anticipation && !slamRequestedRef.current) {
        setReel3Anticipation(true);
        sound.play("anticipation");
      }

      // Final column settled -> reveal wins, sync wallet, trigger celebrations
      if (colIndex === 2) {
        setReel3Anticipation(false);
        setIsSpinning(false);

        if (!pending) return;
        const { res, cleanBet } = pending;
        pendingSpinRef.current = null;

        const payout = res.totalPayout || 0;
        const lines = res.lastSpinResult || [];
        const mult = cleanBet > 0 ? payout / cleanBet : 0;

        setResponse(res);
        setWinLines(lines);
        setTotalWins(payout);
        animateLedWinCounter(payout);

        setSpinHistory((prev) => [
          { id: Date.now() + Math.random(), mult, payout, bet: cleanBet },
          ...prev.slice(0, 9),
        ]);

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

        if (payout >= cleanBet * 8) {
          sound.play("bigWin");
          if (audioRef.current && !sound.isMuted()) {
            audioRef.current.volume = 0.22 * sound.getVolume();
            audioRef.current.play().catch(() => {});
          }
          setWinShakeSeq((s) => s + 1);
          setOpenBigWin(true);
          setAutoSpinsLeft(0); // Pause autoplay so player can savor Big Win
          coinRainEmitter.trigger(payout >= cleanBet * 25 ? 120 : 85);
        } else if (payout >= cleanBet * 3) {
          sound.play("win");
          sound.play("coins", 2);
          setWinShakeSeq((s) => s + 1);
          coinRainEmitter.trigger(34);
        } else if (payout > 0) {
          sound.play("win");
          coinRainEmitter.trigger(12);
        }
      }
    },
    [animateLedWinCounter, toogleUserData]
  );

  // Spacebar shortcut: Spin when idle, Slam-Stop when spinning!
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (openBigWin) {
        e.preventDefault();
        closeBigWin();
        return;
      }
      e.preventDefault();
      handleSpin();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSpin, openBigWin]);

  // Autoplay scheduler
  useEffect(() => {
    if (autoSpinsLeft === 0 || isSpinning || openBigWin) return;
    const balance = Number(userData?.walletBalance ?? 0);
    if (!userData || balance < betAmount) {
      setAutoSpinsLeft(0);
      return;
    }

    const hadWin = winLines.length > 0;
    const delayMs = turbo ? (hadWin ? 720 : 380) : hadWin ? 1350 : 650;

    const timer = setTimeout(() => {
      setAutoSpinsLeft((prev) => (prev > 0 ? prev - 1 : prev));
      handleSpin();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [autoSpinsLeft, betAmount, handleSpin, isSpinning, openBigWin, turbo, userData, winLines.length]);

  const hasWon = !isSpinning && totalWins > 0;
  const winMultiplier =
    hasWon && response?.betAmount ? response.totalPayout / response.betAmount : 0;

  // Identify winning symbols to highlight inside the Paytable
  const winningSymbols = useMemo(() => {
    const set = new Set<string>();
    if (!hasWon || !grid || grid.length < 9) return set;
    for (const wl of winLines) {
      const pl = PAYLINE_BY_ID[wl.line];
      if (!pl) continue;
      const syms = pl.cells.map((idx) => grid[idx]);
      const mainSym = syms.find((s) => s !== "wild") || "wild";
      set.add(mainSym);
      if (syms.includes("wild")) set.add("wild");
    }
    return set;
  }, [grid, hasWon, winLines]);

  const maxAffordable = Math.max(
    MIN_BET,
    Math.min(MAX_BET, Math.floor(Number(userData?.walletBalance ?? 10)))
  );

  const isAutoActive = autoSpinsLeft !== 0;

  return (
    <div className="w-full flex justify-center px-2 sm:px-4 pb-12 -mt-2">
      {openBigWin && (
        <BigWinAlert
          value={response?.totalPayout || 0}
          betAmount={response?.betAmount || betAmount}
          onClose={closeBigWin}
        />
      )}
      {showPaytableModal && (
        <Paytable
          betAmount={betAmount}
          winningSymbols={winningSymbols}
          hoveredPayline={hoveredPayline}
          onHoverPayline={setHoveredPayline}
          isModal
          onClose={() => setShowPaytableModal(false)}
        />
      )}
      <audio ref={audioRef} src={bigwin} />

      {/* Full AAA Imperial Treasury Vault Container */}
      <div className="w-full max-w-[1180px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/50 bg-[#0d0a07] shadow-[0_32px_80px_-14px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,233,168,0.14)] relative">
        {/* Top Imperial Gold Accent Hairline */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffe9a8]/90 to-transparent" />

        {/* Imperial Marquee Top Bar */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-6 py-3 bg-gradient-to-r from-[#21180d] via-[#2f2312] to-[#21180d] border-b border-[#d4af37]/35">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#fff2c2] to-[#8a6b18] p-[1.5px] shrink-0 shadow-[0_0_16px_rgba(212,175,55,0.55)]">
              <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                <FaCrown className="text-[#ffd966] text-sm" />
              </div>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text truncate">
                  {es ? "Fortuna del Coliseo" : "Colosseum Slots"}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2a1d08] border border-[#d4af37]/55 text-[10px] font-black font-mono text-[#ffe9a8]">
                  MAX 500x
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#a59574] font-semibold truncate">
                {es
                  ? "5 Líneas · Comodín León · Anticipación Relámpago"
                  : "5 Paylines · Lion Wild · Lightning Anticipation"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Turbo Mode Pill */}
            <button
              type="button"
              onClick={() => {
                sound.play("chip");
                setTurbo((v) => !v);
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 cursor-pointer ${
                turbo
                  ? "bg-gradient-to-r from-[#d97706] via-[#fbbf24] to-[#d97706] text-[#1a1103] border-[#fff3c4] shadow-[0_0_16px_rgba(251,191,36,0.55)]"
                  : "bg-[#151009] text-[#b9a77a] border-[#3e3219] hover:border-[#d4af37]/70 hover:text-[#ffe9a8]"
              }`}
              title={es ? "Modo Turbo (giros rápidos)" : "Turbo Mode (fast spins)"}
            >
              <FaBolt className={turbo ? "text-[#1a1103]" : "text-[#d4af37]"} />
              <span>TURBO</span>
            </button>

            {/* Mobile/Tablet Paytable trigger */}
            <button
              type="button"
              onClick={() => setShowPaytableModal(true)}
              className="lg:hidden px-3 py-1.5 rounded-full bg-[#1a140a] border border-[#d4af37]/50 text-[#ffd966] hover:bg-[#2c2110] flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"
            >
              <FaInfoCircle />
              <span>{es ? "Pagos" : "Paytable"}</span>
            </button>
          </div>
        </div>

        {/* Cinematic Imperial Treasury Stage Backdrop */}
        <div className="relative w-full overflow-hidden">
          {/* Painterly Vault Backdrop */}
          <img
            src={VAULT_BG}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-85"
          />

          {/* Flickering Warm Torchlight Auras synced over the Twin Roman Fire Braziers */}
          <div
            className="slot-brazier-flame absolute left-[17%] top-[44%] w-40 h-40 rounded-full pointer-events-none blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,175,50,0.34) 0%, rgba(220,90,15,0.12) 55%, transparent 75%)",
            }}
          />
          <div
            className="slot-brazier-flame absolute right-[17%] top-[44%] w-40 h-40 rounded-full pointer-events-none blur-2xl"
            style={{
              animationDelay: "0.28s",
              background:
                "radial-gradient(circle, rgba(255,175,50,0.34) 0%, rgba(220,90,15,0.12) 55%, transparent 75%)",
            }}
          />

          {/* Rising Golden Torch Embers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {AMBIENT_EMBERS.map((e) => (
              <motion.span
                key={e.id}
                initial={{ y: 260, opacity: 0, scale: 0.5 }}
                animate={{
                  y: [-10, -190],
                  x: [0, e.id % 2 === 0 ? 14 : -14, 0],
                  opacity: [0, 0.9, 0],
                  scale: [0.5, 1.1, 0.3],
                }}
                transition={{
                  duration: e.dur,
                  delay: e.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                style={{ left: e.left, bottom: "18%" }}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#ffd966] shadow-[0_0_8px_#ff9f1c]"
              />
            ))}
          </div>

          {/* Center Readability Vignette + Golden Celebration Glow */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500"
            style={{
              background: hasWon
                ? "radial-gradient(58% 60% at 44% 48%, rgba(212,175,55,0.2), rgba(7,5,4,0.72) 82%)"
                : "radial-gradient(60% 62% at 45% 48%, rgba(12,9,6,0.35), rgba(6,4,3,0.76) 85%)",
            }}
          />

          {/* Foreground Stage Content: Ornate Cabinet + Desktop Paytable */}
          <div className="relative z-10 w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-7 lg:gap-12">
            {/* MAIN SLOT CABINET */}
            <motion.div
              key={`cabinet-${winShakeSeq}`}
              animate={
                winShakeSeq > 0
                  ? { x: [0, -5, 5, -3, 3, 0], y: [0, -2, 2, 0] }
                  : { x: 0, y: 0 }
              }
              transition={{ duration: 0.36 }}
              className="w-full max-w-[540px] flex flex-col items-center sm:pr-6"
            >
              {/* Sculpted Imperial Roman Pediment Crown */}
              <div className="w-[88%] relative z-20 -mb-2">
                <div className="bg-gradient-to-b from-[#4a3614] via-[#2a1f0c] to-[#171108] rounded-t-3xl border-t-2 border-x-2 border-[#ffe28a]/75 px-4 py-2 shadow-[0_-8px_28px_rgba(212,175,55,0.25),inset_0_2px_6px_rgba(255,240,180,0.28)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                    <FaFire className="text-[#ffae34]" />
                    {es ? "Bóveda Imperial" : "Imperial Vault"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#b9a77a]">
                      {es ? "Comodín" : "Wild"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#120d06] border border-[#ffd966]/60 text-[11px] font-black font-mono text-[#fff2c2]">
                      100x
                    </span>
                  </div>
                </div>
              </div>

              {/* Heavy Gilded Bronze Cabinet Chassis */}
              <div className="w-full bg-gradient-to-b from-[#2f2312]/96 via-[#1c150c]/96 to-[#100c07]/96 backdrop-blur-sm rounded-[1.85rem] p-3 sm:p-5 shadow-[0_32px_75px_rgba(0,0,0,0.94),0_0_40px_rgba(212,175,55,0.14),inset_0_2px_4px_rgba(255,233,168,0.18)] border-2 border-[#d4af37]/75 relative">
                {/* Metallic Inner Bezel Housing Reels */}
                <div className="w-full bg-[#070604] rounded-2xl p-2 sm:p-3 border-[4px] border-[#493616] shadow-[inset_0_0_42px_rgba(0,0,0,1),0_0_20px_rgba(212,175,55,0.22)] relative">
                  <Game
                    grid={grid}
                    spinId={spinId}
                    resultReady={resultReady}
                    isSpinning={isSpinning}
                    turbo={turbo}
                    slamStopSeq={slamStopSeq}
                    reel3Anticipation={reel3Anticipation}
                    stopDelays={stopDelays}
                    winLines={winLines}
                    hoveredPayline={hoveredPayline}
                    onHoverPayline={setHoveredPayline}
                    onReelStopped={handleReelStopped}
                    onPullLever={handleSpin}
                    leverPulledSeq={leverPulledSeq}
                    es={es}
                  />
                </div>

                {/* Imperial LED Win / Status Display with Animated Rolling Counter */}
                <div
                  className={`w-full mt-3.5 rounded-xl border-[2px] flex items-center justify-between gap-2 min-h-[54px] px-3.5 relative overflow-hidden transition-all duration-300 ${
                    hasWon
                      ? "bg-gradient-to-r from-[#221706] via-[#38270a] to-[#221706] border-[#ffe28a] shadow-[inset_0_0_24px_rgba(255,215,0,0.28),0_0_24px_rgba(255,205,60,0.38)]"
                      : reel3Anticipation
                      ? "bg-gradient-to-r from-[#261405] via-[#3d2107] to-[#261405] border-[#fb923c] shadow-[0_0_22px_rgba(251,146,60,0.45)]"
                      : "bg-[#070605] border-[#322614] shadow-[inset_0_4px_14px_rgba(0,0,0,0.95)]"
                  }`}
                >
                  <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

                  <div className="flex-1 flex items-center justify-center gap-2 z-10 min-w-0">
                    <span
                      className={`font-mono tabular-nums text-base sm:text-xl font-black uppercase tracking-[0.14em] text-center truncate ${
                        hasWon
                          ? "text-[#fff5cc] drop-shadow-[0_0_14px_rgba(255,217,102,0.9)]"
                          : reel3Anticipation
                          ? "text-[#fdba74] animate-pulse"
                          : isSpinning
                          ? "text-[#e6ca6a] animate-pulse"
                          : "text-[#c8a84b]"
                      }`}
                    >
                      {hasWon ? (
                        <>
                          {t("games.won")}
                          <Monetary
                            value={displayWin}
                            showFraction={totalWins % 1 !== 0}
                          />
                        </>
                      ) : reel3Anticipation ? (
                        es ? "⚡ ¡LÍNEA DE ORO EN CAMINO! ⚡" : "⚡ BIG HIT INCOMING! ⚡"
                      ) : isSpinning ? (
                        resultReady
                          ? es
                            ? "GIRANDO · TOCÁ PARA PARAR"
                            : "SPINNING · TAP TO STOP"
                          : t("games.spinning")
                      ) : (
                        t("games.goodLuck")
                      )}
                    </span>

                    {hasWon && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#ffd966]/20 border border-[#ffe9a8]/70 text-[11px] font-black font-mono text-[#fff2c2]">
                        {winMultiplier.toFixed(1).replace(/\.0$/, "")}x
                        {winLines.length > 1 ? ` · ${winLines.length}L` : ""}
                      </span>
                    )}
                  </div>

                  {hasWon && winMultiplier >= 3 && (
                    <div className="shrink-0 z-10">
                      <ShareWinButton
                        gameName={es ? "Fortuna del Coliseo" : "Colosseum Slots"}
                        multiplier={winMultiplier}
                        payout={totalWins}
                        compact
                      />
                    </div>
                  )}
                </div>

                {/* Recent Spins Multiplier Ribbon */}
                {spinHistory.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2.5 px-1 overflow-x-auto no-scrollbar">
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-[#8a7d61]">
                      {es ? "Giros:" : "Spins:"}
                    </span>
                    {spinHistory.map((item) => (
                      <span
                        key={item.id}
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                          item.mult >= 8
                            ? "bg-gradient-to-b from-[#45320d] to-[#231805] border-[#ffd966]/80 text-[#fff2c2]"
                            : item.mult > 0
                            ? "bg-[#11281c] border-emerald-500/50 text-emerald-300"
                            : "bg-[#14100c] border-[#2d2418] text-[#7a6f59]"
                        }`}
                      >
                        {item.mult > 0
                          ? `${item.mult.toFixed(1).replace(/\.0$/, "")}x`
                          : "0x"}
                      </span>
                    ))}
                  </div>
                )}

                {/* AAA Control Deck */}
                <div className="flex flex-col gap-3.5 p-3.5 sm:p-4 mt-3 bg-gradient-to-b from-[#17120a]/95 to-[#0c0905]/95 rounded-2xl border border-[#d4af37]/30 shadow-[inset_0_8px_24px_rgba(0,0,0,0.85)]">
                  {/* Balance / Bet / Wins Stats Row */}
                  <div className="flex w-full items-stretch gap-2 sm:gap-2.5">
                    <ValueViewer type="balance" betAmount={betAmount} totalWins={totalWins} />
                    <ValueViewer type="bet" betAmount={betAmount} totalWins={totalWins} />
                    <ValueViewer type="wins" betAmount={betAmount} totalWins={totalWins} />
                  </div>

                  {/* Quick Bet Chips */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {QUICK_CHIPS.map((chip) => {
                      const selected = betAmount === chip;
                      return (
                        <button
                          key={chip}
                          type="button"
                          disabled={isSpinning || isAutoActive}
                          data-no-sfx
                          onClick={() => setCleanBet(chip)}
                          className={`py-1.5 rounded-lg text-[11px] sm:text-xs font-black font-mono tabular-nums transition-all border disabled:opacity-45 cursor-pointer ${
                            selected
                              ? "bg-gradient-to-b from-[#f0d472] to-[#a67e1c] text-[#1a1204] border-[#fff4cc] shadow-[0_0_12px_rgba(212,175,55,0.5)]"
                              : "bg-[#1f190f] text-[#dcd0b6] border-[#3e3219] hover:border-[#d4af37]/75 hover:text-[#ffe9a8]"
                          }`}
                        >
                          ${chip}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={isSpinning || isAutoActive}
                      data-no-sfx
                      onClick={() => setCleanBet(maxAffordable)}
                      className="py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#2e1414] text-[#ffb8b8] border border-[#822424] hover:border-[#d4af37] hover:text-[#ffe9a8] transition-all disabled:opacity-45 cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>

                  {/* Main Action Row: AUTO | [-] | SPIN / STOP | [+] | TURBO */}
                  <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-5 pt-1 relative">
                    {/* Autoplay Selector Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (isAutoActive) {
                            setAutoSpinsLeft(0);
                          } else {
                            setShowAutoMenu((v) => !v);
                          }
                        }}
                        className={`h-11 px-2.5 sm:px-3 rounded-xl border-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isAutoActive
                            ? "bg-[#3d1114] border-[#ef4444] text-[#ff8a93] shadow-[0_0_16px_rgba(239,68,68,0.45)]"
                            : "bg-[#19130a] border-[#4e3b15] text-[#e6ca6a] hover:border-[#ffe9a8]"
                        }`}
                        title={es ? "Giros automáticos" : "Autoplay spins"}
                      >
                        {isAutoActive ? (
                          <>
                            <FaStop className="text-xs mb-0.5" />
                            <span className="font-mono leading-none">
                              {autoSpinsLeft < 0 ? "∞" : autoSpinsLeft}
                            </span>
                          </>
                        ) : (
                          <>
                            <FaSyncAlt className="text-xs mb-0.5 text-[#d4af37]" />
                            <span className="leading-none">AUTO</span>
                          </>
                        )}
                      </button>

                      {/* Autoplay Presets Popover */}
                      <AnimatePresence>
                        {showAutoMenu && !isAutoActive && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.94 }}
                            className="absolute bottom-14 left-0 z-40 w-44 rounded-xl bg-[#140f09]/98 border border-[#d4af37]/65 p-2 shadow-[0_14px_36px_rgba(0,0,0,0.95)] backdrop-blur-md"
                          >
                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#a59574] px-1 mb-1.5">
                              {es ? "Giros Automáticos" : "Autoplay Spins"}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {AUTO_PRESETS.map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    setShowAutoMenu(false);
                                    if (!isSpinning) {
                                      setAutoSpinsLeft(
                                        preset.count > 0 ? preset.count - 1 : preset.count
                                      );
                                      handleSpin();
                                    } else {
                                      setAutoSpinsLeft(preset.count);
                                    }
                                  }}
                                  className="py-1.5 rounded-lg bg-[#22190c] border border-[#d4af37]/35 hover:border-[#ffe9a8] text-[#ffe9a8] text-xs font-black font-mono flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  <FaPlay className="text-[8px] text-[#d4af37]" />
                                  {preset.count < 0 ? <FaInfinity /> : preset.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Decrease Bet */}
                    <button
                      type="button"
                      data-no-sfx
                      disabled={isSpinning || isAutoActive || betAmount <= MIN_BET}
                      onClick={() => stepBet("subtract")}
                      aria-label={es ? "Reducir apuesta" : "Decrease bet"}
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-b from-[#2c2212] to-[#0d0a06] text-[#e6ca6a] text-xl font-black rounded-full transition-all border-2 border-[#5c4710] hover:border-[#ffe9a8] hover:text-[#ffe9a8] hover:shadow-[0_0_14px_rgba(212,175,55,0.45)] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.65)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      −
                    </button>

                    {/* Center Illuminated Imperial SPIN / SLAM-STOP Medallion */}
                    <div className="relative group">
                      <div
                        className={`absolute inset-[-6px] rounded-full blur-lg transition-opacity duration-300 ${
                          isSpinning
                            ? "bg-[#f59e0b]/40 opacity-80"
                            : "bg-[#c0262d]/60 opacity-75 group-hover:opacity-100 animate-pulse"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleSpin}
                        disabled={isSpinning && !resultReady}
                        className="relative w-24 h-24 sm:w-[106px] sm:h-[106px] rounded-full transition-transform active:scale-95 flex flex-col items-center justify-center disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
                        style={{
                          background: isSpinning
                            ? "radial-gradient(circle at 30% 25%, #b45309 0%, #6b2b06 60%, #2b1002 100%)"
                            : "radial-gradient(circle at 30% 25%, #ef4444 0%, #9b0f14 58%, #4a0407 100%)",
                          boxShadow: isSpinning
                            ? "0 0 0 4px #d4af37, 0 0 0 6px #4a370d, inset 0px -6px 16px rgba(0,0,0,0.7), 0 8px 22px rgba(0,0,0,0.8)"
                            : "0 0 0 4px #ffe28a, 0 0 0 6px #6b5012, inset 0px -8px 20px rgba(0,0,0,0.62), inset 0px 4px 14px rgba(255,200,200,0.48), 0 12px 28px rgba(0,0,0,0.8), 0 0 32px rgba(210,38,45,0.5)",
                        }}
                      >
                        <div className="absolute top-1 left-2 right-2 h-[38%] rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                        <span className="text-white font-black text-base sm:text-lg uppercase tracking-[0.14em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-10">
                          {isSpinning
                            ? es
                              ? "PARAR"
                              : "STOP"
                            : t("games.spin")}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums font-bold text-[#ffe9a8] z-10 mt-0.5">
                          ${betAmount.toLocaleString("en-US")}
                        </span>
                      </button>
                    </div>

                    {/* Increase Bet */}
                    <button
                      type="button"
                      data-no-sfx
                      disabled={isSpinning || isAutoActive || betAmount >= MAX_BET}
                      onClick={() => stepBet("add")}
                      aria-label={es ? "Aumentar apuesta" : "Increase bet"}
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-b from-[#2c2212] to-[#0d0a06] text-[#e6ca6a] text-xl font-black rounded-full transition-all border-2 border-[#5c4710] hover:border-[#ffe9a8] hover:text-[#ffe9a8] hover:shadow-[0_0_14px_rgba(212,175,55,0.45)] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.65)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      +
                    </button>

                    {/* Compact Turbo Quick Toggle */}
                    <button
                      type="button"
                      data-no-sfx
                      onClick={() => {
                        sound.play("chip");
                        setTurbo((v) => !v);
                      }}
                      className={`h-11 px-2.5 sm:px-3 rounded-xl border-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex flex-col items-center justify-center transition-all cursor-pointer ${
                        turbo
                          ? "bg-gradient-to-b from-[#f59e0b] to-[#b45309] border-[#fff2c2] text-[#1a1103] shadow-[0_0_16px_rgba(245,158,11,0.55)]"
                          : "bg-[#19130a] border-[#4e3b15] text-[#e6ca6a] hover:border-[#ffe9a8]"
                      }`}
                      title={es ? "Activar / desactivar modo Turbo" : "Toggle Turbo mode"}
                    >
                      <FaBolt className={`text-xs mb-0.5 ${turbo ? "text-[#1a1103]" : "text-[#d4af37]"}`} />
                      <span className="leading-none">FAST</span>
                    </button>
                  </div>

                  {/* Exact Custom Bet Input + Keyboard Hint */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#d4af37]/15">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="slot-custom-bet"
                        className="text-[10px] uppercase tracking-widest text-[#9b8d6f] font-bold"
                      >
                        {es ? "Apuesta:" : "Bet:"}
                      </label>
                      <div className="flex items-center bg-[#090806] border border-[#3e3219] focus-within:border-[#d4af37] rounded-lg px-2.5 py-1 w-28 transition-colors">
                        <span className="text-[#d4af37] font-bold text-xs mr-1">$</span>
                        <input
                          id="slot-custom-bet"
                          type="text"
                          inputMode="numeric"
                          disabled={isSpinning || isAutoActive}
                          value={betInput}
                          onChange={(e) => handleBetInputChange(e.target.value)}
                          onBlur={handleBetInputBlur}
                          className="w-full bg-transparent text-white font-mono tabular-nums font-bold text-xs sm:text-sm outline-none"
                        />
                      </div>
                    </div>

                    <span className="hidden sm:inline text-[10px] text-[#8d7f63] font-semibold">
                      {es ? "Espacio = Girar / Parar" : "Space = Spin / Stop"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Desktop Interactive Side Paytable Panel */}
            <div className="hidden lg:block w-[325px] shrink-0 pt-4">
              <Paytable
                betAmount={betAmount}
                winningSymbols={winningSymbols}
                hoveredPayline={hoveredPayline}
                onHoverPayline={setHoveredPayline}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Slots;

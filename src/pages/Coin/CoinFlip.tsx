import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaCoins, FaCrown, FaFire, FaShieldAlt, FaWhatsapp } from "react-icons/fa";
import SocketConnection from "../../services/socket";
import Coin, { CARA_IMG, CRUZ_IMG } from "./Coin";
import { motion, AnimatePresence } from "framer-motion";
import UserContext from "../../UserContext";
import LiveBets from "./LiveBets";
import sound from "../../services/sound";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import { coinRainEmitter } from "../../components/CoinRain";

const socket = SocketConnection.getInstance();
const PAYOUT_MULTIPLIER = 1.95;
const MAX_BET = 50000;
const COIN_ARENA_BG = "/images/coin/arena_altar_bg.webp";

interface GameHistory {
  result: number;
}

interface RoundOutcome {
  won: boolean;
  payout: number;
}

const LANDING_SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const radius = 85 + (i % 3) * 32;
  return {
    id: i,
    tx: Math.cos(angle) * radius,
    ty: Math.sin(angle) * radius * 0.65,
    size: 4 + (i % 2) * 2.5,
  };
});

const ALTAR_EMBERS = [
  { id: 0, left: "10%", delay: 0.0, dur: 4.2, crimson: true },
  { id: 1, left: "17%", delay: 1.4, dur: 3.8, crimson: true },
  { id: 2, left: "24%", delay: 0.6, dur: 4.8, crimson: true },
  { id: 3, left: "76%", delay: 0.3, dur: 4.4, crimson: false },
  { id: 4, left: "83%", delay: 1.9, dur: 3.9, crimson: false },
  { id: 5, left: "90%", delay: 0.9, dur: 4.6, crimson: false },
];

const CoinFlip = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const [bet, setBet] = useState<number>(10);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [countDown, setCountDown] = useState<number>(0);
  const [userGambled, setUserGambled] = useState<boolean>(false);
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome | null>(null);
  const [landShakeSeq, setLandShakeSeq] = useState<number>(0);
  const [gameState, setGameState] = useState<any>({
    heads: { players: {}, bets: {}, choices: {} },
    tails: { players: {}, bets: {}, choices: {} },
  });

  const activeBetRef = useRef<{ gambled: boolean; choice: number | null; amount: number }>({
    gambled: false,
    choice: null,
    amount: 0,
  });
  const resultTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { isLogged, userData, toogleUserFlow } = useContext(UserContext);

  const clearResultTimers = () => {
    resultTimersRef.current.forEach(clearTimeout);
    resultTimersRef.current = [];
  };

  useEffect(() => clearResultTimers, []);

  const userBalance = Number(userData?.walletBalance ?? 0);
  const cleanBet = Math.floor(Number(bet) || 0);
  const betDisabled =
    choice === null ||
    cleanBet < 1 ||
    userGambled ||
    (userData !== null && userBalance < cleanBet) ||
    spinning ||
    cleanBet > MAX_BET;

  const handleBet = useCallback(() => {
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }

    if (betDisabled || choice === null) return;

    socket.emit("coinFlip:bet", cleanBet, choice);
    sound.play("chip");

    setUserGambled(true);
    activeBetRef.current = { gambled: true, choice, amount: cleanBet };
  }, [betDisabled, choice, cleanBet, isLogged, toogleUserFlow]);

  // Keyboard shortcuts: 1 = Cara, 2 = Cruz, Space = Apostar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "1" && !spinning && !userGambled) {
        sound.play("chip");
        setChoice(0);
      } else if (e.key === "2" && !spinning && !userGambled) {
        sound.play("chip");
        setChoice(1);
      } else if (e.code === "Space" && !betDisabled) {
        e.preventDefault();
        handleBet();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [betDisabled, handleBet, spinning, userGambled]);

  useEffect(() => {
    const startListener = () => {
      clearResultTimers();
      sound.play("flip");
      setResult(null);
      setLastOutcome(null);
      setSpinning(true);
      setCountDown(0);
      setGameEnded(false);
    };

    const resultListener = (flipResult: number) => {
      setResult(flipResult);
      setSpinning(false);

      const landTimer = setTimeout(() => {
        sound.play("coinLand");
        setLandShakeSeq((s) => s + 1);
      }, 420);
      resultTimersRef.current.push(landTimer);

      const { gambled, choice: userChoice, amount } = activeBetRef.current;
      if (gambled) {
        const won = userChoice === flipResult;
        const payout = Math.round(amount * PAYOUT_MULTIPLIER * 100) / 100;
        const outcomeTimer = setTimeout(() => {
          setLastOutcome({ won, payout });
          if (won) {
            sound.play("win");
            coinRainEmitter.trigger(55);
          } else {
            sound.play("lose");
          }
        }, 720);
        resultTimersRef.current.push(outcomeTimer);
      }

      const resetTimer = setTimeout(() => {
        setHistory((prevHistory) => [...prevHistory, { result: flipResult }]);
        setGameEnded(true);
        setCountDown(7.4);
        setGameState({
          heads: { players: {}, bets: {}, choices: {} },
          tails: { players: {}, bets: {}, choices: {} },
        });
      }, 1350);
      resultTimersRef.current.push(resetTimer);

      setUserGambled(false);
      activeBetRef.current = { gambled: false, choice: null, amount: 0 };
    };

    socket.on("coinFlip:start", startListener);
    socket.on("coinFlip:result", resultListener);

    return () => {
      socket.off("coinFlip:start", startListener);
      socket.off("coinFlip:result", resultListener);
    };
  }, []);

  useEffect(() => {
    const gameStateListener = (nextState: any) => {
      setGameState(nextState);
    };

    socket.on("coinFlip:gameState", gameStateListener);
    return () => {
      socket.off("coinFlip:gameState", gameStateListener);
    };
  }, []);

  useEffect(() => {
    if (countDown > 0.1 && !spinning) {
      const id = setTimeout(() => {
        setCountDown((c) => Math.max(0, c - 0.1));
      }, 100);
      return () => clearTimeout(id);
    }
  }, [countDown, spinning]);

  const sides = [
    {
      id: 0,
      label: t("games.heads"),
      subtitle: es ? "Legión León" : "Lion Legion",
      img: CARA_IMG,
      glow: "shadow-[0_0_30px_rgba(230,57,70,0.58)]",
      border: "border-[#ef4444]",
      selectedBg: "bg-gradient-to-b from-[#3d1115] via-[#240a0c] to-[#120607]",
      accent: "text-[#ff949c]",
    },
    {
      id: 1,
      label: t("games.tails"),
      subtitle: es ? "Guardia Yelmo" : "Helm Guard",
      img: CRUZ_IMG,
      glow: "shadow-[0_0_30px_rgba(255,215,0,0.55)]",
      border: "border-[#ffd966]",
      selectedBg: "bg-gradient-to-b from-[#3b2b0e] via-[#211707] to-[#120d04]",
      accent: "text-[#fff2c2]",
    },
  ];

  const maxAllowed = Math.min(Math.floor(userBalance > 0 ? userBalance : 1000), MAX_BET);
  const quickBets: { label: string; apply: (b: number) => number }[] = [
    { label: "½", apply: (b) => Math.max(1, Math.floor(b / 2)) },
    { label: "x2", apply: (b) => Math.max(1, b * 2) },
    { label: "+10", apply: (b) => b + 10 },
    { label: "+100", apply: (b) => b + 100 },
    { label: "MAX", apply: () => Math.max(1, Math.floor(maxAllowed)) },
  ];

  const showResult = result !== null && !spinning;
  const resultSide = sides.find((s) => s.id === result);

  // Live Pot Tug-of-War calculation
  const headsTotal = Object.values(gameState?.heads?.bets || {}).reduce(
    (sum: number, v: any) => sum + Number(v || 0),
    0
  );
  const tailsTotal = Object.values(gameState?.tails?.bets || {}).reduce(
    (sum: number, v: any) => sum + Number(v || 0),
    0
  );
  const combinedPot = headsTotal + tailsTotal;
  const headsPct = combinedPot > 0 ? Math.round((headsTotal / combinedPot) * 100) : 50;
  const tailsPct = combinedPot > 0 ? 100 - headsPct : 50;

  // History stats & live Hot Streak Detector
  const recentHistory = history.slice(-20);
  const recentHeads = recentHistory.filter((h) => h.result === 0).length;
  const recentTails = recentHistory.length - recentHeads;

  const hotStreak = useMemo(() => {
    if (history.length < 2) return null;
    const latest = history[history.length - 1].result;
    let count = 1;
    for (let i = history.length - 2; i >= 0; i--) {
      if (history[i].result === latest) count++;
      else break;
    }
    return count >= 2 ? { side: latest, count } : null;
  }, [history]);

  const estimatedPayout = Math.round(cleanBet * PAYOUT_MULTIPLIER * 100) / 100;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2">
      {/* Main AAA Colosseum CoinFlip Container */}
      <div className="w-full max-w-[1180px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/50 bg-[#0d0a07] shadow-[0_32px_80px_-14px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,233,168,0.14)]">
        {/* Top Imperial Gold Accent Hairline */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffe9a8]/90 to-transparent" />

        {/* Imperial Marquee Header */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-[#21180d] via-[#2f2312] to-[#21180d] border-b border-[#d4af37]/35">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#fff2c2] to-[#8a6b18] p-[1.5px] shrink-0 shadow-[0_0_16px_rgba(212,175,55,0.5)]">
              <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                <FaCrown className="text-[#ffd966] text-sm" />
              </div>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text truncate">
                  {es ? "Arena Cara o Cruz" : "Colosseum Coin Flip"}
                </h1>
                {hotStreak && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      hotStreak.side === 0
                        ? "bg-[#3a1216] border-[#ef4444]/70 text-[#ff949c]"
                        : "bg-[#33250b] border-[#ffd966]/70 text-[#fff2c2]"
                    }`}
                  >
                    <FaFire className="text-amber-300" />
                    {hotStreak.count}x {hotStreak.side === 0 ? t("games.heads") : t("games.tails")}
                  </span>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#a59574] font-semibold">
                {es ? "Altar de la Fortuna · En Vivo · Paga x1.95" : "Altar of Fortune · Live · Pays 1.95x"}
              </span>
            </div>
          </div>

          {/* Live Round Status Pill + 1v1 WhatsApp Duel Shortcut */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/duel"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#132919] hover:bg-[#1c3d24] border border-emerald-400/50 text-[11px] font-black uppercase tracking-wider text-emerald-300 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            >
              <FaWhatsapp className="text-sm text-emerald-400" />
              <span>{es ? "Duelo 1v1" : "1v1 Duel"}</span>
            </Link>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider ${
                spinning
                  ? "bg-[#3a1618]/85 border-[#ef4444]/65 text-[#ffb3b8]"
                  : gameEnded && countDown > 0.1
                  ? "bg-[#2c210e]/85 border-[#ffd966]/65 text-[#ffe9a8]"
                  : "bg-[#15281a]/80 border-emerald-400/50 text-emerald-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  spinning
                    ? "bg-[#ff4d5a] animate-ping"
                    : gameEnded && countDown > 0.1
                    ? "bg-[#ffd966] animate-pulse"
                    : "bg-emerald-400 animate-pulse"
                }`}
              />
              {spinning ? (
                <span>{t("games.spinning")}</span>
              ) : gameEnded && countDown > 0.1 ? (
                <span className="font-mono tabular-nums">
                  {t("games.nextGameIn")} {countDown.toFixed(1)}s
                </span>
              ) : (
                <span>{es ? "Apuestas abiertas" : "Bets open"}</span>
              )}
            </div>
          </div>
        </div>

        {/* Body: Left Betting Panel + Right Cinematic Imperial Altar */}
        <div className="flex flex-col lg:flex-row">
          {/* ---------- Bet Panel ---------- */}
          <div className="lg:w-[356px] shrink-0 flex flex-col gap-4 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-[#d4af37]/25 bg-gradient-to-b from-[#15100a] to-[#0d0a06]">
            {/* Bet Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="coinflip-bet"
                  className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5"
                >
                  <FaCoins className="text-[#d4af37] text-xs" />
                  {t("games.bet")}
                </label>
                {userData && (
                  <span className="text-[11px] font-mono tabular-nums text-[#9b8d6f]">
                    {t("games.balance")}:{" "}
                    <span className="text-[#ffe9a8] font-bold">
                      <Monetary value={Math.floor(userBalance)} />
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#080705] focus-within:border-[#d4af37] focus-within:shadow-[0_0_16px_rgba(212,175,55,0.22)] transition-all">
                <span className="pl-3.5 text-[#d4af37] font-black text-lg">$</span>
                <input
                  id="coinflip-bet"
                  type="number"
                  min={1}
                  max={MAX_BET}
                  value={bet || ""}
                  placeholder="10"
                  onKeyDown={(event) => {
                    if (
                      !/[0-9]/.test(event.key) &&
                      !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(event.key)
                    ) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const value = Math.floor(Number(e.target.value));
                    setBet(!Number.isFinite(value) || value < 0 ? 0 : Math.min(MAX_BET, value));
                  }}
                  className="w-full bg-transparent py-2.5 px-2.5 text-white font-mono tabular-nums font-black text-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {quickBets.map((q) => (
                  <button
                    key={q.label}
                    id={`coinflip-quick-${q.label}`}
                    type="button"
                    data-no-sfx
                    onClick={() => {
                      sound.play("chip");
                      setBet((b) => Math.max(1, Math.min(MAX_BET, Math.floor(q.apply(b || 0)))));
                    }}
                    className={`py-1.5 rounded-lg text-xs font-black font-mono transition-all border cursor-pointer ${
                      q.label === "MAX"
                        ? "bg-[#2e1414] text-[#ffb8b8] border-[#822424] hover:border-[#d4af37] hover:text-[#ffe9a8]"
                        : "bg-[#221b11] text-[#e7ddc8] border-[#3e3219] hover:border-[#d4af37]/75 hover:text-[#ffe9a8]"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Side Selector */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5">
                <FaShieldAlt className="text-[#d4af37] text-xs" />
                {t("games.chooseSide")}
              </span>
              <div className="grid grid-cols-2 gap-3">
                {sides.map((s) => {
                  const selected = choice === s.id;
                  return (
                    <button
                      key={s.id}
                      id={`coinflip-side-${s.id === 0 ? "heads" : "tails"}`}
                      type="button"
                      data-no-sfx
                      onClick={() => {
                        sound.play("chip");
                        setChoice(s.id);
                      }}
                      aria-pressed={selected}
                      className={`group relative flex flex-col items-center gap-2 rounded-2xl p-3.5 border-2 transition-all duration-200 overflow-hidden cursor-pointer ${
                        selected
                          ? `${s.border} ${s.selectedBg} ${s.glow} -translate-y-0.5`
                          : "border-[#3a2f1d]/75 bg-[#14100b] hover:border-[#d4af37]/60"
                      }`}
                    >
                      <span className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-[#8a7d61]">
                        {s.id + 1}
                      </span>
                      {selected && (
                        <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#ffe9a8] shadow-[0_0_8px_#ffd966]" />
                      )}
                      <img
                        src={s.img}
                        alt={s.label}
                        className={`w-16 h-16 rounded-full transition-transform duration-300 drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)] ${
                          selected ? "scale-110" : "group-hover:scale-105 opacity-85 group-hover:opacity-100"
                        }`}
                      />
                      <div className="flex flex-col items-center leading-tight">
                        <span className="font-black uppercase tracking-wider text-white text-sm">
                          {s.label}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${s.accent}`}>
                          {s.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Potential Payout Strip */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0a0806] border border-[#d4af37]/25">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#9b8d6f]">
                {es ? "Premio potencial (x1.95)" : "Potential payout (1.95x)"}
              </span>
              <span className="font-mono tabular-nums font-black text-base text-[#fff2c2]">
                <Monetary value={estimatedPayout} showFraction={estimatedPayout % 1 !== 0} />
              </span>
            </div>

            {/* Enter Game CTA */}
            <div className="mt-auto flex flex-col gap-1.5">
              <button
                id="coinflip-enter"
                type="button"
                onClick={handleBet}
                disabled={betDisabled}
                className="w-full py-4 rounded-xl font-black uppercase tracking-[0.16em] text-sm sm:text-base text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] border border-[#fff2c2]/70 shadow-[0_10px_28px_rgba(212,175,55,0.4)] transition-all duration-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
              >
                {spinning
                  ? t("games.spinning")
                  : choice === null
                  ? t("games.chooseSide")
                  : cleanBet < 1
                  ? t("games.placeBetValue")
                  : cleanBet > MAX_BET
                  ? t("games.maxBet")
                  : userGambled
                  ? t("games.youreIn")
                  : userData !== null && userBalance < cleanBet
                  ? t("games.notEnough")
                  : t("games.enterGame")}
              </button>
              <span className="hidden sm:block text-[10px] text-center text-[#8d7f63] font-semibold">
                {es ? "1 = Cara · 2 = Cruz · Espacio = Apostar" : "1 = Heads · 2 = Tails · Space = Bet"}
              </span>
            </div>
          </div>

          {/* ---------- AAA Cinematic Colosseum Altar Arena ---------- */}
          <div className="flex-1 flex flex-col min-w-0">
            <motion.div
              key={`arena-shake-${landShakeSeq}`}
              animate={
                landShakeSeq > 0
                  ? { y: [0, 5, -3, 2, 0] }
                  : { y: 0 }
              }
              transition={{ duration: 0.32 }}
              className="coin-arena relative flex items-center justify-center h-[355px] sm:h-[420px] overflow-hidden bg-[#090705]"
              style={{ perspective: "1200px" }}
            >
              {/* Full-bleed Painterly Colosseum Altar of Fortune Backdrop */}
              <img
                src={COIN_ARENA_BG}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-85"
              />

              {/* Rival Faction Brazier Flickering Glows (Crimson Left vs Gold Right) */}
              <div
                className="slot-brazier-flame absolute left-[12%] top-[44%] w-36 h-36 rounded-full pointer-events-none blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(239,68,68,0.42) 0%, rgba(190,30,30,0.14) 55%, transparent 75%)",
                }}
              />
              <div
                className="slot-brazier-flame absolute right-[12%] top-[44%] w-36 h-36 rounded-full pointer-events-none blur-2xl"
                style={{
                  animationDelay: "0.32s",
                  background:
                    "radial-gradient(circle, rgba(255,205,60,0.42) 0%, rgba(212,150,20,0.14) 55%, transparent 75%)",
                }}
              />

              {/* Drifting Crimson & Golden Altar Embers */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {ALTAR_EMBERS.map((e) => (
                  <motion.span
                    key={e.id}
                    initial={{ y: 200, opacity: 0, scale: 0.5 }}
                    animate={{
                      y: [-10, -210],
                      x: [0, e.crimson ? 12 : -12, 0],
                      opacity: [0, 0.9, 0],
                      scale: [0.5, 1.15, 0.3],
                    }}
                    transition={{
                      duration: e.dur,
                      delay: e.delay,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    style={{ left: e.left, bottom: "16%" }}
                    className={`absolute w-1.5 h-1.5 rounded-full ${
                      e.crimson
                        ? "bg-[#ff6b72] shadow-[0_0_8px_#ef4444]"
                        : "bg-[#ffe28a] shadow-[0_0_8px_#f59e0b]"
                    }`}
                  />
                ))}
              </div>

              {/* Atmospheric Vignette shifting to winning faction spotlight */}
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-500"
                style={{
                  background: showResult
                    ? result === 0
                      ? "radial-gradient(56% 58% at 50% 48%, rgba(230,57,70,0.22), rgba(7,5,4,0.72) 84%)"
                      : "radial-gradient(56% 58% at 50% 48%, rgba(255,215,0,0.22), rgba(7,5,4,0.72) 84%)"
                    : "radial-gradient(60% 60% at 50% 48%, rgba(12,9,6,0.22), rgba(6,4,3,0.74) 86%)",
                }}
              />

              {/* Overhead Countdown Bar */}
              {gameEnded && countDown > 0.1 && (
                <div className="absolute top-0 left-0 right-0 z-30">
                  <div className="h-1.5 bg-black/55">
                    <div
                      className="h-full bg-gradient-to-r from-[#b8901f] via-[#fff2c2] to-[#b8901f] shadow-[0_0_14px_rgba(255,217,102,0.8)] transition-[width] duration-100 ease-linear"
                      style={{ width: `${Math.max(0, Math.min(100, (countDown / 7.4) * 100))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rotating Imperial Sunburst behind the coin */}
              <motion.div
                animate={{
                  rotate: 360,
                  opacity: spinning ? 0.44 : showResult ? 0.36 : 0.16,
                  scale: spinning ? 1.12 : 1,
                }}
                transition={{
                  rotate: { duration: spinning ? 6.5 : 24, repeat: Infinity, ease: "linear" },
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.5 },
                }}
                className="absolute w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] rounded-full pointer-events-none"
                style={{
                  background:
                    showResult && result === 0
                      ? "repeating-conic-gradient(from 0deg, rgba(239,68,68,0.48) 0deg 10deg, transparent 10deg 24deg)"
                      : "repeating-conic-gradient(from 0deg, rgba(255,215,64,0.46) 0deg 10deg, transparent 10deg 24deg)",
                  maskImage: "radial-gradient(circle, black 15%, transparent 66%)",
                  WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 66%)",
                }}
              />

              {/* Double Landing Shockwave Rings + Radial Metallic Sparks */}
              <AnimatePresence>
                {showResult && resultSide && (
                  <div
                    key={`burst-${history.length}-${result}-${landShakeSeq}`}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[15] flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0.45, opacity: 0.95 }}
                      animate={{ scale: 2.15, opacity: 0 }}
                      transition={{ duration: 1.0, ease: "easeOut" }}
                      className={`absolute w-48 h-48 rounded-full border-2 ${
                        result === 0
                          ? "border-[#ff5c67] shadow-[0_0_24px_rgba(239,68,68,0.75)]"
                          : "border-[#ffe28a] shadow-[0_0_24px_rgba(255,215,0,0.75)]"
                      }`}
                    />
                    <motion.div
                      initial={{ scale: 0.35, opacity: 0.85 }}
                      animate={{ scale: 1.65, opacity: 0 }}
                      transition={{ duration: 0.72, delay: 0.1, ease: "easeOut" }}
                      className={`absolute w-44 h-44 rounded-full border ${
                        result === 0 ? "border-red-300" : "border-yellow-100"
                      }`}
                    />
                    {LANDING_SPARKS.map((sp) => (
                      <motion.span
                        key={sp.id}
                        initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                        animate={{ x: sp.tx, y: sp.ty, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.78, ease: "easeOut" }}
                        style={{ width: sp.size, height: sp.size }}
                        className={`absolute rounded-full ${
                          result === 0
                            ? "bg-[#ff8a93] shadow-[0_0_8px_#ef4444]"
                            : "bg-[#fff3b0] shadow-[0_0_8px_#ffd966]"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>

              {/* Corner Faction Crests */}
              <div className="hidden sm:flex absolute left-5 top-5 items-center gap-2 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-[#ef4444]/40 pointer-events-none z-20">
                <img src={CARA_IMG} alt="" className="w-5 h-5 rounded-full ring-1 ring-[#ef4444]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff9ea5]">
                  {t("games.heads")}
                </span>
              </div>
              <div className="hidden sm:flex absolute right-5 top-5 items-center gap-2 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-[#ffd966]/45 pointer-events-none z-20">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                  {t("games.tails")}
                </span>
                <img src={CRUZ_IMG} alt="" className="w-5 h-5 rounded-full ring-1 ring-[#ffd966]" />
              </div>

              {/* 3D Altar Pedestal Rings */}
              <div className="coin-pedestal-ring" />
              <div className="coin-pedestal-inner-ring" />
              <div
                className={`coin-pedestal transition-all duration-300 ${
                  spinning ? "scale-75 opacity-55 blur-[2px]" : "scale-100 opacity-95"
                }`}
              />

              {/* 3D Solid Gold Aureus Coin */}
              <div className="relative z-10 -mt-9">
                <Coin spinning={spinning} result={result} />
              </div>

              {/* Result + Personal Win/Loss Banner */}
              <AnimatePresence>
                {showResult && resultSide && (
                  <motion.div
                    key={`res-${history.length}-${result}`}
                    initial={{ opacity: 0, y: 16, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-1.5 z-20 px-4 pointer-events-none"
                  >
                    <div
                      className={`px-6 py-2 rounded-full border-2 bg-[#0d0a08]/92 backdrop-blur-md flex items-center gap-2.5 ${resultSide.border} ${resultSide.glow}`}
                    >
                      <img src={resultSide.img} alt="" className="w-6 h-6 rounded-full" />
                      <span className="font-black uppercase tracking-[0.18em] text-white text-sm sm:text-base">
                        {t("games.landedOn", { side: resultSide.label })}
                      </span>
                    </div>

                    {lastOutcome && (
                      <div className="flex items-center gap-2 pointer-events-auto">
                        <div
                          className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-lg ${
                            lastOutcome.won
                              ? "bg-gradient-to-r from-[#2e220a] via-[#4a3610] to-[#2e220a] border-[#ffd966] text-[#fff2c2]"
                              : "bg-black/80 border-white/15 text-[#b9a77a]"
                          }`}
                        >
                          {lastOutcome.won ? (
                            <>
                              {t("games.won")}+
                              <Monetary
                                value={lastOutcome.payout}
                                showFraction={lastOutcome.payout % 1 !== 0}
                              />
                            </>
                          ) : (
                            t("games.youLost")
                          )}
                        </div>
                        {lastOutcome.won && lastOutcome.payout > 0 && (
                          <ShareWinButton
                            gameName={es ? "Cara o Cruz" : "Coin Flip"}
                            multiplier={PAYOUT_MULTIPLIER}
                            payout={lastOutcome.payout}
                            compact
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Live Tug-of-War Pot Bar */}
            <div className="px-4 sm:px-5 py-3 bg-[#110d09] border-t border-[#d4af37]/25 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold font-mono tabular-nums">
                <span className="text-[#ff8a93] flex items-center gap-1.5">
                  <span className="uppercase font-sans tracking-wider">{t("games.heads")}</span>
                  <span>{headsPct}%</span>
                  {headsTotal > 0 && (
                    <span className="text-[#9b8d6f]">
                      (<Monetary value={headsTotal} />)
                    </span>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-[#8a7f63] font-sans hidden sm:inline">
                  {es ? "Pozo en vivo" : "Live pot"}
                </span>
                <span className="text-[#ffe9a8] flex items-center gap-1.5">
                  {tailsTotal > 0 && (
                    <span className="text-[#9b8d6f]">
                      (<Monetary value={tailsTotal} />)
                    </span>
                  )}
                  <span>{tailsPct}%</span>
                  <span className="uppercase font-sans tracking-wider">{t("games.tails")}</span>
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#1e1810] overflow-hidden flex border border-[#d4af37]/25 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#8f181f] to-[#ef4444] transition-all duration-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  style={{ width: `${headsPct}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-[#b8860b] to-[#ffe28a] transition-all duration-500 shadow-[0_0_12px_rgba(255,215,0,0.45)]"
                  style={{ width: `${tailsPct}%` }}
                />
              </div>
            </div>

            {/* Last Results Strip */}
            <div className="flex flex-col gap-2 px-4 sm:px-5 py-3.5 border-t border-[#d4af37]/15 bg-[#0e0b08]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold">
                  {t("games.lastResults")}
                </h3>
                {recentHistory.length > 0 && (
                  <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums font-bold">
                    <span className="text-[#ff8a93]">
                      {t("games.heads")}: {recentHeads}
                    </span>
                    <span className="text-[#5c4f3a]">·</span>
                    <span className="text-[#ffe9a8]">
                      {t("games.tails")}: {recentTails}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end w-full overflow-hidden h-[36px]">
                {recentHistory.length === 0 ? (
                  <span className="text-xs text-[#6f6552] italic">
                    {es ? "Esperando el primer lanzamiento..." : "Waiting for the first flip..."}
                  </span>
                ) : (
                  recentHistory.map((e, i, arr) => {
                    const isLatest = i === arr.length - 1;
                    return (
                      <motion.img
                        key={history.length - arr.length + i}
                        src={e.result === 0 ? CARA_IMG : CRUZ_IMG}
                        alt={e.result === 0 ? t("games.heads") : t("games.tails")}
                        title={e.result === 0 ? t("games.heads") : t("games.tails")}
                        className={`rounded-full object-cover ring-2 transition-transform hover:scale-110 ${
                          isLatest
                            ? "w-[32px] h-[32px] min-w-[32px]"
                            : "w-[26px] h-[26px] min-w-[26px] opacity-85"
                        } ${
                          e.result === 0
                            ? isLatest
                              ? "ring-[#ff4d5a] shadow-[0_0_12px_rgba(230,57,70,0.75)]"
                              : "ring-[#c0262d]/80"
                            : isLatest
                            ? "ring-[#ffe9a8] shadow-[0_0_12px_rgba(255,217,102,0.75)]"
                            : "ring-[#d4af37]/80"
                        }`}
                        initial={isLatest ? { opacity: 0, x: 28, scale: 0.5 } : false}
                        animate={{ opacity: isLatest ? 1 : 0.85, x: 0, scale: 1 }}
                        transition={{ ease: "easeOut", duration: 0.55 }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Bets Grid */}
      <div className="w-full max-w-[1180px] grid grid-cols-1 md:grid-cols-2 gap-5">
        {gameState && (
          <>
            <LiveBets
              gameState={gameState}
              type="Heads"
              isWinner={showResult && result === 0}
              currentUserId={userData?.id}
            />
            <LiveBets
              gameState={gameState}
              type="Tails"
              isWinner={showResult && result === 1}
              currentUserId={userData?.id}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CoinFlip;

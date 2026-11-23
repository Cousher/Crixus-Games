import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCrown, FaShieldAlt, FaCoins } from "react-icons/fa";
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

interface GameHistory {
  result: number;
}

interface RoundOutcome {
  won: boolean;
  payout: number;
}

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

  const handleBet = () => {
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }

    const cleanBet = Math.floor(Number(bet));
    if (!Number.isFinite(cleanBet) || cleanBet < 1 || cleanBet > MAX_BET || choice === null) return;

    socket.emit("coinFlip:bet", cleanBet, choice);
    sound.play("chip");

    setUserGambled(true);
    activeBetRef.current = { gambled: true, choice, amount: cleanBet };
  };

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

      const { gambled, choice: userChoice, amount } = activeBetRef.current;
      if (gambled) {
        const won = userChoice === flipResult;
        const payout = Math.round(amount * PAYOUT_MULTIPLIER * 100) / 100;
        const outcomeTimer = setTimeout(() => {
          setLastOutcome({ won, payout });
          if (won) {
            sound.play("win");
            coinRainEmitter.trigger(45);
          }
        }, 650);
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
      }, 1200);
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
      subtitle: es ? "León" : "Lion",
      img: CARA_IMG,
      ring: "ring-[#c0262d]",
      glow: "shadow-[0_0_28px_rgba(192,38,45,0.55)]",
      border: "border-[#e63946]",
      selectedBg: "bg-gradient-to-b from-[#331114] to-[#16080a]",
      accent: "text-[#ff8a93]",
    },
    {
      id: 1,
      label: t("games.tails"),
      subtitle: es ? "Yelmo" : "Helm",
      img: CRUZ_IMG,
      ring: "ring-[#ffd966]",
      glow: "shadow-[0_0_28px_rgba(212,175,55,0.5)]",
      border: "border-[#ffd966]",
      selectedBg: "bg-gradient-to-b from-[#33260f] to-[#161006]",
      accent: "text-[#ffe9a8]",
    },
  ];

  const userBalance = Number(userData?.walletBalance ?? 0);
  const maxAllowed = Math.min(Math.floor(userBalance > 0 ? userBalance : 1000), MAX_BET);
  const quickBets: { label: string; apply: (b: number) => number }[] = [
    { label: "½", apply: (b) => Math.max(1, Math.floor(b / 2)) },
    { label: "x2", apply: (b) => Math.max(1, b * 2) },
    { label: "+10", apply: (b) => b + 10 },
    { label: "+100", apply: (b) => b + 100 },
    { label: "MAX", apply: () => Math.max(1, Math.floor(maxAllowed)) },
  ];

  const cleanBet = Math.floor(Number(bet) || 0);
  const betDisabled =
    choice === null ||
    cleanBet < 1 ||
    userGambled ||
    (userData !== null && userBalance < cleanBet) ||
    spinning ||
    cleanBet > MAX_BET;

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

  // History stats
  const recentHistory = history.slice(-20);
  const recentHeads = recentHistory.filter((h) => h.result === 0).length;
  const recentTails = recentHistory.length - recentHeads;

  const estimatedPayout = Math.round(cleanBet * PAYOUT_MULTIPLIER * 100) / 100;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 px-3 pb-12 -mt-2">
      {/* Main Colosseum CoinFlip Container */}
      <div className="w-full max-w-[1160px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
        {/* Imperial Top Banner / Marquee */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_12px_rgba(212,175,55,0.45)]">
              <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                <FaCrown className="text-[#ffd966] text-xs" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] gold-text">
                {es ? "Arena Cara o Cruz" : "Colosseum Coin Flip"}
              </h1>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#9b8d6f] font-semibold">
                {es ? "Duelo en vivo · Paga x1.95" : "Live Duel · Pays 1.95x"}
              </span>
            </div>
          </div>

          {/* Live Round Status Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${
                spinning
                  ? "bg-[#3a1618]/80 border-[#e63946]/60 text-[#ffb3b8]"
                  : gameEnded && countDown > 0.1
                    ? "bg-[#2a200e]/80 border-[#d4af37]/60 text-[#ffe9a8]"
                    : "bg-[#19281a]/70 border-emerald-500/40 text-emerald-300"
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

        {/* Body: Left Betting Panel + Right Colosseum Arena */}
        <div className="flex flex-col lg:flex-row">
          {/* ---------- Bet Panel ---------- */}
          <div className="lg:w-[355px] shrink-0 flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-[#d4af37]/20 bg-[#120e09]/80">
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

              <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#090806] focus-within:border-[#d4af37] focus-within:shadow-[0_0_16px_rgba(212,175,55,0.2)] transition-all">
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
                  className="w-full bg-transparent py-3 px-2.5 text-white font-mono tabular-nums font-black text-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {quickBets.map((q) => (
                  <button
                    key={q.label}
                    id={`coinflip-quick-${q.label}`}
                    type="button"
                    onClick={() => {
                      sound.play("chip");
                      setBet((b) => Math.max(1, Math.min(MAX_BET, Math.floor(q.apply(b || 0)))));
                    }}
                    className={`py-1.5 rounded-lg text-xs font-black font-mono transition-all border ${
                      q.label === "MAX"
                        ? "bg-[#2b1515] text-[#ffb3b3] border-[#7a2323] hover:border-[#d4af37] hover:text-[#ffe9a8]"
                        : "bg-[#221b11] text-[#e7ddc8] border-[#3e3219] hover:border-[#d4af37]/70 hover:text-[#ffe9a8]"
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
                      onClick={() => {
                        sound.play("chip");
                        setChoice(s.id);
                      }}
                      aria-pressed={selected}
                      className={`group relative flex flex-col items-center gap-2 rounded-2xl p-3.5 border-2 transition-all duration-200 overflow-hidden ${
                        selected
                          ? `${s.border} ${s.selectedBg} ${s.glow} -translate-y-0.5`
                          : "border-[#3a2f1d]/70 bg-[#14100b] hover:border-[#d4af37]/50"
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#ffe9a8] shadow-[0_0_8px_#ffd966]" />
                      )}
                      <img
                        src={s.img}
                        alt={s.label}
                        className={`w-16 h-16 rounded-full transition-transform duration-300 drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)] ${
                          selected ? "scale-110" : "group-hover:scale-105 opacity-85 group-hover:opacity-100"
                        }`}
                      />
                      <div className="flex flex-col items-center leading-tight">
                        <span className="font-black uppercase tracking-wider text-white text-sm">
                          {s.label}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${s.accent}`}>
                          {s.subtitle} · x1.95
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Potential Payout Strip */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0b0907] border border-[#d4af37]/20">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#9b8d6f]">
                {es ? "Premio potencial" : "Potential payout"}
              </span>
              <span className="font-mono tabular-nums font-black text-base text-[#ffe9a8]">
                <Monetary value={estimatedPayout} showFraction={estimatedPayout % 1 !== 0} />
              </span>
            </div>

            {/* Enter Game CTA */}
            <button
              id="coinflip-enter"
              type="button"
              onClick={handleBet}
              disabled={betDisabled}
              className="mt-auto w-full py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] border border-[#fff2c2]/60 shadow-[0_8px_24px_rgba(212,175,55,0.35)] transition-all duration-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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
          </div>

          {/* ---------- Colosseum Arena ---------- */}
          <div className="flex-1 flex flex-col min-w-0">
            <div
              className="coin-arena relative flex items-center justify-center h-[330px] sm:h-[400px] overflow-hidden"
              style={{ perspective: "1200px" }}
            >
              {/* Overhead Countdown Bar */}
              {gameEnded && countDown > 0.1 && (
                <div className="absolute top-0 left-0 right-0 z-30">
                  <div className="h-1.5 bg-black/50">
                    <div
                      className="h-full bg-gradient-to-r from-[#b8901f] via-[#ffe9a8] to-[#b8901f] shadow-[0_0_12px_rgba(255,217,102,0.7)] transition-[width] duration-100 ease-linear"
                      style={{ width: `${Math.max(0, Math.min(100, (countDown / 7.4) * 100))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rotating Imperial Sunburst behind the coin */}
              <motion.div
                animate={{
                  rotate: 360,
                  opacity: spinning ? 0.32 : showResult ? 0.28 : 0.12,
                  scale: spinning ? 1.08 : 1,
                }}
                transition={{
                  rotate: { duration: spinning ? 8 : 26, repeat: Infinity, ease: "linear" },
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.5 },
                }}
                className="absolute w-[440px] h-[440px] sm:w-[540px] sm:h-[540px] rounded-full pointer-events-none"
                style={{
                  background:
                    showResult && result === 0
                      ? "repeating-conic-gradient(from 0deg, rgba(230,57,70,0.45) 0deg 10deg, transparent 10deg 25deg)"
                      : "repeating-conic-gradient(from 0deg, rgba(212,175,55,0.42) 0deg 10deg, transparent 10deg 25deg)",
                  maskImage: "radial-gradient(circle, black 15%, transparent 66%)",
                  WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 66%)",
                }}
              />

              {/* Landing Shockwave Ring */}
              <AnimatePresence>
                {showResult && resultSide && (
                  <motion.div
                    key={`wave-${history.length}-${result}`}
                    initial={{ scale: 0.5, opacity: 0.9 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    className={`absolute w-52 h-52 rounded-full border-2 pointer-events-none ${
                      result === 0 ? "border-[#e63946]" : "border-[#ffd966]"
                    }`}
                  />
                )}
              </AnimatePresence>

              {/* Corner Faction Watermarks */}
              <div className="hidden sm:flex absolute left-5 top-5 items-center gap-2 opacity-55 pointer-events-none">
                <img src={CARA_IMG} alt="" className="w-6 h-6 rounded-full ring-1 ring-[#c0262d]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff9ea5]">
                  {t("games.heads")}
                </span>
              </div>
              <div className="hidden sm:flex absolute right-5 top-5 items-center gap-2 opacity-55 pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                  {t("games.tails")}
                </span>
                <img src={CRUZ_IMG} alt="" className="w-6 h-6 rounded-full ring-1 ring-[#d4af37]" />
              </div>

              {/* 3D Altar Pedestal */}
              <div className="coin-pedestal-ring" />
              <div className="coin-pedestal-inner-ring" />
              <div
                className={`coin-pedestal transition-all duration-300 ${
                  spinning ? "scale-75 opacity-60 blur-[2px]" : "scale-100 opacity-95"
                }`}
              />

              {/* 3D Coin */}
              <div className="relative z-10 -mt-8">
                <Coin spinning={spinning} result={result} />
              </div>

              {/* Result + Personal Win/Loss Banner */}
              <AnimatePresence>
                {showResult && resultSide && (
                  <motion.div
                    key={`res-${history.length}`}
                    initial={{ opacity: 0, y: 14, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-1.5 z-20 px-4 pointer-events-none"
                  >
                    <div
                      className={`px-6 py-2 rounded-full border-2 bg-[#0d0a08]/90 backdrop-blur-md flex items-center gap-2.5 ${resultSide.border} ${resultSide.glow}`}
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
                              : "bg-black/75 border-white/15 text-[#b9a77a]"
                          }`}
                        >
                          {lastOutcome.won ? (
                            <>
                              {t("games.won")}+
                              <Monetary value={lastOutcome.payout} showFraction={lastOutcome.payout % 1 !== 0} />
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
            </div>

            {/* Live Tug-of-War Pot Bar */}
            <div className="px-4 sm:px-5 py-3 bg-[#110d09] border-t border-[#d4af37]/20 flex flex-col gap-1.5">
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
              <div className="w-full h-2 rounded-full bg-[#1e1810] overflow-hidden flex border border-[#d4af37]/20">
                <div
                  className="h-full bg-gradient-to-r from-[#8f181f] to-[#e63946] transition-all duration-500"
                  style={{ width: `${headsPct}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-[#b8860b] to-[#ffe28a] transition-all duration-500"
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

              <div className="flex items-center gap-2 justify-end w-full overflow-hidden h-[34px]">
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
                          isLatest ? "w-[32px] h-[32px] min-w-[32px]" : "w-[26px] h-[26px] min-w-[26px] opacity-85"
                        } ${
                          e.result === 0
                            ? isLatest
                              ? "ring-[#ff4d5a] shadow-[0_0_12px_rgba(230,57,70,0.7)]"
                              : "ring-[#c0262d]/80"
                            : isLatest
                              ? "ring-[#ffe9a8] shadow-[0_0_12px_rgba(255,217,102,0.7)]"
                              : "ring-[#d4af37]/80"
                        }`}
                        initial={isLatest ? { opacity: 0, x: 28, scale: 0.5 } : false}
                        animate={{ opacity: isLatest ? 1 : 0.85, x: 0, scale: 1 }}
                        transition={{ ease: "easeOut", duration: 0.6 }}
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
      <div className="w-full max-w-[1160px] grid grid-cols-1 md:grid-cols-2 gap-5">
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

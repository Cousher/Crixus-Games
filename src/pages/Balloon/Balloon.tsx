import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCheck,
  FaCoins,
  FaCopy,
  FaCrown,
  FaFire,
  FaHandPointer,
  FaShieldAlt,
  FaSkullCrossbones,
  FaWind,
} from "react-icons/fa";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import {
  balloonActive,
  balloonStart,
  balloonPump,
  balloonCashout,
} from "../../services/games/GamesServices";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";

type ModeKey = "bronze" | "gold" | "emperor";
type ControlStyle = "hold" | "tap";

interface ModeMeta {
  key: ModeKey;
  maxPumps: number;
  popChance: number;
  es: string;
  en: string;
  descEs: string;
  descEn: string;
  activeCls: string;
  balloonStops: [string, string, string, string];
  glowColor: string;
}

const MODES: ModeMeta[] = [
  {
    key: "bronze",
    maxPumps: 30,
    popChance: 0.08,
    es: "Bronce",
    en: "Bronze",
    descEs: "Suave · hasta 11.98x",
    descEn: "Steady · up to 11.98x",
    activeCls:
      "bg-gradient-to-b from-[#9c632b] to-[#563110] border-[#f4c082] text-[#fff2e0] shadow-[0_0_16px_rgba(205,127,50,0.4)]",
    balloonStops: ["#f7c68c", "#c97a34", "#7a3e12", "#331604"],
    glowColor: "rgba(217, 138, 60, 0.42)",
  },
  {
    key: "gold",
    maxPumps: 24,
    popChance: 0.14,
    es: "Imperial",
    en: "Imperial",
    descEs: "Clásico · hasta 36.79x",
    descEn: "Classic · up to 36.79x",
    activeCls:
      "bg-gradient-to-b from-[#b8901f] to-[#6e500d] border-[#fff2c2] text-[#1a1204] shadow-[0_0_16px_rgba(212,175,55,0.45)]",
    balloonStops: ["#ff9d6e", "#dc2626", "#8b1118", "#3c060a"],
    glowColor: "rgba(212, 175, 55, 0.48)",
  },
  {
    key: "emperor",
    maxPumps: 20,
    popChance: 0.25,
    es: "Emperador",
    en: "Emperor",
    descEs: "Extremo · hasta 308.6x",
    descEn: "Extreme · up to 308.6x",
    activeCls:
      "bg-gradient-to-b from-[#c0262d] to-[#5e0d12] border-[#ff8a93] text-white shadow-[0_0_18px_rgba(220,38,38,0.5)]",
    balloonStops: ["#ffbe76", "#e11d48", "#7f0b1d", "#290308"],
    glowColor: "rgba(239, 68, 68, 0.55)",
  },
];

const HOUSE_EDGE = 0.02;
const MIN_BET = 1;
const MAX_BET = 50000;
const HOLD_PUMP_INTERVAL_MS = 430;

const previewMultipliers = (mode: ModeKey) => {
  const meta = MODES.find((m) => m.key === mode) || MODES[1];
  const survive = 1 - meta.popChance;
  return Array.from({ length: meta.maxPumps }, (_, i) => {
    const raw = (1 - HOUSE_EDGE) / Math.pow(survive, i + 1);
    return Math.max(1.01, Math.floor(raw * 100) / 100);
  });
};

interface ActiveBalloonGame {
  gameId: string;
  bet: number;
  mode: ModeKey;
  maxPumps: number;
  currentPump: number;
  hash: string;
  multipliers: number[];
  currentMultiplier: number;
  nextMultiplier: number;
  potentialPayout: number;
}

interface RoundResult {
  type: "popped" | "cashout" | "victory";
  pump: number;
  popAt: number;
  multiplier?: number;
  payout?: number;
  serverSeed: string;
  hash: string;
}

interface HistoryEntry {
  id: number;
  won: boolean;
  multiplier: number;
  pump: number;
}

const BURST_SHARDS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 95 + (i % 3) * 35;
  return {
    id: i,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rot: (i * 47) % 360,
    color: i % 2 === 0 ? "#ffd966" : "#ef4444",
    size: i % 3 === 0 ? 12 : 8,
  };
});

const Balloon = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { isLogged, userData, toogleUserFlow, toogleUserData } = useContext(UserContext);

  const [bet, setBet] = useState<number>(50);
  const [mode, setMode] = useState<ModeKey>("gold");
  const [controlStyle, setControlStyle] = useState<ControlStyle>("hold");
  const [activeGame, setActiveGame] = useState<ActiveBalloonGame | null>(null);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [pumpPulse, setPumpPulse] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const activeGameRef = useRef<ActiveBalloonGame | null>(null);
  const holdingRef = useRef<boolean>(false);
  const busyRef = useRef<boolean>(false);
  const cashoutOnReleaseRef = useRef<boolean>(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ladderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeGameRef.current = activeGame;
  }, [activeGame]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Recover any active game on refresh
  useEffect(() => {
    if (!isLogged) {
      setActiveGame(null);
      return;
    }
    let mounted = true;
    balloonActive()
      .then((res) => {
        if (mounted && res?.game) {
          setActiveGame(res.game);
          setMode(res.game.mode);
          setBet(res.game.bet);
          toast.info(
            es ? "Partida de Globo Imperial recuperada" : "Active Imperial Balloon round resumed",
            { theme: "dark" }
          );
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
      clearHoldTimer();
    };
  }, [isLogged, es, clearHoldTimer]);

  // Auto-scroll multiplier ladder to current pump
  useEffect(() => {
    if (!ladderRef.current || !activeGame) return;
    const activeChip = ladderRef.current.querySelector("[data-current='true']") as HTMLElement | null;
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeGame?.currentPump, activeGame]);

  const activeModeMeta = useMemo(
    () => MODES.find((m) => m.key === (activeGame?.mode || mode)) || MODES[1],
    [activeGame?.mode, mode]
  );

  const multipliers = useMemo(
    () => activeGame?.multipliers || previewMultipliers(mode),
    [activeGame?.multipliers, mode]
  );

  const pushHistory = useCallback((won: boolean, multiplier: number, pump: number) => {
    setHistory((prev) => [{ id: Date.now() + Math.random(), won, multiplier, pump }, ...prev].slice(0, 12));
  }, []);

  const syncWallet = useCallback(
    (walletBalance?: number) => {
      if (typeof walletBalance === "number" && userData) {
        toogleUserData({ ...userData, walletBalance });
      }
    },
    [toogleUserData, userData]
  );

  const handleCashout = useCallback(async () => {
    const current = activeGameRef.current;
    if (!current || current.currentPump < 1 || busyRef.current) return;

    clearHoldTimer();
    holdingRef.current = false;
    setIsHolding(false);
    cashoutOnReleaseRef.current = false;

    busyRef.current = true;
    setBusy(true);
    try {
      const res = await balloonCashout();
      setActiveGame(null);
      activeGameRef.current = null;
      syncWallet(res.walletBalance);
      setLastResult({
        type: "cashout",
        pump: res.pump,
        popAt: res.popAt,
        multiplier: res.multiplier,
        payout: res.payout,
        serverSeed: res.serverSeed,
        hash: res.hash,
      });
      pushHistory(true, res.multiplier, res.pump);
      sound.play(res.multiplier >= 5 ? "bigWin" : "cashout");
      coinRainEmitter.trigger(res.multiplier >= 5 ? 36 : 18);
      toast.success(
        `${es ? "¡Retiraste" : "Cashed out"} ${res.multiplier.toFixed(2)}x (+$${Math.floor(res.payout)})!`,
        { theme: "dark" }
      );
    } catch (err) {
      toast.error(translateApiMessage(err, t("toast.connError")), { theme: "dark" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [clearHoldTimer, es, pushHistory, syncWallet, t]);

  const executePump = useCallback(async (): Promise<"inflated" | "popped" | "victory" | "error"> => {
    if (!activeGameRef.current || busyRef.current) return "error";

    busyRef.current = true;
    setBusy(true);
    try {
      const res = await balloonPump();

      if (res.result === "popped") {
        clearHoldTimer();
        holdingRef.current = false;
        setIsHolding(false);
        cashoutOnReleaseRef.current = false;
        setActiveGame(null);
        activeGameRef.current = null;
        setLastResult({
          type: "popped",
          pump: res.pump,
          popAt: res.popAt,
          serverSeed: res.serverSeed,
          hash: res.hash,
        });
        pushHistory(false, 0, res.pump);
        sound.play("pop");
        return "popped";
      }

      if (res.result === "victory") {
        clearHoldTimer();
        holdingRef.current = false;
        setIsHolding(false);
        cashoutOnReleaseRef.current = false;
        setActiveGame(null);
        activeGameRef.current = null;
        syncWallet(res.walletBalance);
        setLastResult({
          type: "victory",
          pump: res.pump,
          popAt: res.popAt,
          multiplier: res.multiplier,
          payout: res.payout,
          serverSeed: res.serverSeed,
          hash: res.hash,
        });
        pushHistory(true, res.multiplier, res.pump);
        sound.play("bigWin");
        coinRainEmitter.trigger(48);
        toast.success(
          `👑 ${es ? "¡GLORIA IMPERIAL!" : "IMPERIAL JACKPOT!"} ${res.multiplier.toFixed(2)}x (+$${Math.floor(res.payout)})`,
          { theme: "dark" }
        );
        return "victory";
      }

      // Safe inflation!
      setActiveGame(res.game);
      activeGameRef.current = res.game;
      setPumpPulse((p) => p + 1);
      sound.play("pump", res.pump);
      return "inflated";
    } catch (err) {
      clearHoldTimer();
      holdingRef.current = false;
      setIsHolding(false);
      cashoutOnReleaseRef.current = false;
      toast.error(translateApiMessage(err, t("toast.connError")), { theme: "dark" });
      return "error";
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [clearHoldTimer, es, pushHistory, syncWallet, t]);

  const executeStart = useCallback(async (): Promise<boolean> => {
    if (!isLogged) {
      toogleUserFlow(true);
      return false;
    }
    const cleanBet = Math.floor(Number(bet));
    if (!Number.isFinite(cleanBet) || cleanBet < MIN_BET || cleanBet > MAX_BET) {
      toast.error(
        es ? `La apuesta debe estar entre $${MIN_BET} y $${MAX_BET.toLocaleString("es-AR")}` : "Invalid bet amount",
        { theme: "dark" }
      );
      return false;
    }
    if (userData && userData.walletBalance < cleanBet) {
      toast.error(t("toast.insufficientFunds"), { theme: "dark" });
      return false;
    }
    if (busyRef.current) return false;

    busyRef.current = true;
    setBusy(true);
    setLastResult(null);
    try {
      const res = await balloonStart(cleanBet, mode);
      setActiveGame(res.game);
      activeGameRef.current = res.game;
      syncWallet(res.walletBalance);
      sound.play("chip");
      return true;
    } catch (err: any) {
      if (err?.response?.data?.game) {
        setActiveGame(err.response.data.game);
        activeGameRef.current = err.response.data.game;
      }
      toast.error(translateApiMessage(err, t("toast.connError")), { theme: "dark" });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [bet, es, isLogged, mode, syncWallet, t, toogleUserFlow, userData]);

  // Continuous Hold-to-Inflate loop (Classic Balloon feel!)
  const runHoldLoop = useCallback(async () => {
    if (!holdingRef.current) return;

    if (!activeGameRef.current) {
      const started = await executeStart();
      if (!started) {
        holdingRef.current = false;
        setIsHolding(false);
        return;
      }
    }

    // Always perform at least 1 pump when starting a hold round
    const outcome = await executePump();
    if (outcome !== "inflated") return;

    // If the user already released during the first pump, cash out right away!
    if (!holdingRef.current && cashoutOnReleaseRef.current) {
      await handleCashout();
      return;
    }

    if (holdingRef.current && activeGameRef.current) {
      clearHoldTimer();
      holdTimerRef.current = setTimeout(() => {
        runHoldLoop();
      }, HOLD_PUMP_INTERVAL_MS);
    }
  }, [clearHoldTimer, executePump, executeStart, handleCashout]);

  const handleHoldStart = useCallback(() => {
    if (controlStyle !== "hold") return;
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }
    if (holdingRef.current || busyRef.current) return;
    holdingRef.current = true;
    cashoutOnReleaseRef.current = true;
    setIsHolding(true);
    runHoldLoop();
  }, [controlStyle, isLogged, runHoldLoop, toogleUserFlow]);

  const handleHoldEnd = useCallback(() => {
    if (controlStyle !== "hold") return;
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setIsHolding(false);
    clearHoldTimer();

    // If not currently mid-request and we have >= 1 pump, cash out immediately!
    if (!busyRef.current && activeGameRef.current && activeGameRef.current.currentPump >= 1) {
      handleCashout();
    }
  }, [clearHoldTimer, controlStyle, handleCashout]);

  // Spacebar support for Hold-to-Inflate on desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (controlStyle === "hold") {
        handleHoldStart();
      } else if (!busyRef.current) {
        if (!activeGameRef.current) executeStart();
        else executePump();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (controlStyle === "hold") {
        handleHoldEnd();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [controlStyle, executePump, executeStart, handleHoldEnd, handleHoldStart]);

  // Visual balloon physics derived from currentPump & maxPumps
  const currentPump = activeGame?.currentPump || 0;
  const maxPumps = activeGame?.maxPumps || activeModeMeta.maxPumps;
  const pressureRatio = Math.min(1, currentPump / Math.max(1, maxPumps * 0.75));
  const balloonScale = 0.78 + Math.min(0.82, currentPump * 0.058);
  const dangerLevel = Math.min(1, currentPump * activeModeMeta.popChance * 0.85);
  const isPopped = lastResult?.type === "popped";
  const isWin = lastResult?.type === "cashout" || lastResult?.type === "victory";
  const displayMultiplier = activeGame
    ? activeGame.currentMultiplier
    : isWin && lastResult?.multiplier
    ? lastResult.multiplier
    : 1;

  const adjustBet = (mult: number) => {
    if (activeGame) return;
    const maxAvail = userData ? Math.min(MAX_BET, Math.floor(userData.walletBalance)) : MAX_BET;
    setBet((prev) => Math.max(MIN_BET, Math.min(maxAvail || MAX_BET, Math.floor(prev * mult))));
  };

  const copyFairness = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-full max-w-[1380px] mx-auto px-3 sm:px-6 py-5 sm:py-8 flex flex-col gap-5">
      {/* Imperial Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#c0262d] via-[#d4af37] to-[#6e4d0c] p-[1.5px] shadow-[0_0_24px_rgba(212,175,55,0.35)]">
            <div className="w-full h-full rounded-[14px] bg-[#140e09] flex items-center justify-center text-[#ffd966]">
              <FaWind className="text-xl" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide gold-text">
                {es ? "Globo Imperial" : "Imperial Balloon"}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-[#b8901f] to-[#ffd966] text-[#1a1204] text-[10px] font-black uppercase tracking-widest">
                {es ? "Nuevo" : "New"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#a69779]">
              {es
                ? "Inflá el globo del Coliseo y cobrá antes de que reviente · 98% RTP · Provably Fair"
                : "Inflate the Colosseum balloon and cash out before it bursts · 98% RTP · Provably Fair"}
            </p>
          </div>
        </div>

        {/* Session History Pills */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
            {history.map((h) => (
              <span
                key={h.id}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-mono font-black border ${
                  h.won
                    ? "bg-emerald-950/75 border-emerald-500/45 text-emerald-300"
                    : "bg-red-950/75 border-red-500/45 text-red-300"
                }`}
              >
                {h.won ? `${h.multiplier.toFixed(2)}x` : `💥 #${h.pump}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: Controls Panel */}
        <div className="lg:col-span-4 order-2 lg:order-1 rounded-2xl bg-gradient-to-b from-[#1b1510] to-[#100d09] border border-[#d4af37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-5 flex flex-col gap-5">
          {/* Play Style Toggle */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b8d6f]">
              {es ? "Estilo de juego" : "Play style"}
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0c0906] border border-[#2d2317]">
              <button
                type="button"
                disabled={Boolean(activeGame)}
                onClick={() => setControlStyle("hold")}
                className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  controlStyle === "hold"
                    ? "bg-gradient-to-r from-[#b8901f] to-[#e5bc48] text-[#1a1204] shadow"
                    : "text-[#b9a77a] hover:text-[#ffe9a8]"
                }`}
              >
                <FaHandPointer className="text-xs" />
                <span>{es ? "Mantener" : "Hold"}</span>
              </button>
              <button
                type="button"
                disabled={Boolean(activeGame)}
                onClick={() => setControlStyle("tap")}
                className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  controlStyle === "tap"
                    ? "bg-gradient-to-r from-[#b8901f] to-[#e5bc48] text-[#1a1204] shadow"
                    : "text-[#b9a77a] hover:text-[#ffe9a8]"
                }`}
              >
                <FaWind className="text-xs" />
                <span>{es ? "Paso a paso" : "Tap"}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#8d7f63]">
              {controlStyle === "hold"
                ? es
                  ? "Mantené presionado (o barra espaciadora) para inflar y soltá para cobrar al instante."
                  : "Hold down (or Spacebar) to inflate and release to cash out immediately."
                : es
                ? "Iniciá la ronda, inflá con cada toque y tocá Cobrar cuando quieras asegurar."
                : "Start a round, tap to pump step-by-step, and hit Cash Out whenever you want."}
            </p>
          </div>

          {/* Bet Input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-[0.16em] text-[#9b8d6f]">
                {t("games.bet")}
              </span>
              {isLogged && userData && (
                <span className="font-mono text-[#b9a77a]">
                  {t("games.balance")}:{" "}
                  <strong className="text-emerald-400">
                    <Monetary value={Math.floor(userData.walletBalance || 0)} />
                  </strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37] font-black">
                  $
                </span>
                <input
                  type="number"
                  min={MIN_BET}
                  max={MAX_BET}
                  step={1}
                  disabled={Boolean(activeGame)}
                  value={bet}
                  onChange={(e) => setBet(Math.max(0, Math.floor(Number(e.target.value))))}
                  className="w-full h-11 pl-8 pr-3 rounded-xl bg-[#0c0906] border border-[#3a2f1d] focus:border-[#d4af37] text-[#f5ead4] font-mono font-bold text-base outline-none disabled:opacity-55"
                />
              </div>
              <button
                type="button"
                disabled={Boolean(activeGame)}
                onClick={() => adjustBet(0.5)}
                className="h-11 px-3 rounded-xl bg-[#18120c] hover:bg-[#241b11] border border-[#3a2f1d] text-xs font-black text-[#ffe9a8] disabled:opacity-45 cursor-pointer"
              >
                ½
              </button>
              <button
                type="button"
                disabled={Boolean(activeGame)}
                onClick={() => adjustBet(2)}
                className="h-11 px-3 rounded-xl bg-[#18120c] hover:bg-[#241b11] border border-[#3a2f1d] text-xs font-black text-[#ffe9a8] disabled:opacity-45 cursor-pointer"
              >
                2×
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[25, 100, 500, 2000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={Boolean(activeGame)}
                  onClick={() => setBet(preset)}
                  className="py-1.5 rounded-lg bg-[#140f0a] hover:bg-[#231a10] border border-[#2f2518] text-[11px] font-mono font-bold text-[#d8ccb2] hover:text-[#ffe9a8] disabled:opacity-45 cursor-pointer"
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Mode Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b8d6f]">
              {es ? "Tipo de globo" : "Balloon risk"}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => {
                const selected = (activeGame?.mode || mode) === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={Boolean(activeGame)}
                    onClick={() => setMode(m.key)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer disabled:opacity-60 ${
                      selected
                        ? m.activeCls
                        : "bg-[#120e0a] border-[#2e2418] text-[#c8bba0] hover:border-[#d4af37]/50"
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wide">
                      {es ? m.es : m.en}
                    </span>
                    <span className={`text-[10px] leading-tight ${selected ? "opacity-90" : "text-[#8e8065]"}`}>
                      {es ? m.descEs : m.descEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Controls (Tap Mode or Active Cashout) */}
          <div className="mt-auto flex flex-col gap-2.5 pt-2 border-t border-[#292015]">
            {controlStyle === "tap" ? (
              !activeGame ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={executeStart}
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-sm text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] border border-[#fff2c2]/70 shadow-[0_0_22px_rgba(212,175,55,0.35)] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLogged
                    ? es
                      ? "Empezar ronda"
                      : "Start round"
                    : t("games.signInToPlay")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={executePump}
                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-sm text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] border border-[#fff2c2]/70 shadow-[0_0_22px_rgba(212,175,55,0.4)] hover:brightness-110 disabled:opacity-55 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FaWind />
                    <span>
                      {es ? "Inflar" : "Pump"} → {activeGame.nextMultiplier.toFixed(2)}x
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy || activeGame.currentPump < 1}
                    onClick={handleCashout}
                    className="w-full h-12 rounded-xl font-black uppercase tracking-wider text-sm text-[#071f11] bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500 border border-emerald-200/80 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FaCoins />
                    <span>
                      {activeGame.currentPump >= 1
                        ? `${es ? "Cobrar" : "Cash out"} $${Math.floor(activeGame.potentialPayout)}`
                        : es
                        ? "Inflá 1 vez para cobrar"
                        : "Pump once to cash out"}
                    </span>
                  </button>
                </>
              )
            ) : (
              /* Hold Mode Status + Emergency Cashout Button if resumed mid-run */
              <div className="flex flex-col gap-2">
                {activeGame && activeGame.currentPump >= 1 && !isHolding && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCashout}
                    className="w-full h-11 rounded-xl font-black uppercase tracking-wider text-xs text-[#071f11] bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.4)] cursor-pointer"
                  >
                    {es ? "Cobrar ahora" : "Cash out now"} · ${Math.floor(activeGame.potentialPayout)}
                  </button>
                )}
                <div className="rounded-xl bg-[#120e09] border border-[#2d2317] px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#9b8d6f] font-semibold">
                    {es ? "Próximo soplo" : "Next pump"}
                  </span>
                  <span className="font-mono font-black text-[#ffd966]">
                    {(activeGame ? activeGame.nextMultiplier : multipliers[0]).toFixed(2)}x
                  </span>
                </div>
              </div>
            )}

            {/* Provably Fair Compact Box */}
            {(activeGame?.hash || lastResult?.hash) && (
              <div className="rounded-xl bg-[#0e0b08] border border-[#2a2116] p-3 flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#b9a77a]">
                    <FaShieldAlt className="text-[#d4af37]" />
                    Provably Fair
                  </span>
                  <button
                    type="button"
                    onClick={() => copyFairness(lastResult?.serverSeed || activeGame?.hash || "")}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ffe9a8] hover:text-white cursor-pointer"
                  >
                    {copiedHash ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                    <span>{copiedHash ? (es ? "Copiado" : "Copied") : es ? "Copiar" : "Copy"}</span>
                  </button>
                </div>
                <p className="font-mono text-[10px] text-[#7c7058] truncate">
                  Hash: {activeGame?.hash || lastResult?.hash}
                </p>
                {lastResult?.serverSeed && (
                  <p className="font-mono text-[10px] text-emerald-300/80 truncate">
                    Seed: {lastResult.serverSeed} · Pop #{lastResult.popAt}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Imperial Colosseum Balloon Stage */}
        <div className="lg:col-span-8 order-1 lg:order-2 relative overflow-hidden rounded-2xl border border-[#d4af37]/35 bg-gradient-to-b from-[#1e130c] via-[#130c08] to-[#0a0705] shadow-[0_24px_60px_rgba(0,0,0,0.85)] flex flex-col justify-between min-h-[540px] sm:min-h-[600px]">
          {/* Top Imperial Hairline */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent z-20" />

          {/* Colosseum Arch Silhouette Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 42%, rgba(212,175,55,0.22), transparent 58%), repeating-linear-gradient(90deg, rgba(212,175,55,0.04) 0px, rgba(212,175,55,0.04) 1px, transparent 1px, transparent 90px)",
            }}
          />

          {/* Top HUD: Multiplier Ladder */}
          <div className="relative z-10 px-4 pt-4">
            <div
              ref={ladderRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
            >
              {multipliers.map((mult, idx) => {
                const pumpNum = idx + 1;
                const cleared = currentPump >= pumpNum;
                const isNext = currentPump + 1 === pumpNum && Boolean(activeGame);
                return (
                  <div
                    key={pumpNum}
                    data-current={isNext || (currentPump === pumpNum && currentPump > 0) ? "true" : undefined}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border font-mono text-[11px] font-black transition-all ${
                      cleared
                        ? "bg-emerald-950/80 border-emerald-400/60 text-emerald-300"
                        : isNext
                        ? "bg-[#2e220d] border-[#ffd966] text-[#ffe9a8] scale-105 shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                        : "bg-[#120d09]/80 border-[#2b2116] text-[#8f8065]"
                    }`}
                  >
                    <span className="opacity-60 mr-1 text-[9px]">#{pumpNum}</span>
                    {mult.toFixed(2)}x
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Interactive Balloon Arena */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 select-none">
            {/* Dynamic Pressure Glow Aura */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full blur-3xl"
              animate={{
                width: 220 + pressureRatio * 200,
                height: 220 + pressureRatio * 200,
                opacity: isPopped ? 0.08 : 0.28 + pressureRatio * 0.45,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              style={{ background: activeModeMeta.glowColor }}
            />

            {/* Balloon or Popped Burst Stage */}
            <div className="relative flex items-center justify-center w-[280px] h-[300px] sm:w-[320px] sm:h-[330px]">
              <AnimatePresence mode="wait">
                {isPopped ? (
                  <motion.div
                    key="popped-burst"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative flex flex-col items-center justify-center"
                  >
                    {/* Shockwave Ring */}
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0.9 }}
                      animate={{ scale: 2.3, opacity: 0 }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                      className="absolute w-40 h-40 rounded-full border-4 border-red-500/80"
                    />
                    {/* Flying Shards */}
                    {BURST_SHARDS.map((s) => (
                      <motion.span
                        key={s.id}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
                        animate={{ x: s.x, y: s.y, scale: 0.2, opacity: 0, rotate: s.rot }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        style={{
                          width: s.size,
                          height: s.size,
                          backgroundColor: s.color,
                        }}
                        className="absolute rounded-sm"
                      />
                    ))}

                    <div className="relative z-10 flex flex-col items-center gap-2 px-6 py-5 rounded-2xl bg-[#2a0c0e]/90 border border-red-500/60 shadow-[0_0_40px_rgba(220,38,38,0.45)] text-center">
                      <FaSkullCrossbones className="text-4xl text-red-400" />
                      <span className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-red-200">
                        {es ? "¡REVENTÓ!" : "POPPED!"}
                      </span>
                      <span className="text-xs font-mono text-red-300/85">
                        {es
                          ? `Explotó en el soplo #${lastResult?.pump}`
                          : `Burst on pump #${lastResult?.pump}`}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="imperial-balloon"
                    animate={{
                      scale: balloonScale,
                      y: isHolding ? [-2, -10, -2] : [0, -7, 0],
                      x:
                        dangerLevel > 0.35 && activeGame
                          ? [-2.5 * dangerLevel, 2.5 * dangerLevel, -2 * dangerLevel, 0]
                          : 0,
                    }}
                    transition={{
                      scale: { type: "spring", stiffness: 260, damping: 16 },
                      y: { duration: isHolding ? 0.45 : 2.8, repeat: Infinity, ease: "easeInOut" },
                      x: { duration: 0.22, repeat: dangerLevel > 0.35 && activeGame ? Infinity : 0 },
                    }}
                    className="relative flex flex-col items-center"
                  >
                    {/* High-Craft Imperial Roman Balloon SVG */}
                    <svg
                      viewBox="0 0 220 265"
                      className="w-[210px] h-[252px] sm:w-[230px] sm:h-[275px] drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
                    >
                      <defs>
                        <radialGradient id={`balGrad-${activeModeMeta.key}`} cx="35%" cy="28%" r="68%">
                          <stop offset="0%" stopColor={activeModeMeta.balloonStops[0]} />
                          <stop offset="28%" stopColor={activeModeMeta.balloonStops[1]} />
                          <stop offset="70%" stopColor={activeModeMeta.balloonStops[2]} />
                          <stop offset="100%" stopColor={activeModeMeta.balloonStops[3]} />
                        </radialGradient>
                        <linearGradient id="balGold" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fff5c8" />
                          <stop offset="50%" stopColor="#d4af37" />
                          <stop offset="100%" stopColor="#7c560d" />
                        </linearGradient>
                      </defs>

                      {/* Main Balloon Sphere */}
                      <path
                        d="M110 14 C172 14, 202 64, 198 122 C194 176, 152 216, 118 232 L102 232 C68 216, 26 176, 22 122 C18 64, 48 14, 110 14 Z"
                        fill={`url(#balGrad-${activeModeMeta.key})`}
                        stroke="url(#balGold)"
                        strokeWidth="3.5"
                      />

                      {/* Ornate Gold Meridian Ribs */}
                      <path
                        d="M110 16 C144 32, 162 78, 158 122 C154 166, 132 206, 114 230"
                        fill="none"
                        stroke="url(#balGold)"
                        strokeWidth="1.8"
                        opacity="0.45"
                      />
                      <path
                        d="M110 16 C76 32, 58 78, 62 122 C66 166, 88 206, 106 230"
                        fill="none"
                        stroke="url(#balGold)"
                        strokeWidth="1.8"
                        opacity="0.45"
                      />

                      {/* Specular Sheen */}
                      <ellipse
                        cx="74"
                        cy="68"
                        rx="19"
                        ry="36"
                        transform="rotate(-22 74 68)"
                        fill="#ffffff"
                        opacity="0.22"
                      />
                      <ellipse
                        cx="66"
                        cy="56"
                        rx="7"
                        ry="15"
                        transform="rotate(-22 66 56)"
                        fill="#fff8dc"
                        opacity="0.42"
                      />

                      {/* Tied Imperial Neck & Collar */}
                      <path
                        d="M100 231 L120 231 L126 244 L94 244 Z"
                        fill="url(#balGold)"
                        stroke="#4a3106"
                        strokeWidth="1.5"
                      />
                      <rect
                        x="97"
                        y="227"
                        width="26"
                        height="6"
                        rx="3"
                        fill="#ffe9a8"
                        stroke="#5c3d08"
                        strokeWidth="1"
                      />
                      {/* Air Hose Line */}
                      <path
                        d="M110 244 C106 254, 114 258, 110 264"
                        fill="none"
                        stroke="url(#balGold)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Multiplier Badge Embedded in Balloon Center */}
                    <motion.div
                      key={pumpPulse}
                      initial={{ scale: 1.16 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="pointer-events-none absolute top-[43%] -translate-y-1/2 flex flex-col items-center justify-center text-center"
                    >
                      <FaCrown className="text-[#ffe9a8] text-base mb-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]" />
                      <span
                        className={`font-mono font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] ${
                          isWin ? "text-emerald-300" : "text-[#fff7da]"
                        }`}
                        style={{ fontSize: displayMultiplier >= 100 ? "2rem" : "2.45rem", lineHeight: 1 }}
                      >
                        {displayMultiplier.toFixed(2)}x
                      </span>
                      {activeGame && activeGame.currentPump > 0 && (
                        <span className="mt-1 px-2.5 py-0.5 rounded-full bg-black/55 border border-[#ffd966]/45 text-[11px] font-mono font-extrabold text-emerald-300">
                          $<Monetary value={Math.floor(activeGame.potentialPayout)} />
                        </span>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Win / Victory Celebration Strip + Share Button */}
            {isWin && lastResult?.payout && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-950/75 border border-emerald-400/50 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
              >
                <div className="flex items-center gap-2 text-sm font-black text-emerald-200">
                  <FaFire className="text-[#ffd966]" />
                  <span>
                    {lastResult.type === "victory"
                      ? es
                        ? "¡GLORIA MÁXIMA!"
                        : "MAX IMPERIAL WIN!"
                      : es
                      ? "¡COBRASTE!"
                      : "CASHED OUT!"}
                  </span>
                  <span className="font-mono text-emerald-400">
                    +<Monetary value={Math.floor(lastResult.payout)} />
                  </span>
                  <span className="text-xs text-[#ffe9a8] font-mono">
                    ({lastResult.multiplier?.toFixed(2)}x)
                  </span>
                </div>
                <ShareWinButton
                  gameName={es ? "Globo Imperial" : "Imperial Balloon"}
                  payout={Math.floor(lastResult.payout)}
                  multiplier={lastResult.multiplier || 1}
                  compact
                />
              </motion.div>
            )}
          </div>

          {/* Bottom Interactive Imperial Bellows / Main Hold-to-Pump Button */}
          <div className="relative z-10 px-4 sm:px-6 pb-5 pt-2 flex flex-col items-center gap-2">
            {controlStyle === "hold" ? (
              <button
                type="button"
                data-no-sfx="true"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleHoldStart();
                }}
                onPointerUp={handleHoldEnd}
                onPointerLeave={handleHoldEnd}
                onPointerCancel={handleHoldEnd}
                className={`relative w-full max-w-[440px] h-16 rounded-2xl font-black uppercase tracking-[0.14em] text-sm sm:text-base transition-all select-none touch-none flex items-center justify-center gap-3 cursor-pointer border-2 ${
                  isHolding
                    ? "scale-[0.97] bg-gradient-to-r from-[#dc2626] via-[#f59e0b] to-[#dc2626] border-[#fff2c2] text-white shadow-[0_0_36px_rgba(245,158,11,0.65)]"
                    : "bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] border-[#fff2c2]/80 text-[#1a1204] shadow-[0_0_28px_rgba(212,175,55,0.4)] hover:brightness-110"
                }`}
              >
                <FaWind className={`text-xl ${isHolding ? "animate-bounce" : ""}`} />
                <span>
                  {!isLogged
                    ? t("games.signInToPlay")
                    : isHolding
                    ? es
                      ? `INFLANDO... SOLTÁ PARA COBRAR ($${Math.floor(activeGame?.potentialPayout || bet)})`
                      : `INFLATING... RELEASE TO CASH OUT ($${Math.floor(activeGame?.potentialPayout || bet)})`
                    : es
                    ? `MANTENER PARA INFLAR ($${bet})`
                    : `HOLD TO INFLATE ($${bet})`}
                </span>
              </button>
            ) : (
              <div className="w-full max-w-[460px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0f0b07]/90 border border-[#2f2518] text-xs text-[#b9a77a]">
                <span>
                  {activeGame
                    ? es
                      ? `Soplo actual: #${activeGame.currentPump} de ${activeGame.maxPumps}`
                      : `Current pump: #${activeGame.currentPump} of ${activeGame.maxPumps}`
                    : es
                    ? "Usá los botones del panel izquierdo (o la barra espaciadora) para jugar."
                    : "Use the left panel buttons (or Spacebar) to play."}
                </span>
                <span className="font-mono font-bold text-[#ffd966]">
                  {Math.round((1 - activeModeMeta.popChance) * 100)}% {es ? "éxito/soplo" : "safe/pump"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Balloon;

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
  FaShieldAlt,
  FaSkullCrossbones,
  FaUsers,
} from "react-icons/fa";
import { GiFlame, GiShieldEchoes } from "react-icons/gi";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import Avatar from "../../components/Avatar";
import SocketConnection from "../../services/socket";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";

const MIN_BET = 1;
const MAX_BET = 50000;
const LANE_WIDTH = 116;
const START_WIDTH = 120;
const GLADIATOR_IMG = "/images/road/gladiator.webp";
const CHEST_IMG = "/images/cases/legendaria.webp";

type RoundPhase = "betting" | "running" | "ended";

interface ArenaPlayer {
  userId: string;
  username: string;
  profilePicture: string;
  level: number;
  bet: number;
  status: "active" | "cashed_out" | "burned";
  cashoutStep: number | null;
  cashoutMultiplier: number | null;
  payout: number | null;
}

interface RoundResult {
  type: "burned" | "victory";
  step: number;
  crashStep: number;
  serverSeed: string;
  hash: string;
}

interface HistoryEntry {
  roundId: number;
  type: "burned" | "victory";
  safeSteps: number;
  maxMultiplier: number;
  crashStep: number;
}

interface RoadArenaState {
  roundId: number;
  phase: RoundPhase;
  difficulty: string;
  totalSteps: number;
  trapChance: number;
  multipliers: number[];
  currentStep: number;
  currentMultiplier: number;
  nextMultiplier: number;
  hash: string | null;
  phaseEndsAt: number;
  stepIntervalMs: number;
  bettingWindowMs: number;
  players: ArenaPlayer[];
  result: RoundResult | null;
  history: HistoryEntry[];
}

interface PersonalWinBanner {
  roundId: number;
  step: number;
  multiplier: number;
  payout: number;
  type: "cashout" | "victory";
}

const DEFAULT_MULTIPLIERS = Array.from({ length: 18 }, (_, i) =>
  Math.max(1.01, Math.floor((0.98 / Math.pow(0.8, i + 1)) * 100) / 100)
);

const AUTO_CASHOUT_OPTIONS = [0, 2, 3, 4, 5, 8, 10, 14];

const GladiatorRoad = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { isLogged, userData, toogleUserFlow, toogleUserData } = useContext(UserContext);

  const socket = useMemo(() => SocketConnection.getInstance(), []);

  const [arena, setArena] = useState<RoadArenaState | null>(null);
  const [bet, setBet] = useState<number>(50);
  const [autoCashoutStep, setAutoCashoutStep] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [cashingOut, setCashingOut] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [jumpKey, setJumpKey] = useState<number>(0);
  const [personalWin, setPersonalWin] = useState<PersonalWinBanner | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(640);
  const prevStepRef = useRef<number>(0);
  const prevPhaseRef = useRef<RoundPhase | null>(null);
  const prevRoundIdRef = useRef<number>(0);

  // Measure stage width so camera keeps the gladiator smoothly framed
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewportWidth(el.clientWidth || 640);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Smooth local timer for countdown bars
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Subscribe to live multiplayer arena socket events
  useEffect(() => {
    const onState = (next: RoadArenaState) => {
      if (!next) return;

      // Clear personal win banner when a brand-new betting round opens
      if (next.roundId !== prevRoundIdRef.current && next.phase === "betting") {
        prevRoundIdRef.current = next.roundId;
        setPersonalWin(null);
        setJumpKey(0);
      }

      // Sound & jump cues on live transitions
      if (next.phase === "running" && prevPhaseRef.current === "betting") {
        sound.play("launch");
      }
      if (next.phase === "running" && next.currentStep > prevStepRef.current) {
        setJumpKey((k) => k + 1);
        sound.play("gem", next.currentStep);
      }
      if (next.phase === "ended" && prevPhaseRef.current !== "ended") {
        if (next.result?.type === "burned") {
          setJumpKey((k) => k + 1);
          sound.play("explode");
        } else if (next.result?.type === "victory") {
          sound.play("bigWin");
        }
      }

      prevStepRef.current = next.currentStep;
      prevPhaseRef.current = next.phase;
      setArena(next);
    };

    const onCashoutSuccess = (payload: {
      userId: string;
      step: number;
      multiplier: number;
      payout: number;
      type: "cashout" | "victory";
    }) => {
      sound.play(payload.type === "victory" || payload.multiplier >= 5 ? "bigWin" : "cashout");
      coinRainEmitter.trigger(payload.multiplier >= 5 ? 75 : 36);
      setPersonalWin({
        roundId: prevRoundIdRef.current,
        step: payload.step,
        multiplier: payload.multiplier,
        payout: payload.payout,
        type: payload.type,
      });
      toast.success(
        `${payload.type === "victory" ? t("road.victory") : t("road.cashedOut")} ${payload.multiplier.toFixed(2)}x (+$${Math.floor(payload.payout)})`,
        { theme: "dark" }
      );
    };

    const onReconnect = () => {
      socket.emit("road:requestSync");
    };

    socket.on("road:state", onState);
    socket.on("road:cashoutSuccess", onCashoutSuccess);
    socket.on("connect", onReconnect);
    socket.emit("road:requestSync");

    return () => {
      socket.off("road:state", onState);
      socket.off("road:cashoutSuccess", onCashoutSuccess);
      socket.off("connect", onReconnect);
    };
  }, [socket, t]);

  const myUserId = userData?.id ? String(userData.id) : null;
  const players = arena?.players || [];
  const myPlayer = useMemo(
    () => (myUserId ? players.find((p) => String(p.userId) === myUserId) || null : null),
    [myUserId, players]
  );

  const phase: RoundPhase = arena?.phase || "betting";
  const multipliers = arena?.multipliers || DEFAULT_MULTIPLIERS;
  const totalSteps = arena?.totalSteps || multipliers.length;
  const currentStep = arena?.currentStep || 0;
  const currentMultiplier = arena?.currentMultiplier || 1;
  const nextMultiplier = arena?.nextMultiplier || multipliers[0] || 1.22;
  const roundResult = arena?.result || null;
  const history = arena?.history || [];
  const trapChance = arena?.trapChance ?? 0.2;

  const isBurned = phase === "ended" && roundResult?.type === "burned";
  const isArenaVictory = phase === "ended" && roundResult?.type === "victory";
  const displayStep = isBurned && roundResult ? roundResult.step : currentStep;

  const timeLeftMs = Math.max(0, (arena?.phaseEndsAt || nowMs) - nowMs);
  const timeLeftSec = (timeLeftMs / 1000).toFixed(1);
  const phaseTotalMs =
    phase === "betting"
      ? arena?.bettingWindowMs || 10000
      : phase === "running"
      ? arena?.stepIntervalMs || 2200
      : 4500;
  const progressPct = Math.max(0, Math.min(100, (timeLeftMs / phaseTotalMs) * 100));

  const userBalance = Number(userData?.walletBalance ?? 0);
  const cleanBet = Math.floor(Number(bet) || 0);
  const maxAffordable = Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(userBalance > 0 ? userBalance : 100)));

  const canBet =
    phase === "betting" &&
    !myPlayer &&
    !submitting &&
    cleanBet >= MIN_BET &&
    cleanBet <= MAX_BET &&
    (!isLogged || userBalance >= cleanBet);

  const canCashout =
    phase === "running" &&
    Boolean(myPlayer && myPlayer.status === "active") &&
    currentStep >= 1 &&
    !cashingOut;

  const handlePlaceBet = useCallback(() => {
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }
    if (!canBet) return;
    setSubmitting(true);
    socket.emit(
      "road:bet",
      {
        bet: cleanBet,
        autoCashoutStep: autoCashoutStep > 0 ? autoCashoutStep : null,
      },
      (res?: { ok?: boolean; message?: string; walletBalance?: number }) => {
        setSubmitting(false);
        if (res?.ok) {
          sound.play("chip");
          if (typeof res.walletBalance === "number") {
            toogleUserData((prev: any) =>
              prev ? { ...prev, walletBalance: res.walletBalance } : prev
            );
          }
        } else if (res?.message) {
          toast.error(translateApiMessage(res.message, t("toast.connError")), { theme: "dark" });
        }
      }
    );
  }, [autoCashoutStep, canBet, cleanBet, isLogged, socket, t, toogleUserData, toogleUserFlow]);

  const handleCashout = useCallback(() => {
    if (!canCashout) return;
    setCashingOut(true);
    socket.emit("road:cashout", (res?: { ok?: boolean; message?: string }) => {
      setCashingOut(false);
      if (res && !res.ok && res.message) {
        toast.error(translateApiMessage(res.message, t("toast.connError")), { theme: "dark" });
      }
    });
  }, [canCashout, socket, t]);

  // Spacebar quick-cashout during live run!
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (canCashout) {
        e.preventDefault();
        handleCashout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCashout, handleCashout]);

  // Group cashed-out players by step so we can pin mini avatar chips onto the track!
  const cashoutsByStep = useMemo(() => {
    const map = new Map<number, ArenaPlayer[]>();
    for (const p of players) {
      if (p.status === "cashed_out" && p.cashoutStep) {
        const list = map.get(p.cashoutStep) || [];
        list.push(p);
        map.set(p.cashoutStep, list);
      }
    }
    return map;
  }, [players]);

  // Sorted player list for the Arena Roster
  const sortedPlayers = useMemo(() => {
    const rank = { cashed_out: 0, active: 1, burned: 2 };
    return [...players].sort((a, b) => {
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return b.bet - a.bet;
    });
  }, [players]);

  const totalPot = useMemo(() => players.reduce((acc, p) => acc + p.bet, 0), [players]);
  const activeCount = useMemo(() => players.filter((p) => p.status === "active").length, [players]);

  // Camera framing
  const heroCenterX =
    displayStep === 0 ? START_WIDTH / 2 : START_WIDTH + (displayStep - 0.5) * LANE_WIDTH;
  const totalTrackWidth = START_WIDTH + multipliers.length * LANE_WIDTH + 130;
  const maxScroll = Math.max(0, totalTrackWidth - viewportWidth);
  const cameraOffset = Math.max(0, Math.min(maxScroll, heroCenterX - viewportWidth * 0.34));

  const maxMult = multipliers[multipliers.length - 1] || 54.4;
  const myPotentialPayout =
    myPlayer && currentStep >= 1
      ? Math.min(500000, Math.floor(myPlayer.bet * currentMultiplier * 100) / 100)
      : myPlayer?.bet || cleanBet;

  const quickBets: { label: string; apply: (b: number) => number }[] = [
    { label: "½", apply: (b) => Math.max(MIN_BET, Math.floor(b / 2)) },
    { label: "x2", apply: (b) => Math.max(MIN_BET, b * 2) },
    { label: "$25", apply: () => 25 },
    { label: "$100", apply: () => 100 },
    { label: "MAX", apply: () => maxAffordable },
  ];

  const copyValue = (key: string, val: string) => {
    navigator.clipboard?.writeText(val).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2">
      {/* Main Colosseum Live Multiplayer Container */}
      <div className="w-full max-w-[1220px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
        {/* Imperial Marquee Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_12px_rgba(212,175,55,0.45)]">
              <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                <FaCrown className="text-[#ffd966] text-xs" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text">
                  {t("road.title")}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {es ? "Multijugador" : "Multiplayer"}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#9b8d6f] font-semibold">
                {es
                  ? `Arena en vivo · ${Math.round((1 - trapChance) * 100)}% éxito/paso · Hasta ${maxMult.toFixed(2)}x · Provably Fair`
                  : `Live arena · ${Math.round((1 - trapChance) * 100)}% safe/step · Up to ${maxMult.toFixed(2)}x · Provably Fair`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#14100b] border border-[#d4af37]/35 text-[11px] font-bold text-[#ffe9a8]">
              <FaUsers className="text-[#d4af37] text-xs" />
              <span className="font-mono">{players.length}</span>
              <span className="hidden sm:inline text-[#9b8d6f]">
                {es ? "en ronda" : "in round"}
              </span>
            </span>
            <span className="px-3 py-1 rounded-full bg-[#120d06] border border-[#d4af37]/45 text-[11px] font-mono tabular-nums font-black text-[#ffe9a8]">
              {es ? "Paso" : "Step"} {displayStep}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Live Round History Strip */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#100c08] border-b border-[#2a2115] overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#8a7f63] mr-1">
              {es ? "Últimas:" : "History:"}
            </span>
            {history.map((h) => (
              <span
                key={h.roundId}
                className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${
                  h.type === "victory"
                    ? "bg-[#2e2208] border-[#ffd966] text-[#ffe9a8]"
                    : h.safeSteps >= 4
                    ? "bg-emerald-950/75 border-emerald-500/45 text-emerald-300"
                    : h.safeSteps >= 1
                    ? "bg-[#1c160e] border-[#d4af37]/35 text-[#e5bc48]"
                    : "bg-red-950/75 border-red-500/45 text-red-300"
                }`}
              >
                {h.type === "victory"
                  ? `👑 ${h.maxMultiplier.toFixed(0)}x`
                  : h.safeSteps === 0
                  ? "💥 #1"
                  : `#${h.safeSteps} · ${h.maxMultiplier.toFixed(2)}x`}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex flex-col-reverse lg:flex-row">
          {/* ---------- Left Control Panel ---------- */}
          <div className="lg:w-[340px] shrink-0 flex flex-col gap-4 p-4 sm:p-5 border-t lg:border-t-0 lg:border-r border-[#d4af37]/20 bg-[#120e09]/85">
            {/* Live Phase Status Card */}
            <div className="rounded-xl bg-[#0d0a07] border border-[#2f2518] p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black uppercase tracking-wider text-[#ffe9a8]">
                  {phase === "betting"
                    ? es
                      ? "Apuestas abiertas"
                      : "Betting open"
                    : phase === "running"
                    ? es
                      ? "¡Carrera en vivo!"
                      : "Run in progress!"
                    : isArenaVictory
                    ? es
                      ? "¡Cofre alcanzado!"
                      : "Chest reached!"
                    : es
                    ? "¡Trampa activada!"
                    : "Fire trap hit!"}
                </span>
                <span className="font-mono font-black text-[#d4af37]">{timeLeftSec}s</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#1e170e] overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    phase === "betting"
                      ? "bg-gradient-to-r from-[#b8901f] to-[#ffe9a8]"
                      : phase === "running"
                      ? "bg-gradient-to-r from-emerald-500 to-amber-400"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Bet Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="road-bet"
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
                  id="road-bet"
                  type="number"
                  value={bet || ""}
                  disabled={Boolean(myPlayer) || phase !== "betting"}
                  min={MIN_BET}
                  max={MAX_BET}
                  placeholder="50"
                  onChange={(e) => {
                    const v = Math.floor(Number(e.target.value));
                    setBet(!Number.isFinite(v) || v < 0 ? 0 : Math.min(MAX_BET, v));
                  }}
                  className="w-full bg-transparent py-2.5 px-2.5 text-white font-mono tabular-nums font-black text-lg outline-none disabled:opacity-55"
                />
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {quickBets.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    disabled={Boolean(myPlayer) || phase !== "betting"}
                    onClick={() => {
                      sound.play("chip");
                      setBet((b) => Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(q.apply(b || 0)))));
                    }}
                    className={`py-1.5 rounded-lg text-xs font-black font-mono transition-all border disabled:opacity-40 cursor-pointer ${
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

            {/* Auto-Cashout Target Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#b9a77a] font-bold flex items-center gap-1.5">
                  <FaFire className="text-orange-400 text-xs" />
                  {es ? "Auto-Retiro" : "Auto Cashout"}
                </span>
                <span className="text-[10px] font-mono text-[#ffe9a8] font-bold">
                  {autoCashoutStep > 0
                    ? `${es ? "Paso" : "Step"} #${autoCashoutStep} (${multipliers[autoCashoutStep - 1]?.toFixed(2)}x)`
                    : es
                    ? "Manual"
                    : "Manual"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {AUTO_CASHOUT_OPTIONS.map((opt) => {
                  const selected = autoCashoutStep === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myPlayer) || phase !== "betting"}
                      onClick={() => {
                        sound.play("chip");
                        setAutoCashoutStep(opt);
                      }}
                      className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-mono font-black transition-all disabled:opacity-45 cursor-pointer ${
                        selected
                          ? "bg-gradient-to-b from-[#b8901f] to-[#6e500d] border-[#fff2c2] text-[#1a1204]"
                          : "bg-[#18130d] border-[#352a19] text-[#c8bba0] hover:border-[#d4af37]/60"
                      }`}
                    >
                      {opt === 0 ? "OFF" : `${multipliers[opt - 1]?.toFixed(2)}x`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="flex flex-col gap-2.5 mt-auto pt-1">
              {phase === "running" && myPlayer && myPlayer.status === "active" ? (
                <button
                  type="button"
                  onClick={handleCashout}
                  disabled={!canCashout}
                  className={`w-full py-4 px-4 rounded-xl font-black uppercase tracking-[0.12em] text-sm sm:text-base transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                    canCashout
                      ? "bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500 text-[#051a10] border-emerald-100/80 shadow-[0_0_28px_rgba(16,185,129,0.55)] active:scale-[0.98]"
                      : "bg-[#1b160f] text-[#8a7f63] border-[#332a1b] cursor-not-allowed"
                  }`}
                >
                  {currentStep >= 1 ? (
                    <span className="font-mono tabular-nums">
                      {t("games.cashOut")} · <Monetary value={myPotentialPayout} showFraction /> (
                      {currentMultiplier.toFixed(2)}x)
                    </span>
                  ) : (
                    <span>{es ? "Saltando al paso #1..." : "Leaping to step #1..."}</span>
                  )}
                </button>
              ) : myPlayer && myPlayer.status === "cashed_out" ? (
                <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/50 p-3 flex flex-col items-center gap-2 text-center">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    ✓ {es ? "Cobraste en el paso" : "Cashed out at step"} #{myPlayer.cashoutStep} (
                    {myPlayer.cashoutMultiplier?.toFixed(2)}x)
                  </span>
                  <span className="font-mono font-black text-lg text-emerald-200">
                    +<Monetary value={myPlayer.payout || 0} showFraction />
                  </span>
                  {(myPlayer.cashoutMultiplier || 0) >= 1.5 && (myPlayer.payout || 0) > 0 && (
                    <ShareWinButton
                      gameName={t("road.title")}
                      multiplier={myPlayer.cashoutMultiplier || 1}
                      payout={myPlayer.payout || 0}
                      compact
                    />
                  )}
                </div>
              ) : myPlayer && phase === "betting" ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-[#1e170a] border border-[#d4af37]/60 text-center text-xs font-black uppercase tracking-wider text-[#ffe9a8]">
                  ✓ {es ? `¡Estás en la arena! ($${myPlayer.bet}) · Largando en ${timeLeftSec}s` : `You're in! ($${myPlayer.bet}) · Starting in ${timeLeftSec}s`}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePlaceBet}
                  disabled={isLogged && !canBet}
                  className="w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-[0.15em] text-sm sm:text-base text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] border border-[#fff2c2]/70 shadow-[0_8px_24px_rgba(212,175,55,0.35)] hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {!isLogged
                    ? t("games.signInToPlay")
                    : submitting
                    ? t("games.loading")
                    : phase !== "betting"
                    ? t("games.waitNextRound")
                    : userBalance < cleanBet
                    ? t("games.notEnough")
                    : `${t("road.start")}${cleanBet > 0 ? ` · $${cleanBet.toLocaleString("en-US")}` : ""}`}
                </button>
              )}

              {canCashout && (
                <p className="text-[10px] text-center text-[#9b8d6f]">
                  {es ? "Atajo: presioná la barra espaciadora para retirar al instante" : "Shortcut: press Spacebar to cash out instantly"}
                </p>
              )}
            </div>
          </div>

          {/* ---------- Right Colosseum Live Gauntlet Stage ---------- */}
          <div className="flex-1 flex flex-col gap-3 p-3.5 sm:p-5 min-w-0 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(212,175,55,0.08),transparent_70%),linear-gradient(180deg,#120e09_0%,#090706_100%)]">
            {/* 3-stat Live HUD */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className={`rounded-xl px-2.5 py-2 border flex flex-col items-center justify-center ${
                  phase === "running" && currentStep > 0
                    ? "bg-[#1e170a] border-[#d4af37]/60"
                    : "bg-[#0d0b08] border-[#2d2416]"
                }`}
              >
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#9b8d6f] font-bold">
                  {es ? "Actual" : "Current"}
                </span>
                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#ffe9a8]">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </div>

              <div className="rounded-xl px-2.5 py-2 bg-[#0d0b08] border border-[#2d2416] flex flex-col items-center justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#9b8d6f] font-bold">
                  {es ? "Siguiente" : "Next"} ({Math.round((1 - trapChance) * 100)}%)
                </span>
                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#d4af37]">
                  {nextMultiplier.toFixed(2)}x
                </span>
              </div>

              <div
                className={`rounded-xl px-2.5 py-2 border flex flex-col items-center justify-center ${
                  myPlayer && currentStep > 0 && myPlayer.status === "active"
                    ? "bg-[#0c1d15] border-emerald-500/50"
                    : "bg-[#0d0b08] border-[#2d2416]"
                }`}
              >
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#9b8d6f] font-bold">
                  {myPlayer ? t("games.payout") : es ? "Pozo ronda" : "Round Pot"}
                </span>
                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-emerald-300 truncate max-w-full">
                  <Monetary value={myPlayer ? myPotentialPayout : totalPot} showFraction={Boolean(myPlayer)} />
                </span>
              </div>
            </div>

            {/* Horizontal Scrolling Colosseum Gauntlet Viewport */}
            <motion.div
              ref={viewportRef}
              animate={isBurned ? { x: [-10, 10, -7, 7, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full h-[310px] sm:h-[355px] rounded-2xl overflow-hidden border-2 border-[#3e3017] bg-[#090706] shadow-[inset_0_0_45px_rgba(0,0,0,0.95)]"
            >
              {/* Colosseum Backdrop Glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isBurned
                    ? "radial-gradient(60% 70% at 50% 80%, rgba(220,38,38,0.28), transparent 70%), linear-gradient(180deg, #170a0b 0%, #0d0807 65%, #1c140e 100%)"
                    : "radial-gradient(65% 65% at 50% 15%, rgba(212,175,55,0.14), transparent 68%), radial-gradient(80% 50% at 50% 100%, rgba(192,68,20,0.18), transparent 65%), linear-gradient(180deg, #16110c 0%, #0d0a08 65%, #1b140d 100%)",
                }}
              />

              {/* Scrolling Road Track */}
              <div
                className="absolute inset-y-0 left-0 flex items-stretch transition-transform duration-500 ease-out will-change-transform"
                style={{
                  width: `${totalTrackWidth}px`,
                  transform: `translate3d(-${cameraOffset}px, 0, 0)`,
                }}
              >
                {/* Start Gate (Step 0) */}
                <div
                  className="relative shrink-0 flex flex-col justify-between items-center border-r border-[#3a2d19] bg-gradient-to-b from-[#211a11]/70 via-[#15100a]/60 to-[#231a10]"
                  style={{ width: `${START_WIDTH}px` }}
                >
                  <div className="mt-4 px-2.5 py-1 rounded-full bg-[#120d06] border border-[#d4af37]/40 text-[10px] font-black uppercase tracking-widest text-[#e6ca6a]">
                    {es ? "Inicio" : "Start"}
                  </div>
                  <div className="w-full h-16 border-t-2 border-[#6e541e] bg-gradient-to-b from-[#2b2216] to-[#140f0a] flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a7f63]">
                      ARENA
                    </span>
                  </div>
                </div>

                {/* Step Lanes 1 .. totalSteps */}
                {multipliers.map((mult, idx) => {
                  const stepNum = idx + 1;
                  const isCleared =
                    phase === "running"
                      ? stepNum <= currentStep
                      : isArenaVictory
                      ? stepNum <= totalSteps
                      : isBurned
                      ? stepNum < (roundResult?.step || 0)
                      : false;
                  const isNext = phase === "running" && stepNum === currentStep + 1;
                  const isHitTrap = isBurned && roundResult?.step === stepNum;
                  const cashedHere = cashoutsByStep.get(stepNum) || [];

                  return (
                    <div
                      key={stepNum}
                      style={{ width: `${LANE_WIDTH}px` }}
                      className={`relative shrink-0 flex flex-col justify-between items-center border-r border-dashed border-[#47381f]/70 transition-colors ${
                        isNext
                          ? "bg-gradient-to-b from-[#d4af37]/10 via-[#d4af37]/[0.05] to-transparent"
                          : isCleared
                          ? "bg-gradient-to-b from-emerald-500/[0.06] via-transparent to-transparent"
                          : isHitTrap
                          ? "bg-gradient-to-b from-red-600/25 via-orange-600/15 to-red-900/35"
                          : ""
                      }`}
                    >
                      <div className="w-full h-3 bg-gradient-to-b from-[#332714] to-transparent border-b border-[#4d3b1e]/40" />

                      {/* Multiplier Medallion + Live Multiplayer Cashout Pins */}
                      <div className="mt-2 z-20 flex flex-col items-center gap-1">
                        <div
                          className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center border-2 font-mono tabular-nums transition-all duration-300 ${
                            isHitTrap
                              ? "bg-gradient-to-b from-[#dc2626] to-[#63090c] border-[#fca5a5] text-white shadow-[0_0_24px_rgba(239,68,68,0.85)] scale-110"
                              : isCleared
                              ? "bg-gradient-to-b from-[#133522] to-[#091c12] border-emerald-400 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.45)]"
                              : isNext
                              ? "bg-gradient-to-b from-[#4a3712] via-[#2b1f09] to-[#181105] border-[#ffe9a8] text-[#fff2c2] shadow-[0_0_24px_rgba(255,217,102,0.55)] scale-105 animate-pulse"
                              : "bg-[#15110b]/90 border-[#4d3c1e] text-[#c8bba0]"
                          }`}
                        >
                          <span className="text-[9px] font-sans font-bold uppercase tracking-wider opacity-75">
                            #{stepNum}
                          </span>
                          <span className="text-sm font-black leading-tight">
                            {mult >= 100 ? `${Math.round(mult)}x` : `${mult.toFixed(2)}x`}
                          </span>
                          {isCleared && <FaCheck className="text-[10px] text-emerald-400 mt-0.5" />}
                          {isHitTrap && <GiFlame className="text-xs text-orange-300 mt-0.5" />}
                        </div>

                        {/* Live avatars of players who cashed out on this tile */}
                        {cashedHere.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 max-w-[106px]">
                            {cashedHere.slice(0, 2).map((cp) => (
                              <span
                                key={cp.userId}
                                className="px-1.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/60 text-[9px] font-bold text-emerald-200 truncate max-w-[96px] shadow"
                              >
                                {cp.username}
                              </span>
                            ))}
                            {cashedHere.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-900/90 text-[9px] font-black text-emerald-100">
                                +{cashedHere.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Roaring Fire Pillar on Trap */}
                      {isHitTrap && (
                        <div
                          className="road-flame absolute bottom-14 inset-x-3 z-20 pointer-events-none rounded-t-full h-48 opacity-100"
                          style={{
                            background:
                              "radial-gradient(ellipse at bottom, #fff7c2 0%, #fbbf24 25%, #f97316 55%, #dc2626 80%, transparent 100%)",
                            filter: "blur(3px)",
                          }}
                        />
                      )}

                      {/* Iron Fire-Grate Stone Floor */}
                      <div className="relative w-full h-16 border-t-2 border-[#5c461d] bg-[#16110b] flex items-center justify-center px-2">
                        <div
                          className={`w-full h-9 rounded-md border flex items-center justify-around px-1.5 relative overflow-hidden ${
                            isCleared
                              ? "bg-gradient-to-b from-[#2e2410] to-[#1a1408] border-[#d4af37]/75 shadow-[inset_0_0_12px_rgba(212,175,55,0.3)]"
                              : isHitTrap
                              ? "bg-gradient-to-t from-orange-500 via-red-600 to-yellow-300 border-orange-300 shadow-[0_0_24px_rgba(249,115,22,0.9)]"
                              : "bg-[#0c0806] border-[#3d2e17]"
                          }`}
                        >
                          {isCleared ? (
                            <GiShieldEchoes className="text-[#ffd966] text-xl drop-shadow-[0_0_6px_rgba(255,217,102,0.7)]" />
                          ) : (
                            <>
                              <div
                                className={`absolute inset-x-0 bottom-0 h-4 ${
                                  isHitTrap ? "bg-yellow-200/80" : "bg-orange-600/25"
                                } blur-sm`}
                              />
                              {[0, 1, 2, 3, 4].map((b) => (
                                <span
                                  key={b}
                                  className="w-1.5 h-full bg-[#241c13] border-x border-black/50 z-10"
                                />
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Finish Gate: Golden Imperial Chest */}
                <div className="relative shrink-0 w-[130px] flex flex-col justify-between items-center bg-gradient-to-b from-[#33250c]/60 via-[#1f1608]/60 to-[#291d0b]">
                  <div className="mt-4 px-2.5 py-1 rounded-full bg-[#d4af37] text-[#1a1204] text-[10px] font-black uppercase tracking-wider shadow-[0_0_14px_rgba(212,175,55,0.7)]">
                    {es ? "Tesoro" : "Chest"}
                  </div>
                  <div className="relative flex flex-col items-center my-auto">
                    <div className="absolute inset-0 rounded-full bg-[#ffd966]/30 blur-xl animate-pulse" />
                    <img
                      src={CHEST_IMG}
                      alt="Imperial Chest"
                      className="relative w-20 h-20 object-contain drop-shadow-[0_8px_20px_rgba(255,215,0,0.5)]"
                    />
                    <span className="mt-1 font-mono font-black text-xs text-[#ffe9a8]">
                      {maxMult.toFixed(2)}x
                    </span>
                  </div>
                  <div className="w-full h-16 border-t-2 border-[#d4af37] bg-gradient-to-b from-[#3a2a0e] to-[#1a1206] flex items-center justify-center">
                    <FaCrown className="text-[#ffd966] text-lg" />
                  </div>
                </div>

                {/* Animated Crixus Gladiator Hero Sprite */}
                <motion.div
                  key="hero-pos"
                  animate={{
                    left: heroCenterX,
                    y: isBurned ? [0, -18, 6] : [0, -34, 0],
                    rotate: isBurned ? -22 : 0,
                    scale: isBurned ? 0.92 : 1,
                  }}
                  transition={{
                    left: { type: "spring", stiffness: 210, damping: 22 },
                    y: { duration: 0.36, ease: "easeOut" },
                    rotate: { duration: 0.3 },
                  }}
                  className="absolute bottom-[56px] z-30 pointer-events-none -translate-x-1/2"
                  style={{ width: 96 }}
                >
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-black/70 blur-[3px]" />
                  <motion.img
                    key={jumpKey}
                    src={GLADIATOR_IMG}
                    alt="Crixus Gladiator"
                    draggable={false}
                    initial={jumpKey > 0 ? { y: -28, scale: 1.08 } : false}
                    animate={{ y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    className={`relative w-24 h-24 object-contain select-none ${
                      isBurned
                        ? "brightness-75 sepia saturate-200 drop-shadow-[0_0_16px_rgba(239,68,68,0.95)]"
                        : "road-hero-idle drop-shadow-[0_8px_14px_rgba(0,0,0,0.85)]"
                    }`}
                  />
                </motion.div>
              </div>

              {/* Phase / Result Overlay Banner */}
              <AnimatePresence>
                {(roundResult || personalWin) && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-3 inset-x-3 z-40 flex justify-center pointer-events-none"
                  >
                    <div
                      className={`px-5 py-2.5 rounded-2xl border-2 backdrop-blur-md font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2 shadow-2xl ${
                        isBurned && !personalWin
                          ? "bg-[#2b090c]/90 border-[#e63946] text-[#ffb3b8]"
                          : "bg-[#1a2b18]/92 border-[#ffd966] text-[#fff2c2]"
                      }`}
                    >
                      {personalWin ? (
                        <div className="flex flex-wrap items-center justify-center gap-2.5 pointer-events-auto">
                          <FaCrown className="text-[#ffd966] text-base" />
                          <span className="font-mono tabular-nums">
                            {personalWin.type === "victory" ? t("road.victory") : t("road.cashedOut")}{" "}
                            {personalWin.multiplier.toFixed(2)}x ·{" "}
                            <Monetary value={personalWin.payout} showFraction />
                          </span>
                        </div>
                      ) : isBurned && roundResult ? (
                        <>
                          <FaSkullCrossbones className="text-[#ff5964] text-base" />
                          <span>
                            {t("road.burned")} (#{roundResult.crashStep}) ·{" "}
                            {es ? `Próxima en ${timeLeftSec}s` : `Next in ${timeLeftSec}s`}
                          </span>
                        </>
                      ) : (
                        <>
                          <FaCrown className="text-[#ffd966] text-base" />
                          <span>
                            {t("road.victory")} ({maxMult.toFixed(2)}x)
                          </span>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Provably Fair Verification Strip */}
            {arena?.hash && (
              <div className="rounded-xl bg-[#0b0907] border border-[#2c2316] px-3.5 py-2 flex flex-col gap-1 text-[11px] text-[#8a7f63]">
                <div className="flex items-center justify-between gap-2 font-mono">
                  <span className="truncate flex items-center gap-1.5">
                    <FaShieldAlt className="text-[#d4af37] shrink-0" />
                    <span className="text-[#9b8d6f]">Hash #{arena.roundId}:</span> {arena.hash}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyValue("hash", arena.hash!)}
                    className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1 cursor-pointer"
                    title="Copiar hash"
                  >
                    {copiedKey === "hash" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  </button>
                </div>
                {roundResult?.serverSeed && (
                  <div className="flex items-center justify-between gap-2 font-mono text-[#e6ca6a]">
                    <span className="truncate">
                      <span className="text-[#9b8d6f]">
                        {t("mines.seed")} ({es ? `trampa #${roundResult.crashStep}` : `trap #${roundResult.crashStep}`}):{" "}
                      </span>
                      {roundResult.serverSeed}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyValue("seed", roundResult.serverSeed)}
                      className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1 cursor-pointer"
                      title="Copiar seed"
                    >
                      {copiedKey === "seed" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---------- Live Multiplayer Arena Roster ---------- */}
        <div className="border-t border-[#d4af37]/25 bg-[#0f0c08] px-4 sm:px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FaUsers className="text-[#d4af37]" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-[#ffe9a8]">
                {es ? "Gladiadores en esta ronda" : "Gladiators in this round"}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#1d160c] border border-[#d4af37]/30 text-[10px] font-mono font-bold text-[#d4af37]">
                {players.length} · {es ? `${activeCount} en pie` : `${activeCount} alive`}
              </span>
            </div>
            <span className="text-xs font-mono text-[#b9a77a]">
              {es ? "Pozo total:" : "Total pot:"}{" "}
              <strong className="text-[#ffe9a8]">
                <Monetary value={totalPot} />
              </strong>
            </span>
          </div>

          {sortedPlayers.length === 0 ? (
            <div className="py-5 text-center text-xs text-[#8a7f63] font-semibold">
              {es
                ? "Todavía nadie entró a esta ronda. ¡Sé el primer gladiador en cruzar las llamas!"
                : "No gladiators joined yet. Be the first to enter the flames!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sortedPlayers.map((p) => {
                const isMe = myUserId && String(p.userId) === myUserId;
                return (
                  <div
                    key={p.userId}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                      p.status === "cashed_out"
                        ? "bg-emerald-950/35 border-emerald-500/45"
                        : p.status === "burned"
                        ? "bg-red-950/30 border-red-500/35 opacity-75"
                        : isMe
                        ? "bg-[#241b0c] border-[#ffd966]/70"
                        : "bg-[#15110b] border-[#2e2418]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        image={p.profilePicture}
                        loading={false}
                        id={p.userId}
                        size="small"
                        level={p.level}
                        showLevel={false}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-[#f5ead4] truncate">
                          {p.username}
                          {isMe && (
                            <span className="ml-1 text-[10px] text-[#ffd966]">
                              ({es ? "vos" : "you"})
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] font-mono text-[#9b8d6f]">
                          <Monetary value={p.bet} />
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {p.status === "cashed_out" ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-mono font-black text-emerald-300">
                            {p.cashoutMultiplier?.toFixed(2)}x (#{p.cashoutStep})
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-400">
                            +<Monetary value={p.payout || 0} />
                          </span>
                        </div>
                      ) : p.status === "burned" ? (
                        <span className="text-[11px] font-black uppercase text-red-400">
                          🔥 {es ? "Quemado" : "Burned"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2a200e] border border-[#d4af37]/40 text-[#ffe9a8]">
                          {phase === "running"
                            ? es
                              ? "Corriendo"
                              : "Running"
                            : es
                            ? "Listo"
                            : "Ready"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GladiatorRoad;

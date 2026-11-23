import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaAnchor,
  FaCheck,
  FaCoins,
  FaCopy,
  FaCrown,
  FaFire,
  FaFish,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import Avatar from "../../components/Avatar";
import SocketConnection from "../../services/socket";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";

const MIN_BET = 1;
const MAX_BET = 10000;

const BG_SEA = "/images/bigbass/arena_sea.webp";
const GALLEY_SPRITE = "/images/bigbass/galley_sprite.webp";
const BASS_SPRITE = "/images/bigbass/bass_sprite.webp";
const GOLD_SHIELD = "/images/crash/gold_shield.png";

type Phase = "betting" | "running" | "crashed";

interface BigBassPlayer {
  userId: string;
  username: string;
  profilePicture: string;
  level: number;
  bet: number;
  remainingBet: number;
  halfCashedOut: boolean;
  halfMultiplier: number | null;
  halfPayout: number;
  fullCashedOut: boolean;
  fullMultiplier: number | null;
  totalPayout: number;
}

interface BigBassReveal {
  serverSeed: string;
  hash: string;
  crashPoint: number;
}

interface BigBassState {
  roundId: number;
  phase: Phase;
  growth: number;
  multiplier: number;
  elapsedMs: number;
  gameStartTime: number | null;
  phaseEndsAt: number;
  bettingWindowMs: number;
  hash: string | null;
  players: BigBassPlayer[];
  reveal: BigBassReveal | null;
  history: number[];
}

// Precomputed fish choreography slots around the golden fishing line & net zone
const CATCH_FISH = [
  { id: 0, minMult: 1.0, left: "70%", top: "73%", size: 92, rot: -16, delay: 0, idleVisible: true },
  { id: 1, minMult: 1.0, left: "83%", top: "82%", size: 78, rot: -8, delay: 0.35, idleVisible: true },
  { id: 2, minMult: 1.2, left: "61%", top: "83%", size: 74, rot: -22, delay: 0.2, idleVisible: false },
  { id: 3, minMult: 1.6, left: "78%", top: "64%", size: 88, rot: -28, delay: 0.1, idleVisible: false },
  { id: 4, minMult: 2.5, left: "88%", top: "71%", size: 82, rot: -14, delay: 0.45, idleVisible: false },
  { id: 5, minMult: 4.0, left: "66%", top: "63%", size: 98, rot: -32, delay: 0.25, idleVisible: false },
];

const BigBassCrash = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { isLogged, userData, toogleUserFlow, toogleUserData } = useContext(UserContext);

  const socket = useMemo(() => SocketConnection.getInstance(), []);

  const [state, setState] = useState<BigBassState | null>(null);
  const [bet, setBet] = useState<number>(50);
  const [autoCashout, setAutoCashout] = useState<string>("");
  const [autoCashout50, setAutoCashout50] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [cashing, setCashing] = useState<boolean>(false);
  const [liveMultiplier, setLiveMultiplier] = useState<number>(1.0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const localRunStartRef = useRef<number | null>(null);
  const growthRef = useRef<number>(0.06);
  const phaseRef = useRef<Phase>("betting");
  const prevPhaseRef = useRef<Phase | null>(null);
  const lastTickStepRef = useRef<number>(0);

  // Smooth local countdown clock
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Lightweight 30fps RAF multiplier interpolation (identical to Crash for buttery mobile smoothness)
  useEffect(() => {
    let rafId = 0;
    let lastRender = 0;

    const tick = (now: number) => {
      if (phaseRef.current === "running" && localRunStartRef.current !== null) {
        const elapsedSec = Math.max(0, (Date.now() - localRunStartRef.current) / 1000);
        const m = Math.max(1.0, Math.exp(elapsedSec * growthRef.current));
        if (now - lastRender >= 33) {
          lastRender = now;
          setLiveMultiplier(Math.floor(m * 100) / 100);
          const step = Math.floor(m * 4);
          if (step > lastTickStepRef.current) {
            lastTickStepRef.current = step;
            sound.play("tick", m);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Subscribe to Socket.io live multiplayer arena
  useEffect(() => {
    const onState = (next: BigBassState) => {
      if (!next) return;
      growthRef.current = next.growth || 0.06;

      if (next.phase === "running") {
        localRunStartRef.current = Date.now() - (next.elapsedMs || 0);
        if (prevPhaseRef.current === "betting") {
          lastTickStepRef.current = 0;
          sound.play("launch");
        }
      } else if (next.phase === "crashed") {
        localRunStartRef.current = null;
        setLiveMultiplier(next.multiplier);
        if (prevPhaseRef.current === "running") {
          sound.play("explode");
        }
      } else {
        localRunStartRef.current = null;
        lastTickStepRef.current = 0;
        setLiveMultiplier(1.0);
      }

      phaseRef.current = next.phase;
      prevPhaseRef.current = next.phase;
      setState(next);
    };

    const onTick = (payload: { roundId: number; elapsedMs: number; multiplier: number }) => {
      if (phaseRef.current !== "running") return;
      localRunStartRef.current = Date.now() - payload.elapsedMs;
    };

    const onCashoutSuccess = (evt: {
      type: "half" | "remaining" | "full";
      multiplier: number;
      payout: number;
    }) => {
      sound.play(evt.multiplier >= 5 ? "bigWin" : "cashout");
      coinRainEmitter.trigger(evt.multiplier >= 5 ? 65 : 30);
      const label =
        evt.type === "half"
          ? es
            ? "¡50% del botín asegurado!"
            : "50% haul secured!"
          : es
          ? "¡Botín imperial cobrado!"
          : "Imperial haul secured!";
      toast.success(`${label} ${evt.multiplier.toFixed(2)}x (+$${Math.floor(evt.payout)})`, {
        theme: "dark",
      });
    };

    const onConnect = () => socket.emit("bigbass:requestSync");

    socket.on("bigbass:state", onState);
    socket.on("bigbass:tick", onTick);
    socket.on("bigbass:cashoutSuccess", onCashoutSuccess);
    socket.on("connect", onConnect);
    socket.emit("bigbass:requestSync");

    return () => {
      socket.off("bigbass:state", onState);
      socket.off("bigbass:tick", onTick);
      socket.off("bigbass:cashoutSuccess", onCashoutSuccess);
      socket.off("connect", onConnect);
    };
  }, [es, socket]);

  const myUserId = userData?.id ? String(userData.id) : null;
  const players = state?.players || [];
  const myPlayer = useMemo(
    () => (myUserId ? players.find((p) => String(p.userId) === myUserId) || null : null),
    [myUserId, players]
  );

  const phase: Phase = state?.phase || "betting";
  const history = state?.history || [];
  const timeLeftMs = Math.max(0, (state?.phaseEndsAt || nowMs) - nowMs);
  const timeLeftSec = (timeLeftMs / 1000).toFixed(1);
  const progressPct =
    phase === "betting"
      ? Math.max(0, Math.min(100, (timeLeftMs / (state?.bettingWindowMs || 10000)) * 100))
      : 0;

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

  const canCashout50 =
    phase === "running" &&
    Boolean(myPlayer && !myPlayer.halfCashedOut && !myPlayer.fullCashedOut && myPlayer.remainingBet > 0) &&
    liveMultiplier > 1.0 &&
    !cashing;

  const canCashoutFull =
    phase === "running" &&
    Boolean(myPlayer && !myPlayer.fullCashedOut && myPlayer.remainingBet > 0) &&
    liveMultiplier > 1.0 &&
    !cashing;

  const handlePlaceBet = useCallback(() => {
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }
    if (!canBet) return;
    setSubmitting(true);
    const parsedAuto = autoCashout ? Number(autoCashout) : null;
    const parsedAuto50 = autoCashout50 ? Number(autoCashout50) : null;

    socket.emit(
      "bigbass:bet",
      {
        bet: cleanBet,
        autoCashout: parsedAuto,
        autoCashout50: parsedAuto50,
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
  }, [autoCashout, autoCashout50, canBet, cleanBet, isLogged, socket, t, toogleUserData, toogleUserFlow]);

  const handleCashout50 = useCallback(() => {
    if (!canCashout50) return;
    setCashing(true);
    socket.emit("bigbass:cashout50", () => setCashing(false));
  }, [canCashout50, socket]);

  const handleCashoutFull = useCallback(() => {
    if (!canCashoutFull) return;
    setCashing(true);
    socket.emit("bigbass:cashout", () => setCashing(false));
  }, [canCashoutFull, socket]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (canCashoutFull) {
        e.preventDefault();
        handleCashoutFull();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCashoutFull, handleCashoutFull]);

  const totalPot = useMemo(() => players.reduce((s, p) => s + p.bet, 0), [players]);
  const sortedPlayers = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (a.totalPayout !== b.totalPayout) return b.totalPayout - a.totalPayout;
        return b.bet - a.bet;
      }),
    [players]
  );

  const multiplierColor = () => {
    if (phase === "crashed") return "#ff4d5a";
    if (liveMultiplier >= 10) return "#ffe27a";
    if (liveMultiplier >= 2) return "#4ade80";
    return "#ffffff";
  };

  const halfPreviewPayout = myPlayer
    ? Math.floor((myPlayer.bet / 2) * liveMultiplier * 100) / 100
    : 0;
  const fullPreviewPayout = myPlayer
    ? Math.floor(myPlayer.remainingBet * liveMultiplier * 100) / 100
    : 0;

  // Galley glides forward on the left-center of the arena, leaving the right side clear for the fish haul
  const galleyProgress = phase === "running" ? 1 - 1 / (1 + Math.max(0, liveMultiplier - 1) * 0.45) : 0;
  const galleyLeftPct = 31 + galleyProgress * 8;

  const visibleFish = useMemo(() => {
    if (phase === "crashed") return [];
    if (phase === "betting") return CATCH_FISH.filter((f) => f.idleVisible);
    return CATCH_FISH.filter((f) => liveMultiplier >= f.minMult);
  }, [liveMultiplier, phase]);

  const copyValue = (key: string, val: string) => {
    navigator.clipboard?.writeText(val).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2">
      {/* Main Crixus Colosseum Imperial Container */}
      <div className="w-full max-w-[1220px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
        {/* Top Imperial Accent Hairline */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent" />

        {/* Imperial Marquee Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_14px_rgba(212,175,55,0.45)]">
              <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                <FaFish className="text-[#ffd966] text-sm" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text">
                  {es ? "Big Bass Imperial" : "Imperial Big Bass"}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {es ? "En Vivo · Retiro 50%" : "Live · 50% Cashout"}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#9b8d6f] font-semibold">
                {es
                  ? "Naumaquia del Coliseo · Asegurá el 50% y seguí pescando · Provably Fair"
                  : "Colosseum Naumachia · Lock 50% and keep reeling · Provably Fair"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#14100b] border border-[#d4af37]/35 text-[11px] font-bold text-[#ffe9a8]">
              <FaUsers className="text-[#d4af37] text-xs" />
              <span className="font-mono">{players.length}</span>
              <span className="hidden sm:inline text-[#9b8d6f]">
                {es ? "en la galera" : "on galley"}
              </span>
            </span>
          </div>
        </div>

        {/* History Strip */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#100c08] border-b border-[#2a2115] overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#8a7f63] mr-1">
              {es ? "Últimas:" : "History:"}
            </span>
            {history.map((cp, idx) => (
              <span
                key={`${idx}-${cp}`}
                className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${
                  cp >= 10
                    ? "bg-gradient-to-b from-[#3d2d0d] to-[#211706] border-[#ffd966]/70 text-[#ffe9a8]"
                    : cp >= 2
                    ? "bg-[#0e261b] border-emerald-500/45 text-emerald-300"
                    : "bg-[#2b1014] border-[#c0262d]/50 text-[#ff8a93]"
                }`}
              >
                {cp.toFixed(2)}x
              </span>
            ))}
          </div>
        )}

        {/* Arena Grid */}
        <div className="flex flex-col-reverse lg:flex-row">
          {/* LEFT: Crixus Control Panel */}
          <div className="lg:w-[345px] shrink-0 flex flex-col gap-4 p-4 sm:p-5 border-t lg:border-t-0 lg:border-r border-[#d4af37]/20 bg-[#120e09]/85">
            {/* Bet Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bigbass-bet"
                  className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5"
                >
                  <FaCoins className="text-[#d4af37] text-xs" />
                  {t("games.bet")}
                </label>
                {userData && (
                  <span className="text-[11px] font-mono text-[#9b8d6f]">
                    {t("games.balance")}:{" "}
                    <strong className="text-[#ffe9a8]">
                      <Monetary value={Math.floor(userBalance)} />
                    </strong>
                  </span>
                )}
              </div>

              <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#090806] focus-within:border-[#d4af37] focus-within:shadow-[0_0_16px_rgba(212,175,55,0.2)] transition-all">
                <span className="pl-3.5 text-[#d4af37] font-black text-lg">$</span>
                <input
                  id="bigbass-bet"
                  type="number"
                  min={MIN_BET}
                  max={MAX_BET}
                  disabled={Boolean(myPlayer) || phase !== "betting"}
                  value={bet || ""}
                  onChange={(e) => {
                    const v = Math.floor(Number(e.target.value));
                    setBet(!Number.isFinite(v) || v < 0 ? 0 : Math.min(MAX_BET, v));
                  }}
                  className="w-full bg-transparent py-2.5 px-2.5 text-white font-mono font-black text-lg outline-none disabled:opacity-55"
                />
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: "½", fn: (b: number) => Math.max(MIN_BET, Math.floor(b / 2)) },
                  { label: "x2", fn: (b: number) => Math.min(MAX_BET, Math.max(MIN_BET, b * 2)) },
                  { label: "$25", fn: () => 25 },
                  { label: "$100", fn: () => 100 },
                  { label: "MAX", fn: () => maxAffordable },
                ].map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    disabled={Boolean(myPlayer) || phase !== "betting"}
                    onClick={() => {
                      sound.play("chip");
                      setBet((b) => q.fn(b || 0));
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

            {/* Dual Auto-Cashout Inputs (50% + 100%) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#ffd966]">
                  Auto 50% (x)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.1"
                  max="1000"
                  placeholder="Ej: 2.00"
                  disabled={Boolean(myPlayer) || phase !== "betting"}
                  value={autoCashout50}
                  onChange={(e) => setAutoCashout50(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#090806] border border-[#3e3219] focus:border-[#d4af37] text-xs font-mono font-bold text-[#ffe9a8] placeholder-[#6c604d] outline-none disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Auto 100% (x)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.1"
                  max="1000"
                  placeholder="Ej: 5.00"
                  disabled={Boolean(myPlayer) || phase !== "betting"}
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#090806] border border-[#3e3219] focus:border-emerald-400 text-xs font-mono font-bold text-emerald-300 placeholder-[#6c604d] outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Dual Cashout / Cast Net Controls */}
            <div className="flex flex-col gap-2.5 mt-auto pt-2 border-t border-[#2c2316]">
              {phase === "running" && myPlayer && !myPlayer.fullCashedOut ? (
                <>
                  <button
                    type="button"
                    disabled={!canCashout50}
                    onClick={handleCashout50}
                    className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      canCashout50
                        ? "bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] border-[#fff2c2]/80 shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:brightness-110 active:scale-[0.98]"
                        : "bg-[#1a140d] text-[#7a6f59] border-[#332a1b] cursor-not-allowed"
                    }`}
                  >
                    <FaAnchor className="text-sm" />
                    <span>
                      {myPlayer.halfCashedOut
                        ? `${es ? "✓ 50% asegurado" : "✓ 50% locked"} (${myPlayer.halfMultiplier?.toFixed(2)}x)`
                        : `${es ? "Cobrar 50%" : "Cash out 50%"} · $${halfPreviewPayout.toFixed(2)}`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!canCashoutFull}
                    onClick={handleCashoutFull}
                    className="w-full py-4 px-4 rounded-xl font-black uppercase tracking-wider text-sm sm:text-base text-[#051a10] bg-gradient-to-r from-emerald-500 via-emerald-300 to-emerald-500 border border-emerald-100/80 shadow-[0_0_28px_rgba(16,185,129,0.55)] hover:brightness-110 active:scale-[0.98] disabled:opacity-45 transition-all cursor-pointer"
                  >
                    {myPlayer.halfCashedOut
                      ? `${es ? "Cobrar resto" : "Cash out rest"} · $${fullPreviewPayout.toFixed(2)} (${liveMultiplier.toFixed(2)}x)`
                      : `${t("games.cashOut")} · $${fullPreviewPayout.toFixed(2)} (${liveMultiplier.toFixed(2)}x)`}
                  </button>
                  <p className="text-[10px] text-center text-[#9b8d6f]">
                    {es ? "Barra espaciadora = Cobrar 100% al instante" : "Spacebar = Instant full cashout"}
                  </p>
                </>
              ) : myPlayer && myPlayer.fullCashedOut ? (
                <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/50 p-3 flex flex-col items-center gap-2 text-center">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    👑 {es ? "¡Botín imperial asegurado!" : "Imperial haul secured!"}
                  </span>
                  <span className="font-mono font-black text-lg text-emerald-200">
                    +<Monetary value={myPlayer.totalPayout} showFraction />
                  </span>
                  {myPlayer.totalPayout > myPlayer.bet && (
                    <ShareWinButton
                      gameName={es ? "Big Bass Imperial" : "Imperial Big Bass"}
                      multiplier={myPlayer.fullMultiplier || myPlayer.halfMultiplier || 1}
                      payout={myPlayer.totalPayout}
                      compact
                    />
                  )}
                </div>
              ) : myPlayer && phase === "betting" ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-[#1e170a] border border-[#d4af37]/60 text-center text-xs font-black uppercase tracking-wider text-[#ffe9a8]">
                  ⚓ {es ? `¡En la galera imperial! ($${myPlayer.bet}) · Zarpando en ${timeLeftSec}s` : `On the galley! ($${myPlayer.bet}) · Sailing in ${timeLeftSec}s`}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePlaceBet}
                  disabled={isLogged && !canBet}
                  className="w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-[0.15em] text-sm sm:text-base text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] border border-[#fff2c2]/70 shadow-[0_8px_24px_rgba(212,175,55,0.38)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {!isLogged
                    ? t("games.signInToPlay")
                    : submitting
                    ? t("games.loading")
                    : phase !== "betting"
                    ? t("games.waitNextRound")
                    : userBalance < cleanBet
                    ? t("games.notEnough")
                    : `${es ? "Lanzar Red Imperial" : "Cast Imperial Net"} · $${cleanBet.toLocaleString("en-US")}`}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: AAA Cinematic Flooded Colosseum Stage (GPU Parallax + Painterly Sprites) */}
          <div className="flex-1 flex flex-col gap-3 p-3.5 sm:p-5 min-w-0 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(212,175,55,0.08),transparent_70%),linear-gradient(180deg,#120e09_0%,#090706_100%)]">
            <motion.div
              animate={
                phase === "crashed"
                  ? { x: [-10, 10, -7, 7, -3, 3, 0], y: [-4, 4, -3, 3, 0] }
                  : { x: 0, y: 0 }
              }
              transition={{ duration: 0.4 }}
              className="relative w-full h-[330px] sm:h-[400px] md:h-[430px] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0a0705] border-2 border-[#d4af37]/55 ring-1 ring-[#d4af37]/20 shadow-[inset_0_0_50px_rgba(0,0,0,0.85),0_12px_40px_rgba(0,0,0,0.65)]"
            >
              {/* Top Countdown Bar during Betting */}
              {phase === "betting" && (
                <div className="absolute top-0 inset-x-0 z-30 h-1.5 bg-black/50">
                  <div
                    className="h-full bg-gradient-to-r from-[#b8901f] via-[#ffe9a8] to-[#b8901f] shadow-[0_0_12px_rgba(255,217,102,0.75)] transition-[width] duration-100 ease-linear"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Layer 1: Seamless Cinematic Flooded Colosseum Backdrop (no mirror seam!) */}
              <motion.img
                src={BG_SEA}
                alt=""
                draggable={false}
                animate={{
                  scale: phase === "running" ? [1.06, 1.11, 1.06] : [1.04, 1.06, 1.04],
                  x: phase === "running" ? ["-1.8%", "1.8%", "-1.8%"] : ["-0.8%", "0.8%", "-0.8%"],
                }}
                transition={{
                  duration: phase === "running" ? 10 : 18,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
              />

              {/* Atmospheric Vignette & Crash Crimson Tint */}
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-500"
                style={{
                  background:
                    phase === "crashed"
                      ? "radial-gradient(65% 65% at 50% 45%, rgba(192,38,45,0.28), rgba(10,5,5,0.72))"
                      : "radial-gradient(70% 65% at 50% 45%, transparent 38%, rgba(8,6,4,0.62) 100%)",
                }}
              />

              {/* Layer 2: Sunburst + Crixus Gold Shield Multiplier Medallion */}
              <div className="absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div
                  className="crash-sunburst absolute left-1/2 top-1/2 h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full transition-opacity duration-500"
                  style={{
                    opacity: phase === "running" ? 0.85 : 0.25,
                    background:
                      phase === "crashed"
                        ? "repeating-conic-gradient(from 0deg, rgba(220,38,38,0.28) 0deg 9deg, transparent 9deg 18deg)"
                        : "repeating-conic-gradient(from 0deg, rgba(212,175,55,0.24) 0deg 9deg, transparent 9deg 18deg)",
                    WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 65%)",
                    maskImage: "radial-gradient(circle, black 15%, transparent 65%)",
                  }}
                />
                <div
                  className={`relative flex items-center justify-center w-[112px] h-[112px] sm:w-[144px] sm:h-[144px] transition-transform duration-300 ${
                    phase === "crashed" ? "scale-110" : "scale-100"
                  }`}
                >
                  <img
                    src={GOLD_SHIELD}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full select-none transition-[filter] duration-500"
                    style={{
                      filter:
                        phase === "running"
                          ? "drop-shadow(0 0 22px rgba(212,175,55,0.75))"
                          : phase === "crashed"
                          ? "grayscale(0.65) brightness(0.5) drop-shadow(0 0 24px rgba(192,38,45,0.9))"
                          : "brightness(0.88) drop-shadow(0 0 14px rgba(212,175,55,0.45))",
                    }}
                  />
                  <span
                    className="relative font-black font-mono tabular-nums text-2xl sm:text-3xl transition-colors duration-300"
                    style={{
                      color: phase === "betting" ? "#ffe9a8" : multiplierColor(),
                      WebkitTextStroke: "1.5px #1a0f05",
                      textShadow: "0 3px 0 #1a0f05, 0 0 18px rgba(0,0,0,0.9)",
                    }}
                  >
                    {phase === "betting" ? `${timeLeftSec}s` : `${liveMultiplier.toFixed(2)}x`}
                  </span>
                </div>
              </div>

              {/* Layer 3: Golden Fishing Line & Luminous Underwater Net Aura */}
              {phase !== "crashed" && (
                <svg
                  className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="bassLineGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fff4c4" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity="0.65" />
                    </linearGradient>
                    <radialGradient id="netAuraGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffd966" stopOpacity={phase === "running" ? "0.35" : "0.14"} />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {/* Submerged golden catch glow */}
                  <ellipse cx="73" cy="76" rx="19" ry="14" fill="url(#netAuraGrad)" />
                  {/* Curved golden fishing line from rod tip to catch zone */}
                  <path
                    d={`M ${galleyLeftPct + 16} 47 Q ${galleyLeftPct + 29} 56 72 74`}
                    fill="none"
                    stroke="url(#bassLineGrad)"
                    strokeWidth="2.4"
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}

              {/* Layer 4: Real Painterly Roman Imperial War Galley Sprite (outer wrapper preserves centering!) */}
              <div
                style={{
                  left: `${galleyLeftPct}%`,
                  top: "56%",
                  transform: "translate(-50%, -50%)",
                  transition: "left 0.4s ease-out",
                }}
                className="absolute z-20 w-[225px] sm:w-[295px] md:w-[335px] pointer-events-none"
              >
                <motion.div
                  animate={{
                    y: phase === "running" ? [0, -7, 2, -5, 0] : [0, -4, 0],
                    rotate: phase === "running" ? [-2, 1.5, -1.5, 0] : [-1, 1, -1],
                  }}
                  transition={{
                    y: { duration: phase === "running" ? 2.1 : 3.2, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
                  }}
                  className="relative w-full"
                >
                  {/* Warm golden water reflection beneath the hull */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[78%] h-7 rounded-full bg-[#ffd966]/30 blur-xl" />
                  <img
                    src={GALLEY_SPRITE}
                    alt="Crixus Imperial Galley"
                    draggable={false}
                    className="relative w-full h-auto select-none drop-shadow-[0_14px_24px_rgba(0,0,0,0.88)]"
                  />
                </motion.div>
              </div>

              {/* Layer 5: Real Painterly Golden Crowned Bass Sprites Swimming & Leaping! */}
              <AnimatePresence>
                {visibleFish.map((fish) => (
                  <div
                    key={fish.id}
                    style={{
                      left: fish.left,
                      top: fish.top,
                      width: fish.size,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute z-20 pointer-events-none"
                  >
                    <motion.img
                      src={BASS_SPRITE}
                      alt=""
                      draggable={false}
                      initial={{ opacity: 0, scale: 0.45, x: 32, y: 18 }}
                      animate={{
                        opacity: phase === "running" ? 1 : 0.85,
                        scale: phase === "running" ? 1 : 0.86,
                        x: [0, -8, 5, 0],
                        y: [0, -11, 3, 0],
                        rotate: [fish.rot, fish.rot - 8, fish.rot + 5, fish.rot],
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.45,
                        x: (fish.id % 2 === 0 ? 1 : -1) * 85,
                        y: 55,
                        transition: { duration: 0.45 },
                      }}
                      transition={{
                        opacity: { duration: 0.35 },
                        scale: { type: "spring", stiffness: 250, damping: 18 },
                        x: { duration: 2.2 + fish.delay, repeat: Infinity, ease: "easeInOut" },
                        y: { duration: 1.7 + fish.delay, repeat: Infinity, ease: "easeInOut" },
                        rotate: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
                      }}
                      className="w-full h-auto select-none drop-shadow-[0_0_16px_rgba(255,217,102,0.75)]"
                    />
                  </div>
                ))}
              </AnimatePresence>

              {/* Layer 6: Net Snap Fire-Gold Explosion */}
              <AnimatePresence>
                {phase === "crashed" && (
                  <div
                    style={{ left: "72%", top: "72%", transform: "translate(-50%, -50%)" }}
                    className="absolute z-30 w-36 h-36 pointer-events-none"
                  >
                    <motion.div
                      key="net-snap-burst"
                      className="w-full h-full relative"
                      initial={{ scale: 0.25, opacity: 1 }}
                      animate={{ scale: [0.25, 2.4, 3.6], opacity: [1, 0.85, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.0, ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 rounded-full bg-red-600/90 blur-xl" />
                      <div className="absolute inset-[18%] rounded-full bg-orange-400 blur-lg" />
                      <div className="absolute inset-[36%] rounded-full bg-yellow-200 blur-md" />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Layer 7: Clean Non-Overlapping Status Badge */}
              <div className="absolute inset-x-0 top-3.5 z-30 flex items-center justify-between px-4 pointer-events-none">
                <AnimatePresence mode="wait">
                  {phase === "betting" && (
                    <motion.div
                      key="betting-pill"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#120d08]/85 backdrop-blur-md border border-[#d4af37]/50 shadow-lg"
                    >
                      <FaFire className="text-[#ffd966] text-xs" />
                      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#fff2c2]">
                        {es ? "La Galera Zarpa Pronto" : "Galley Sets Sail Soon"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="absolute inset-x-0 bottom-4 z-30 flex flex-col items-center pointer-events-none px-4 text-center">
                <AnimatePresence mode="wait">
                  {phase === "crashed" && (
                    <motion.div
                      key="crashed-banner"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="px-6 py-1.5 rounded-full bg-[#2b090c]/90 border-2 border-[#e63946] shadow-[0_0_25px_rgba(239,68,68,0.65)]"
                    >
                      <span className="text-base sm:text-2xl font-black uppercase tracking-[0.18em] text-[#ff5c67]">
                        {es ? "¡SE ROMPIÓ LA RED!" : "THE NET SNAPPED!"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Provably Fair Strip */}
            {state?.hash && (
              <div className="rounded-xl bg-[#0b0907] border border-[#2c2316] px-3.5 py-2 flex flex-col gap-1 text-[11px] text-[#8a7f63]">
                <div className="flex items-center justify-between gap-2 font-mono">
                  <span className="truncate flex items-center gap-1.5">
                    <FaShieldAlt className="text-[#d4af37] shrink-0" />
                    <span className="text-[#9b8d6f]">Hash #{state.roundId}:</span> {state.hash}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyValue("hash", state.hash!)}
                    className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1 cursor-pointer"
                    title="Copiar hash"
                  >
                    {copiedKey === "hash" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  </button>
                </div>
                {state.reveal?.serverSeed && (
                  <div className="flex items-center justify-between gap-2 font-mono text-[#e6ca6a]">
                    <span className="truncate">
                      <span className="text-[#9b8d6f]">Seed ({state.reveal.crashPoint.toFixed(2)}x): </span>
                      {state.reveal.serverSeed}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyValue("seed", state.reveal!.serverSeed)}
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

        {/* Live Multiplayer Galley Crew Roster */}
        <div className="border-t border-[#d4af37]/25 bg-[#0f0c08] px-4 sm:px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FaCrown className="text-[#d4af37]" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-[#ffe9a8]">
                {es ? "Tripulación Imperial en esta ronda" : "Imperial Crew on this voyage"}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#1d160c] border border-[#d4af37]/30 text-[10px] font-mono font-bold text-[#ffd966]">
                {players.length}
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
                ? "Todavía no hay gladiadores en la galera. ¡Lanzá tu red imperial para la próxima salida!"
                : "No gladiators on the galley yet. Cast your imperial net for the next voyage!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sortedPlayers.map((p) => {
                const isMe = myUserId && String(p.userId) === myUserId;
                const lostAll = phase === "crashed" && !p.fullCashedOut && !p.halfCashedOut;
                return (
                  <div
                    key={p.userId}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                      p.fullCashedOut
                        ? "bg-emerald-950/35 border-emerald-500/45"
                        : p.halfCashedOut
                        ? "bg-[#26200b]/65 border-[#ffd966]/55"
                        : lostAll
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
                      {p.fullCashedOut ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-mono font-black text-emerald-300">
                            {p.halfCashedOut
                              ? `50%@ ${p.halfMultiplier?.toFixed(2)}x · ${p.fullMultiplier?.toFixed(2)}x`
                              : `${p.fullMultiplier?.toFixed(2)}x`}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-400">
                            +<Monetary value={p.totalPayout} />
                          </span>
                        </div>
                      ) : p.halfCashedOut ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-mono font-black text-[#ffe9a8]">
                            50% @ {p.halfMultiplier?.toFixed(2)}x
                          </span>
                          <span className="text-[10px] font-mono text-emerald-300">
                            +<Monetary value={p.halfPayout} /> {phase === "crashed" ? "· 💥" : "· ⚓"}
                          </span>
                        </div>
                      ) : lostAll ? (
                        <span className="text-[11px] font-black uppercase text-red-400">
                          💥 {es ? "Red rota" : "Lost"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2a200e] border border-[#d4af37]/40 text-[#ffe9a8]">
                          {phase === "running"
                            ? es
                              ? "Pescando"
                              : "Reeling"
                            : es
                            ? "A bordo"
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

export default BigBassCrash;

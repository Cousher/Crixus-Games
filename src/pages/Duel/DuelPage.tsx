import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowRight,
  FaCheck,
  FaClock,
  FaCoins,
  FaCopy,
  FaCrown,
  FaFire,
  FaRedo,
  FaSearch,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import MainButton from "../../components/MainButton";
import ShareWinButton from "../../components/ShareWinButton";
import Avatar from "../../components/Avatar";
import Coin, { CARA_IMG, CRUZ_IMG } from "../Coin/Coin";
import SocketConnection from "../../services/socket";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";
import {
  cancelDuel,
  createDuel,
  getDuel,
  getMyDuels,
  joinDuel,
} from "../../services/games/DuelServices";

interface DuelDoc {
  _id: string;
  code: string;
  creatorId: string;
  creatorUsername: string;
  creatorAvatar?: string;
  creatorLevel?: number;
  creatorSide: "heads" | "tails";
  betAmount: number;
  opponentId?: string | null;
  opponentUsername?: string;
  opponentAvatar?: string;
  opponentLevel?: number;
  resultSide?: "heads" | "tails" | null;
  winnerId?: string | null;
  winnerUsername?: string;
  payout: number;
  status: "open" | "completed" | "cancelled" | "expired";
  expiresAt: string;
}

const MIN_BET = 10;
const MAX_BET = 25000;
const PAYOUT_MULT = 1.95;
const QUICK_BETS = [50, 100, 500, 1000, 5000];
const DUEL_ARENA_BG = "/images/duel/duel_arena_bg.webp";

const DUEL_EMBERS = [
  { id: 0, left: "8%", delay: 0.0, dur: 4.3, crimson: true },
  { id: 1, left: "15%", delay: 1.5, dur: 3.9, crimson: true },
  { id: 2, left: "22%", delay: 0.8, dur: 4.7, crimson: true },
  { id: 3, left: "78%", delay: 0.4, dur: 4.1, crimson: false },
  { id: 4, left: "85%", delay: 1.8, dur: 3.7, crimson: false },
  { id: 5, left: "92%", delay: 1.1, dur: 4.5, crimson: false },
];

const CLASH_SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const r = 75 + (i % 3) * 28;
  return { id: i, tx: Math.cos(angle) * r, ty: Math.sin(angle) * r };
});

function formatRemainingTime(expiresAt: string, es: boolean): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return es ? "Expirado" : "Expired";
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) return `${hrs}h ${remMins}m`;
  return `${Math.max(1, remMins)}m`;
}

const DuelPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { isLogged, userData, toogleUserFlow, toogleUserData } = useContext(UserContext);

  // Create & join-by-code state
  const [bet, setBet] = useState<number>(100);
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [creating, setCreating] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  // Active room state
  const [duel, setDuel] = useState<DuelDoc | null>(null);
  const [loadingDuel, setLoadingDuel] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [showBurstSeq, setShowBurstSeq] = useState(0);
  const [copied, setCopied] = useState(false);

  // User's duel history
  const [myDuels, setMyDuels] = useState<DuelDoc[]>([]);

  // Guards against duplicate duel:resolved + HTTP joinDuel double-spin collision
  const resolvedCodesRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const loadMyDuels = async () => {
    if (!isLogged) return;
    try {
      const res = await getMyDuels();
      setMyDuels(res?.duels || []);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    loadMyDuels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogged, code]);

  useEffect(() => {
    clearTimers();
    setSpinning(false);
    if (!code) {
      setDuel(null);
      setNotFound(false);
      return;
    }

    setLoadingDuel(true);
    setNotFound(false);
    getDuel(code)
      .then((res) => {
        setDuel(res?.duel || null);
        if (!res?.duel) setNotFound(true);
      })
      .catch(() => {
        setDuel(null);
        setNotFound(true);
      })
      .finally(() => setLoadingDuel(false));
  }, [code]);

  const runShowdownReveal = (resolved: DuelDoc, walletBalance?: number) => {
    const key = resolved.code.toUpperCase();
    if (resolvedCodesRef.current.has(key)) return;
    resolvedCodesRef.current.add(key);

    clearTimers();
    setSpinning(true);
    sound.play("duelClash");
    const flipTimer = setTimeout(() => sound.play("flip"), 180);
    const landTimer = setTimeout(() => {
      setSpinning(false);
      setDuel(resolved);
      setShowBurstSeq((s) => s + 1);
      sound.play("coinLand");

      if (typeof walletBalance === "number" && userData) {
        toogleUserData({ ...userData, walletBalance });
      }

      const iWon = userData?.id && String(resolved.winnerId) === String(userData.id);
      const outcomeTimer = setTimeout(() => {
        if (iWon) {
          sound.play("bigWin");
          coinRainEmitter.trigger(75);
          toast.success(
            es ? `¡Ganaste el duelo! +$${resolved.payout}` : `You won the duel! +$${resolved.payout}`,
            { theme: "dark" }
          );
        } else if (
          userData?.id &&
          (String(resolved.creatorId) === String(userData.id) ||
            String(resolved.opponentId) === String(userData.id))
        ) {
          sound.play("lose");
        }
        loadMyDuels();
      }, 360);
      timersRef.current.push(outcomeTimer);
    }, 1550);

    timersRef.current.push(flipTimer, landTimer);
  };

  // Listen for live duel resolution via Socket.io when creator is waiting in the pit
  useEffect(() => {
    if (!code) return;
    const socket = SocketConnection.getInstance();
    const onResolved = (resolved: DuelDoc) => {
      if (resolved && resolved.code === code.toUpperCase()) {
        runShowdownReveal(resolved);
      }
    };
    socket.on("duel:resolved", onResolved);
    return () => {
      socket.off("duel:resolved", onResolved);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userData?.id]);

  const buildDuelShareUrl = (duelCode: string, creatorUsername?: string) => {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://crixus.com.ar";
    const refQuery = creatorUsername ? `?ref=${encodeURIComponent(creatorUsername)}` : "";
    return `${origin}/duel/${duelCode}${refQuery}`;
  };

  const buildDuelWhatsAppUrl = (d: DuelDoc) => {
    const link = buildDuelShareUrl(d.code, d.creatorUsername);
    const payoutStr = `$${Math.floor(d.payout).toLocaleString("es-AR")}`;
    const betStr = `$${Math.floor(d.betAmount).toLocaleString("es-AR")}`;
    const text = es
      ? `⚔️ ¡Te desafío a un Duelo 1v1 en Crixus Games!\nAposté ${betStr} — el ganador se lleva ${payoutStr} 🏆\n¿Te animás? Aceptá acá 👇\n${link}`
      : `⚔️ I challenge you to a 1v1 Duel on Crixus Games!\nStake ${betStr} — winner takes ${payoutStr} 🏆\nAccept here 👇\n${link}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const handleCreate = async () => {
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }
    const cleanBet = Math.floor(Number(bet));
    if (!Number.isFinite(cleanBet) || cleanBet < MIN_BET || cleanBet > MAX_BET) {
      toast.error(
        es
          ? `La apuesta debe estar entre $${MIN_BET} y $${MAX_BET.toLocaleString()}`
          : `Bet must be between $${MIN_BET} and $${MAX_BET.toLocaleString()}`,
        { theme: "dark" }
      );
      return;
    }

    setCreating(true);
    try {
      const res = await createDuel(cleanBet, side);
      sound.play("duelClash");
      if (typeof res.walletBalance === "number" && userData) {
        toogleUserData({ ...userData, walletBalance: res.walletBalance });
      }
      toast.success(
        es
          ? "¡Duelo creado! Mandá el link a un amigo por WhatsApp"
          : "Duel created! Share the link with a friend",
        { theme: "dark" }
      );
      navigate(`/duel/${res.duel.code}`);
    } catch (error: any) {
      toast.error(
        translateApiMessage(error, es ? "Error al crear el duelo" : "Could not create duel"),
        { theme: "dark" }
      );
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!duel) return;
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }

    setJoining(true);
    try {
      const res = await joinDuel(duel.code);
      runShowdownReveal(res.duel, res.walletBalance);
    } catch (error: any) {
      toast.error(
        translateApiMessage(error, es ? "No se pudo aceptar el duelo" : "Could not join duel"),
        { theme: "dark" }
      );
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async (duelCode: string) => {
    setCancelling(true);
    try {
      const res = await cancelDuel(duelCode);
      if (typeof res.walletBalance === "number" && userData) {
        toogleUserData({ ...userData, walletBalance: res.walletBalance });
      }
      if (duel && duel.code === duelCode) {
        setDuel(res.duel);
      }
      toast.info(es ? "Duelo cancelado y fichas devueltas" : "Duel cancelled & stake refunded", {
        theme: "dark",
      });
      loadMyDuels();
    } catch (error: any) {
      toast.error(
        translateApiMessage(error, es ? "No se pudo cancelar" : "Could not cancel"),
        { theme: "dark" }
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyDuelLink = async (d: DuelDoc) => {
    try {
      await navigator.clipboard.writeText(buildDuelShareUrl(d.code, d.creatorUsername));
      setCopied(true);
      sound.play("click");
      toast.success(es ? "¡Link del duelo copiado!" : "Duel link copied!", {
        theme: "dark",
        autoClose: 2200,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(es ? "No se pudo copiar" : "Could not copy", { theme: "dark" });
    }
  };

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 4) return;
    sound.play("chip");
    setJoinCodeInput("");
    navigate(`/duel/${cleaned}`);
  };

  const sideLabel = (s: "heads" | "tails") =>
    s === "heads" ? (es ? "Cara" : "Heads") : es ? "Cruz" : "Tails";

  const isCreator = Boolean(duel && userData?.id && String(duel.creatorId) === String(userData.id));
  const creatorWon = Boolean(
    duel && duel.status === "completed" && String(duel.winnerId) === String(duel.creatorId)
  );
  const opponentWon = Boolean(
    duel &&
      duel.status === "completed" &&
      duel.opponentId &&
      String(duel.winnerId) === String(duel.opponentId)
  );
  const iWonCompleted = Boolean(
    duel && duel.status === "completed" && userData?.id && String(duel.winnerId) === String(userData.id)
  );

  return (
    <div className="w-full flex flex-col items-center px-2 sm:px-4 pb-12 -mt-2 z-10">
      <div className="w-full max-w-[1080px] flex flex-col gap-6">
        {/* Main AAA Colosseum 1v1 Showdown Container */}
        <div className="w-full rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/50 bg-[#0d0a07] shadow-[0_32px_80px_-14px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,233,168,0.14)]">
          {/* Top Gold Accent Hairline */}
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffe9a8]/90 to-transparent" />

          {/* Imperial Showdown Header */}
          <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#21180d] via-[#2f2312] to-[#21180d] border-b border-[#d4af37]/35">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#fff2c2] to-[#8a6b18] p-[1.5px] shadow-[0_0_16px_rgba(212,175,55,0.5)]">
                <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                  <GiCrossedSwords className="text-[#ffd966] text-base" />
                </div>
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text">
                  {es ? "Duelo 1v1 en la Arena" : "1v1 Arena Duel"}
                </h1>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#a59574] font-semibold">
                  {es
                    ? "Combate Privado Cara o Cruz · El ganador se lleva 1.95x"
                    : "Private Coin Flip Combat · Winner takes 1.95x"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {code && (
                <Link
                  to="/duel"
                  className="px-3.5 py-1.5 rounded-full bg-[#16110a] border border-[#d4af37]/50 hover:border-[#ffe9a8] text-xs font-black uppercase tracking-wider text-[#ffe9a8] transition-colors"
                >
                  {es ? "+ Nuevo Duelo" : "+ New Duel"}
                </Link>
              )}
              <Link
                to="/coinflip"
                className="px-3 py-1.5 rounded-full bg-[#151009] border border-[#3e3219] hover:border-[#d4af37]/70 text-[11px] font-bold text-[#c8bba0] hover:text-[#ffe9a8] transition-colors"
              >
                {es ? "Sala Global" : "Global Room"}
              </Link>
            </div>
          </div>

          {/* Cinematic Split-Lighting Gladiator Pit Stage */}
          <div className="relative w-full overflow-hidden">
            {/* Painterly Gladiator Showdown Backdrop */}
            <img
              src={DUEL_ARENA_BG}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-85"
            />

            {/* Crimson Left vs Molten-Gold Right Torch Flickers */}
            <div
              className="slot-brazier-flame absolute left-[8%] top-[44%] w-40 h-40 rounded-full pointer-events-none blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(239,68,68,0.44) 0%, rgba(185,28,28,0.14) 55%, transparent 75%)",
              }}
            />
            <div
              className="slot-brazier-flame absolute right-[8%] top-[44%] w-40 h-40 rounded-full pointer-events-none blur-2xl"
              style={{
                animationDelay: "0.3s",
                background:
                  "radial-gradient(circle, rgba(255,205,60,0.44) 0%, rgba(212,150,20,0.14) 55%, transparent 75%)",
              }}
            />

            {/* Drifting Crimson & Golden Arena Sparks */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {DUEL_EMBERS.map((e) => (
                <motion.span
                  key={e.id}
                  initial={{ y: 220, opacity: 0, scale: 0.5 }}
                  animate={{
                    y: [-10, -210],
                    x: [0, e.crimson ? 14 : -14, 0],
                    opacity: [0, 0.9, 0],
                    scale: [0.5, 1.15, 0.3],
                  }}
                  transition={{
                    duration: e.dur,
                    delay: e.delay,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  style={{ left: e.left, bottom: "12%" }}
                  className={`absolute w-1.5 h-1.5 rounded-full ${
                    e.crimson
                      ? "bg-[#ff6b72] shadow-[0_0_8px_#ef4444]"
                      : "bg-[#ffe28a] shadow-[0_0_8px_#f59e0b]"
                  }`}
                />
              ))}
            </div>

            {/* Dark Readability Vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(64% 66% at 50% 48%, rgba(10,8,6,0.28), rgba(6,4,3,0.76) 86%)",
              }}
            />

            {/* ============ ROOM VIEW (/duel/:code) ============ */}
            {code ? (
              <div className="relative z-10 p-4 sm:p-8 flex flex-col items-center gap-6">
                {loadingDuel ? (
                  <div className="py-16 text-center text-sm text-[#e6ca6a] uppercase tracking-[0.22em] font-black animate-pulse">
                    {es ? "Abriendo puertas de la arena..." : "Opening arena gates..."}
                  </div>
                ) : notFound || !duel ? (
                  <div className="py-12 text-center flex flex-col items-center gap-4">
                    <span className="text-lg font-black text-[#ffb3b8]">
                      {es ? "Duelo no encontrado" : "Duel not found"}
                    </span>
                    <Link
                      to="/duel"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black text-xs uppercase tracking-wider shadow-lg"
                    >
                      {es ? "Crear un duelo nuevo" : "Create a new duel"}
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Top Match Info Pills */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      <span className="px-3.5 py-1 rounded-full bg-[#0e0b08]/90 backdrop-blur-md border border-[#d4af37]/40 text-xs font-mono font-black text-[#e6ca6a]">
                        #{duel.code}
                      </span>
                      <span className="px-4 py-1 rounded-full bg-gradient-to-r from-[#2c200b]/95 via-[#3d2d0f]/95 to-[#2c200b]/95 border border-[#ffd966]/70 text-xs sm:text-sm font-black text-[#fff4cc] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                        {es ? "Pozo del Campeón:" : "Champion Pot:"}{" "}
                        <span className="text-emerald-300 font-mono">
                          <Monetary value={duel.payout} showFraction={duel.payout % 1 !== 0} />
                        </span>
                      </span>
                      {duel.status === "open" && duel.expiresAt && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120e0a]/90 border border-[#3a2f1d] text-[11px] font-mono font-bold text-[#b9a77a]">
                          <FaClock className="text-[#d4af37] text-[10px]" />
                          {formatRemainingTime(duel.expiresAt, es)}
                        </span>
                      )}
                    </div>

                    {/* VS Gladiator Showdown Grid */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_240px_1fr] items-center gap-5 sm:gap-6">
                      {/* LEFT: Challenger / Creator Card */}
                      <motion.div
                        animate={
                          creatorWon && !spinning
                            ? { scale: [1, 1.03, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 1.6, repeat: creatorWon ? Infinity : 0 }}
                        className={`relative rounded-2xl p-5 border-2 text-center flex flex-col items-center gap-2.5 backdrop-blur-md transition-all overflow-hidden ${
                          creatorWon && !spinning
                            ? "bg-gradient-to-b from-[#33240b]/95 via-[#1c1407]/95 to-[#100c05]/95 border-[#ffe28a] shadow-[0_0_40px_rgba(255,215,0,0.45)]"
                            : opponentWon && !spinning
                            ? "bg-[#120d0a]/75 border-[#2e2418] opacity-55 grayscale-[45%]"
                            : "bg-gradient-to-b from-[#2b1014]/88 via-[#160b0c]/92 to-[#0d0808]/92 border-[#ef4444]/60 shadow-[0_14px_34px_rgba(0,0,0,0.75)]"
                        }`}
                      >
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ef4444] to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff949c]">
                          {es ? "Desafiante" : "Challenger"}
                        </span>

                        <div className="relative">
                          <Avatar
                            image={duel.creatorAvatar || ""}
                            loading={false}
                            id={duel.creatorId}
                            size="medium"
                            level={duel.creatorLevel || 0}
                          />
                          <img
                            src={duel.creatorSide === "heads" ? CARA_IMG : CRUZ_IMG}
                            alt={duel.creatorSide}
                            className="w-8 h-8 rounded-full ring-2 ring-[#ffe9a8] absolute -bottom-1 -right-2 shadow-lg"
                          />
                        </div>

                        <span className="text-base sm:text-lg font-black text-[#fff4dc] truncate max-w-full mt-1">
                          {duel.creatorUsername}
                        </span>

                        <div className="px-3 py-1 rounded-full bg-black/55 border border-[#d4af37]/35 text-[11px] uppercase tracking-wider text-[#ffe9a8] font-black font-mono">
                          {sideLabel(duel.creatorSide)} · <Monetary value={duel.betAmount} />
                        </div>

                        {creatorWon && !spinning && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/25 to-[#ffd966]/25 border border-[#ffe28a] text-[#fff3c4] text-xs font-black uppercase tracking-wider shadow-[0_0_16px_rgba(255,215,0,0.45)]">
                            <FaCrown className="text-[#ffd966]" />
                            {es ? "¡Campeón!" : "Champion!"}
                          </span>
                        )}
                      </motion.div>

                      {/* CENTER: 3D Coin Showdown Stage */}
                      <div
                        className="relative flex flex-col items-center justify-center py-4 min-h-[220px]"
                        style={{ perspective: "1200px" }}
                      >
                        {/* Rotating Sunburst Halo */}
                        <motion.div
                          animate={{
                            rotate: 360,
                            opacity: spinning ? 0.5 : duel.status === "completed" ? 0.38 : 0.16,
                          }}
                          transition={{
                            rotate: { duration: spinning ? 5 : 22, repeat: Infinity, ease: "linear" },
                          }}
                          className="absolute w-[250px] h-[250px] rounded-full pointer-events-none"
                          style={{
                            background:
                              "repeating-conic-gradient(from 0deg, rgba(255,215,70,0.45) 0deg 10deg, transparent 10deg 24deg)",
                            maskImage: "radial-gradient(circle, black 15%, transparent 68%)",
                            WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 68%)",
                          }}
                        />

                        {/* Impact Shockwave + Sparks when coin lands */}
                        <AnimatePresence>
                          {showBurstSeq > 0 && !spinning && (
                            <div
                              key={`duel-burst-${showBurstSeq}`}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                            >
                              <motion.span
                                initial={{ scale: 0.4, opacity: 0.95 }}
                                animate={{ scale: 2.1, opacity: 0 }}
                                transition={{ duration: 0.9, ease: "easeOut" }}
                                className="absolute w-36 h-36 rounded-full border-2 border-[#ffe28a] shadow-[0_0_24px_rgba(255,215,0,0.8)]"
                              />
                              {CLASH_SPARKS.map((sp) => (
                                <motion.span
                                  key={sp.id}
                                  initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                                  animate={{ x: sp.tx, y: sp.ty, scale: 0, opacity: 0 }}
                                  transition={{ duration: 0.72, ease: "easeOut" }}
                                  className="absolute w-1.5 h-1.5 rounded-full bg-[#ffe9a8] shadow-[0_0_8px_#ffd966]"
                                />
                              ))}
                            </div>
                          )}
                        </AnimatePresence>

                        <div className="relative z-10">
                          <Coin
                            fast
                            spinning={spinning}
                            result={
                              duel.resultSide === "heads"
                                ? 0
                                : duel.resultSide === "tails"
                                ? 1
                                : null
                            }
                          />
                        </div>

                        {duel.status === "open" && !spinning && (
                          <div className="mt-3 px-3.5 py-1 rounded-full bg-[#1a1309]/90 border border-[#d4af37]/50 text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd966] flex items-center gap-1.5">
                            <GiCrossedSwords />
                            <span>VS · 1v1</span>
                          </div>
                        )}

                        {duel.status === "completed" && duel.resultSide && !spinning && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-3 px-4 py-1 rounded-full bg-[#241b0c]/95 border-2 border-[#ffe28a] text-xs font-black uppercase tracking-[0.2em] text-[#fff4cc] shadow-[0_0_18px_rgba(255,215,0,0.5)]"
                          >
                            {es
                              ? `Salió ${sideLabel(duel.resultSide)}`
                              : `Landed on ${sideLabel(duel.resultSide)}`}
                          </motion.span>
                        )}
                      </div>

                      {/* RIGHT: Rival / Opponent Card */}
                      <motion.div
                        animate={
                          opponentWon && !spinning
                            ? { scale: [1, 1.03, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 1.6, repeat: opponentWon ? Infinity : 0 }}
                        className={`relative rounded-2xl p-5 border-2 text-center flex flex-col items-center gap-2.5 backdrop-blur-md transition-all overflow-hidden ${
                          opponentWon && !spinning
                            ? "bg-gradient-to-b from-[#33240b]/95 via-[#1c1407]/95 to-[#100c05]/95 border-[#ffe28a] shadow-[0_0_40px_rgba(255,215,0,0.45)]"
                            : creatorWon && !spinning
                            ? "bg-[#120d0a]/75 border-[#2e2418] opacity-55 grayscale-[45%]"
                            : "bg-gradient-to-b from-[#2b200b]/88 via-[#161108]/92 to-[#0d0a06]/92 border-[#ffd966]/55 shadow-[0_14px_34px_rgba(0,0,0,0.75)]"
                        }`}
                      >
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd966] to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffe9a8]">
                          {es ? "Rival" : "Opponent"}
                        </span>

                        {duel.opponentUsername ? (
                          <div className="relative">
                            <Avatar
                              image={duel.opponentAvatar || ""}
                              loading={false}
                              id={duel.opponentId || "opp"}
                              size="medium"
                              level={duel.opponentLevel || 0}
                            />
                            <img
                              src={duel.creatorSide === "heads" ? CRUZ_IMG : CARA_IMG}
                              alt="opponent side"
                              className="w-8 h-8 rounded-full ring-2 ring-[#ffe9a8] absolute -bottom-1 -right-2 shadow-lg"
                            />
                          </div>
                        ) : (
                          <div className="relative flex items-center justify-center w-16 h-16">
                            <span className="absolute inset-0 rounded-full border-2 border-[#ffd966]/45 animate-ping" />
                            <img
                              src={duel.creatorSide === "heads" ? CRUZ_IMG : CARA_IMG}
                              alt="open side"
                              className="w-14 h-14 rounded-full ring-2 ring-[#d4af37]/70 opacity-85"
                            />
                          </div>
                        )}

                        <span className="text-base sm:text-lg font-black text-[#fff4dc] truncate max-w-full mt-1">
                          {duel.opponentUsername || (es ? "Esperando rival..." : "Waiting for rival...")}
                        </span>

                        <div className="px-3 py-1 rounded-full bg-black/55 border border-[#d4af37]/35 text-[11px] uppercase tracking-wider text-[#ffe9a8] font-black font-mono">
                          {sideLabel(duel.creatorSide === "heads" ? "tails" : "heads")} ·{" "}
                          <Monetary value={duel.betAmount} />
                        </div>

                        {opponentWon && !spinning && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/25 to-[#ffd966]/25 border border-[#ffe28a] text-[#fff3c4] text-xs font-black uppercase tracking-wider shadow-[0_0_16px_rgba(255,215,0,0.45)]">
                            <FaCrown className="text-[#ffd966]" />
                            {es ? "¡Campeón!" : "Champion!"}
                          </span>
                        )}
                      </motion.div>
                    </div>

                    {/* Actions Area */}
                    {duel.status === "open" && (
                      <div className="w-full max-w-[560px] rounded-2xl bg-[#110d08]/88 backdrop-blur-md border border-[#d4af37]/35 p-4 sm:p-5 flex flex-col items-center gap-3">
                        {isCreator ? (
                          <>
                            <p className="text-xs sm:text-sm text-[#d8ccb2] text-center">
                              {es
                                ? "Compartí este duelo por WhatsApp. Apenas tu amigo acepte, la moneda gira en vivo para ambos."
                                : "Share this duel via WhatsApp. As soon as your friend accepts, the coin flips live for both!"}
                            </p>
                            <div className="w-full flex flex-col sm:flex-row gap-2.5">
                              <a
                                href={buildDuelWhatsAppUrl(duel)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] hover:brightness-110 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_24px_rgba(34,197,94,0.38)]"
                              >
                                <FaWhatsapp className="text-lg" />
                                <span>{es ? "Desafiar por WhatsApp" : "Challenge on WhatsApp"}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyDuelLink(duel)}
                                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#241c11] hover:bg-[#332716] border border-[#d4af37]/55 text-[#ffe9a8] font-bold text-xs sm:text-sm cursor-pointer"
                              >
                                {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                                <span>
                                  {copied
                                    ? es
                                      ? "Copiado"
                                      : "Copied"
                                    : es
                                    ? "Copiar Link"
                                    : "Copy Link"}
                                </span>
                              </button>
                            </div>
                            <button
                              type="button"
                              disabled={cancelling}
                              onClick={() => handleCancel(duel.code)}
                              className="mt-1 inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer disabled:opacity-50"
                            >
                              <FaTimes />
                              <span>
                                {es
                                  ? "Cancelar duelo y recuperar fichas"
                                  : "Cancel duel & refund stake"}
                              </span>
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex flex-col items-center gap-3">
                            <span className="text-xs uppercase tracking-[0.18em] text-[#ffe9a8] font-bold flex items-center gap-1.5">
                              <FaFire className="text-[#ff6b72]" />
                              {es
                                ? `¡${duel.creatorUsername} te desafía a la arena!`
                                : `${duel.creatorUsername} challenges you!`}
                            </span>
                            <div className="w-full max-w-[340px]">
                              <MainButton
                                text={
                                  isLogged ? (
                                    <span>
                                      {es ? "Aceptar Duelo por" : "Accept Duel for"}{" "}
                                      <Monetary value={duel.betAmount} />
                                    </span>
                                  ) : es ? (
                                    "Ingresar y Aceptar Duelo"
                                  ) : (
                                    "Sign In & Accept Duel"
                                  )
                                }
                                onClick={handleJoin}
                                type="success"
                                pulse
                                loading={joining}
                                disabled={joining}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {duel.status === "completed" && !spinning && (
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        {iWonCompleted && (
                          <ShareWinButton
                            gameName={es ? "Duelo 1v1 Crixus" : "Crixus 1v1 Duel"}
                            multiplier={PAYOUT_MULT}
                            payout={duel.payout}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setBet(duel.betAmount);
                            setSide(duel.creatorSide);
                            navigate("/duel");
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 cursor-pointer"
                        >
                          <FaRedo />
                          <span>{es ? "Revancha Misma Apuesta" : "Quick Rematch"}</span>
                        </button>
                      </div>
                    )}

                    {(duel.status === "cancelled" || duel.status === "expired") && (
                      <div className="px-4 py-2 rounded-full bg-[#2a0f12]/90 border border-red-500/45 text-xs uppercase tracking-widest text-red-300 font-bold">
                        {duel.status === "cancelled"
                          ? es
                            ? "Este duelo fue cancelado por su creador"
                            : "This duel was cancelled by its creator"
                          : es
                          ? "Este duelo expiró"
                          : "This duel has expired"}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* ============ CREATE / JOIN DUEL VIEW (/duel) ============ */
              <div className="relative z-10 p-4 sm:p-8 flex flex-col gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* Card 1: Pick Side + Live Preview */}
                  <div className="rounded-2xl bg-[#110d09]/90 backdrop-blur-md border border-[#d4af37]/35 p-5 flex flex-col gap-4 shadow-[0_18px_40px_rgba(0,0,0,0.75)]">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#ffe9a8] font-black">
                      {es ? "1. Elegí tu facción en la moneda" : "1. Choose your coin faction"}
                    </span>
                    <div className="grid grid-cols-2 gap-3.5 my-auto">
                      {(["heads", "tails"] as const).map((s) => {
                        const active = side === s;
                        const isHeads = s === "heads";
                        return (
                          <button
                            key={s}
                            type="button"
                            data-no-sfx
                            onClick={() => {
                              sound.play("chip");
                              setSide(s);
                            }}
                            className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              active
                                ? isHeads
                                  ? "bg-gradient-to-b from-[#3d1115] to-[#170809] border-[#ef4444] shadow-[0_0_28px_rgba(239,68,68,0.45)] scale-[1.03]"
                                  : "bg-gradient-to-b from-[#38290d] to-[#161006] border-[#ffd966] shadow-[0_0_28px_rgba(255,215,0,0.42)] scale-[1.03]"
                                : "bg-[#14100b]/85 border-[#342919] hover:border-[#d4af37]/60 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={isHeads ? CARA_IMG : CRUZ_IMG}
                              alt={s}
                              className="w-16 h-16 rounded-full drop-shadow-[0_8px_14px_rgba(0,0,0,0.85)]"
                            />
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-black uppercase tracking-wider text-white">
                                {sideLabel(s)}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-widest ${
                                  isHeads ? "text-[#ff949c]" : "text-[#ffe9a8]"
                                }`}
                              >
                                {isHeads
                                  ? es
                                    ? "Legión León"
                                    : "Lion Legion"
                                  : es
                                  ? "Guardia Yelmo"
                                  : "Helm Guard"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Direct Join by 6-Character Code */}
                    <form
                      onSubmit={handleJoinByCodeSubmit}
                      className="pt-3 border-t border-[#d4af37]/20 flex items-center gap-2"
                    >
                      <div className="flex-1 flex items-center gap-2 bg-[#090705] border border-[#3e3219] focus-within:border-[#d4af37] rounded-xl px-3 py-2">
                        <FaSearch className="text-[#9b8d6f] text-xs shrink-0" />
                        <input
                          type="text"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          maxLength={10}
                          placeholder={es ? "¿Tenés código? Ej: A7K9P2" : "Have a code? e.g. A7K9P2"}
                          className="w-full bg-transparent text-xs font-mono font-bold text-[#ffe9a8] placeholder-[#6f6450] outline-none uppercase"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={joinCodeInput.trim().length < 4}
                        className="px-3.5 py-2 rounded-xl bg-[#241c11] hover:bg-[#332716] border border-[#d4af37]/50 text-[#ffe9a8] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        <span>{es ? "Entrar" : "Join"}</span>
                        <FaArrowRight className="text-[10px]" />
                      </button>
                    </form>
                  </div>

                  {/* Card 2: Stake & Create CTA */}
                  <div className="rounded-2xl bg-[#110d09]/90 backdrop-blur-md border border-[#d4af37]/35 p-5 flex flex-col gap-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.75)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-[#ffe9a8] font-black flex items-center gap-1.5">
                        <FaCoins className="text-[#d4af37]" />
                        {es ? "2. Definí el pozo del duelo" : "2. Set the duel stake"}
                      </span>
                      <span className="text-xs font-mono text-emerald-300 font-black px-2.5 py-0.5 rounded-full bg-emerald-950/75 border border-emerald-500/40">
                        {es ? "Premio:" : "Pot:"}{" "}
                        <Monetary value={Math.floor((bet || 0) * PAYOUT_MULT)} />
                      </span>
                    </div>

                    <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#080705] focus-within:border-[#d4af37] focus-within:shadow-[0_0_16px_rgba(212,175,55,0.22)]">
                      <span className="pl-3.5 text-[#d4af37] font-black text-lg">$</span>
                      <input
                        type="number"
                        min={MIN_BET}
                        max={MAX_BET}
                        value={bet || ""}
                        onChange={(e) => {
                          const v = Math.floor(Number(e.target.value));
                          setBet(!Number.isFinite(v) || v < 0 ? 0 : Math.min(MAX_BET, v));
                        }}
                        className="w-full bg-transparent py-3 px-2.5 text-white font-mono font-black text-lg outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {QUICK_BETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          data-no-sfx
                          onClick={() => {
                            sound.play("chip");
                            setBet(amt);
                          }}
                          className={`py-1.5 rounded-lg border text-xs font-mono font-black cursor-pointer transition-all ${
                            bet === amt
                              ? "bg-gradient-to-b from-[#f0d472] to-[#a67e1c] text-[#1a1204] border-[#fff4cc]"
                              : "bg-[#1d170f] hover:bg-[#2b2113] border-[#3a2f1d] text-[#ffe9a8]"
                          }`}
                        >
                          ${amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#a59574] leading-relaxed">
                      {es
                        ? "Tus fichas quedan en custodia segura. Si nadie acepta en 24hs o cancelás, se devuelven 100% automáticamente."
                        : "Your stake is safely escrowed. If nobody joins within 24h or you cancel, 100% is refunded automatically."}
                    </p>

                    <div className="mt-auto pt-1">
                      <MainButton
                        text={
                          isLogged
                            ? es
                              ? "Crear Duelo y Generar Link"
                              : "Create Duel & Get Link"
                            : es
                            ? "Ingresar para Crear Duelo"
                            : "Sign In to Create Duel"
                        }
                        onClick={handleCreate}
                        type="success"
                        pulse
                        loading={creating}
                        disabled={creating}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent / Open Duels History */}
        {isLogged && myDuels.length > 0 && (
          <div className="w-full rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#1a140d] to-[#0f0c09] p-4 sm:p-5 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#ffd966] font-black mb-3 flex items-center gap-2">
              <GiCrossedSwords className="text-sm" />
              {es ? "Tus Duelos Recientes" : "Your Recent Duels"}
            </h2>
            <div className="divide-y divide-[#d4af37]/12">
              {myDuels.map((d) => (
                <div
                  key={d._id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Link
                      to={`/duel/${d.code}`}
                      className="font-mono font-black text-[#ffe9a8] hover:underline"
                    >
                      #{d.code}
                    </Link>
                    <span className="text-[#c8bba0] truncate">
                      {d.creatorUsername} vs {d.opponentUsername || "?"}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      <Monetary value={d.betAmount} />
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {d.status === "open" ? (
                      <>
                        <a
                          href={buildDuelWhatsAppUrl(d)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#16a34a] hover:brightness-110 text-white text-[11px] font-bold"
                        >
                          <FaWhatsapp />
                          <span>WhatsApp</span>
                        </a>
                        <Link
                          to={`/duel/${d.code}`}
                          className="px-2.5 py-1 rounded-full bg-[#241c11] border border-[#d4af37]/45 text-[#ffe9a8] text-[11px] font-bold"
                        >
                          {es ? "Ver" : "Open"}
                        </Link>
                      </>
                    ) : d.status === "completed" ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          userData?.id && String(d.winnerId) === String(userData.id)
                            ? "bg-emerald-500/15 border-emerald-500/45 text-emerald-300"
                            : "bg-red-950/45 border-red-500/35 text-red-300"
                        }`}
                      >
                        {es ? `Ganó ${d.winnerUsername}` : `${d.winnerUsername} won`}
                      </span>
                    ) : (
                      <span className="text-[11px] uppercase text-[#8a7f63] font-semibold">
                        {d.status === "cancelled"
                          ? es
                            ? "Cancelado"
                            : "Cancelled"
                          : es
                          ? "Expirado"
                          : "Expired"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuelPage;

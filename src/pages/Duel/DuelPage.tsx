import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  FaCheck,
  FaCoins,
  FaCopy,
  FaCrown,
  FaRedo,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import MainButton from "../../components/MainButton";
import ShareWinButton from "../../components/ShareWinButton";
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

const DuelPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { isLogged, userData, toogleUserFlow, toogleUserData } = useContext(UserContext);

  // Create form state
  const [bet, setBet] = useState<number>(100);
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [creating, setCreating] = useState(false);

  // Active room state
  const [duel, setDuel] = useState<DuelDoc | null>(null);
  const [loadingDuel, setLoadingDuel] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [copied, setCopied] = useState(false);

  // User's duel history
  const [myDuels, setMyDuels] = useState<DuelDoc[]>([]);

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

  // Listen for live duel resolution via Socket.io when creator is waiting
  useEffect(() => {
    if (!code) return;
    const socket = SocketConnection.getInstance();
    const onResolved = (resolved: DuelDoc) => {
      if (resolved && resolved.code === code.toUpperCase()) {
        setSpinning(true);
        sound.play("flip");
        setTimeout(() => {
          setSpinning(false);
          setDuel(resolved);
          if (userData?.id && String(resolved.winnerId) === String(userData.id)) {
            sound.play("win");
            coinRainEmitter.trigger(55);
          }
          loadMyDuels();
        }, 1400);
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
        : "https://crixusgames.com";
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
      sound.play("chip");
      if (typeof res.walletBalance === "number" && userData) {
        toogleUserData({ ...userData, walletBalance: res.walletBalance });
      }
      toast.success(
        es ? "¡Duelo creado! Mandá el link a un amigo por WhatsApp" : "Duel created! Share the link with a friend",
        { theme: "dark" }
      );
      navigate(`/duel/${res.duel.code}`);
    } catch (error: any) {
      toast.error(translateApiMessage(error, es ? "Error al crear el duelo" : "Could not create duel"), {
        theme: "dark",
      });
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
    setSpinning(true);
    sound.play("flip");
    try {
      const res = await joinDuel(duel.code);
      setTimeout(() => {
        setSpinning(false);
        setDuel(res.duel);
        if (typeof res.walletBalance === "number" && userData) {
          toogleUserData({ ...userData, walletBalance: res.walletBalance });
        }
        const iWon = userData?.id && String(res.duel.winnerId) === String(userData.id);
        if (iWon) {
          sound.play("win");
          coinRainEmitter.trigger(60);
          toast.success(
            es ? `¡Ganaste el duelo! +$${res.duel.payout}` : `You won the duel! +$${res.duel.payout}`,
            { theme: "dark" }
          );
        } else {
          sound.play("lose");
        }
        loadMyDuels();
      }, 1500);
    } catch (error: any) {
      setSpinning(false);
      toast.error(translateApiMessage(error, es ? "No se pudo aceptar el duelo" : "Could not join duel"), {
        theme: "dark",
      });
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
      toast.error(translateApiMessage(error, es ? "No se pudo cancelar" : "Could not cancel"), {
        theme: "dark",
      });
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

  const sideLabel = (s: "heads" | "tails") =>
    s === "heads" ? (es ? "Cara" : "Heads") : es ? "Cruz" : "Tails";

  const isCreator = Boolean(duel && userData?.id && String(duel.creatorId) === String(userData.id));
  const iWonCompleted = Boolean(
    duel && duel.status === "completed" && userData?.id && String(duel.winnerId) === String(userData.id)
  );

  return (
    <div className="w-full flex flex-col items-center px-3 sm:px-4 pb-12 -mt-2 z-10">
      <div className="w-full max-w-[960px] flex flex-col gap-6">
        {/* Main Colosseum 1v1 Duel Container */}
        <div className="w-full rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_14px_rgba(212,175,55,0.45)]">
                <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                  <GiCrossedSwords className="text-[#ffd966] text-base" />
                </div>
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text">
                  {es ? "Duelo 1v1 en la Arena" : "1v1 Arena Duel"}
                </h1>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#9b8d6f] font-semibold">
                  {es ? "Cara o Cruz Privado · Pozo 1.95x" : "Private Coin Flip · 1.95x Pot"}
                </span>
              </div>
            </div>

            {code && (
              <Link
                to="/duel"
                className="px-3.5 py-1.5 rounded-full bg-[#14100a] border border-[#d4af37]/40 hover:border-[#ffd966] text-xs font-bold text-[#ffe9a8] transition-colors"
              >
                {es ? "+ Nuevo Duelo" : "+ New Duel"}
              </Link>
            )}
          </div>

          {/* ============ ROOM VIEW (/duel/:code) ============ */}
          {code ? (
            <div className="p-5 sm:p-8 flex flex-col items-center gap-6">
              {loadingDuel ? (
                <div className="py-12 text-center text-sm text-[#b9a77a] uppercase tracking-widest">
                  {es ? "Cargando duelo..." : "Loading duel..."}
                </div>
              ) : notFound || !duel ? (
                <div className="py-10 text-center flex flex-col items-center gap-4">
                  <span className="text-lg font-black text-[#ffb3b8]">
                    {es ? "Duelo no encontrado" : "Duel not found"}
                  </span>
                  <Link
                    to="/duel"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black text-xs uppercase tracking-wider"
                  >
                    {es ? "Crear un duelo nuevo" : "Create a new duel"}
                  </Link>
                </div>
              ) : (
                <>
                  {/* Pot & Code Pill */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#120e09] border border-[#3a2f1d] text-xs font-mono font-bold text-[#b9a77a]">
                      #{duel.code}
                    </span>
                    <span className="px-4 py-1 rounded-full bg-[#241b0c] border border-[#ffd966]/60 text-xs sm:text-sm font-black text-[#fff2c2]">
                      {es ? "Pozo del Ganador:" : "Winner Pot:"}{" "}
                      <span className="text-emerald-400">
                        <Monetary value={duel.payout} showFraction={duel.payout % 1 !== 0} />
                      </span>
                    </span>
                  </div>

                  {/* VS Arena */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-5">
                    {/* Creator Card */}
                    <div
                      className={`rounded-2xl p-4 border text-center flex flex-col items-center gap-2 ${
                        duel.status === "completed" && String(duel.winnerId) === String(duel.creatorId)
                          ? "bg-gradient-to-b from-[#2c210b] to-[#140f07] border-[#ffd966] shadow-[0_0_25px_rgba(212,175,55,0.3)]"
                          : "bg-[#120e0a] border-[#2e2418]"
                      }`}
                    >
                      <img
                        src={duel.creatorSide === "heads" ? CARA_IMG : CRUZ_IMG}
                        alt={duel.creatorSide}
                        className="w-12 h-12 rounded-full ring-2 ring-[#d4af37]/60"
                      />
                      <span className="text-base font-black text-[#f5ead4] truncate max-w-full">
                        {duel.creatorUsername}
                      </span>
                      <span className="text-[11px] uppercase tracking-widest text-[#d4af37] font-bold">
                        {sideLabel(duel.creatorSide)} · <Monetary value={duel.betAmount} />
                      </span>
                      {duel.status === "completed" && String(duel.winnerId) === String(duel.creatorId) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[11px] font-black uppercase">
                          <FaCrown /> {es ? "Ganador" : "Winner"}
                        </span>
                      )}
                    </div>

                    {/* Center 3D Coin */}
                    <div className="flex flex-col items-center justify-center py-2">
                      <Coin
                        spinning={spinning}
                        result={
                          duel.resultSide === "heads"
                            ? 0
                            : duel.resultSide === "tails"
                              ? 1
                              : null
                        }
                      />
                      {duel.status === "completed" && duel.resultSide && !spinning && (
                        <span className="mt-3 px-3.5 py-1 rounded-full bg-[#241c0d] border border-[#ffd966]/50 text-xs font-black uppercase tracking-widest text-[#ffe9a8]">
                          {es ? `Salió ${sideLabel(duel.resultSide)}` : `Landed on ${sideLabel(duel.resultSide)}`}
                        </span>
                      )}
                    </div>

                    {/* Opponent Card */}
                    <div
                      className={`rounded-2xl p-4 border text-center flex flex-col items-center gap-2 ${
                        duel.status === "completed" && duel.opponentId && String(duel.winnerId) === String(duel.opponentId)
                          ? "bg-gradient-to-b from-[#2c210b] to-[#140f07] border-[#ffd966] shadow-[0_0_25px_rgba(212,175,55,0.3)]"
                          : "bg-[#120e0a] border-[#2e2418]"
                      }`}
                    >
                      <img
                        src={duel.creatorSide === "heads" ? CRUZ_IMG : CARA_IMG}
                        alt="opponent side"
                        className="w-12 h-12 rounded-full ring-2 ring-[#d4af37]/60"
                      />
                      <span className="text-base font-black text-[#f5ead4] truncate max-w-full">
                        {duel.opponentUsername || (es ? "Esperando rival..." : "Waiting for rival...")}
                      </span>
                      <span className="text-[11px] uppercase tracking-widest text-[#d4af37] font-bold">
                        {sideLabel(duel.creatorSide === "heads" ? "tails" : "heads")} ·{" "}
                        <Monetary value={duel.betAmount} />
                      </span>
                      {duel.status === "completed" && duel.opponentId && String(duel.winnerId) === String(duel.opponentId) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[11px] font-black uppercase">
                          <FaCrown /> {es ? "Ganador" : "Winner"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Area */}
                  {duel.status === "open" && (
                    <div className="w-full max-w-[540px] flex flex-col items-center gap-3 pt-2">
                      {isCreator ? (
                        <>
                          <p className="text-xs sm:text-sm text-[#c8bba0] text-center">
                            {es
                              ? "Mandá este link por WhatsApp. Cuando tu amigo acepte, la moneda gira en vivo y el ganador cobra el pozo."
                              : "Send this link via WhatsApp. As soon as your friend accepts, the coin flips live!"}
                          </p>
                          <div className="w-full flex flex-col sm:flex-row gap-2.5">
                            <a
                              href={buildDuelWhatsAppUrl(duel)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] hover:brightness-110 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                            >
                              <FaWhatsapp className="text-lg" />
                              <span>{es ? "Desafiar por WhatsApp" : "Challenge on WhatsApp"}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyDuelLink(duel)}
                              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#241c11] hover:bg-[#332716] border border-[#d4af37]/50 text-[#ffe9a8] font-bold text-xs sm:text-sm cursor-pointer"
                            >
                              {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                              <span>{copied ? (es ? "Copiado" : "Copied") : es ? "Copiar Link" : "Copy Link"}</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={() => handleCancel(duel.code)}
                            className="mt-1 inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <FaTimes />
                            <span>{es ? "Cancelar duelo y recuperar fichas" : "Cancel duel & refund stake"}</span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex flex-col items-center gap-3">
                          <div className="w-full max-w-[320px]">
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
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {iWonCompleted && (
                        <ShareWinButton
                          gameName={es ? "Duelo 1v1 Crixus" : "Crixus 1v1 Duel"}
                          multiplier={PAYOUT_MULT}
                          payout={duel.payout}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => navigate("/duel")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] font-black text-xs uppercase tracking-wider cursor-pointer"
                      >
                        <FaRedo />
                        <span>{es ? "Crear Revancha" : "Create Rematch"}</span>
                      </button>
                    </div>
                  )}

                  {(duel.status === "cancelled" || duel.status === "expired") && (
                    <div className="text-xs uppercase tracking-widest text-red-300 font-bold">
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
            /* ============ CREATE DUEL VIEW (/duel) ============ */
            <div className="p-5 sm:p-8 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Side Picker */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#b9a77a] font-bold">
                    {es ? "1. Elegí tu lado de la moneda" : "1. Pick your coin side"}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {(["heads", "tails"] as const).map((s) => {
                      const active = side === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            sound.play("chip");
                            setSide(s);
                          }}
                          className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            active
                              ? "bg-gradient-to-b from-[#2e220c] to-[#171108] border-[#ffd966] shadow-[0_0_22px_rgba(212,175,55,0.3)] scale-[1.02]"
                              : "bg-[#120e0a] border-[#2e2418] hover:border-[#d4af37]/50 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={s === "heads" ? CARA_IMG : CRUZ_IMG}
                            alt={s}
                            className="w-14 h-14 rounded-full"
                          />
                          <span className="text-sm font-black uppercase tracking-wider text-[#fff2c2]">
                            {sideLabel(s)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bet Picker */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5">
                      <FaCoins className="text-[#d4af37]" />
                      {es ? "2. Definí la apuesta" : "2. Set the stake"}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {es ? "Pozo:" : "Pot:"}{" "}
                      <Monetary value={Math.floor((bet || 0) * PAYOUT_MULT)} />
                    </span>
                  </div>

                  <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#090806] focus-within:border-[#d4af37]">
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
                        onClick={() => {
                          sound.play("chip");
                          setBet(amt);
                        }}
                        className="py-1.5 rounded-lg bg-[#1d170f] hover:bg-[#2b2113] border border-[#3a2f1d] text-xs font-mono font-bold text-[#ffe9a8] cursor-pointer"
                      >
                        ${amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>

                  <div className="mt-1">
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

        {/* Recent / Open Duels History */}
        {isLogged && myDuels.length > 0 && (
          <div className="w-full rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#1a140d] to-[#0f0c09] p-4 sm:p-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#d4af37] font-black mb-3">
              {es ? "Tus Duelos Recientes" : "Your Recent Duels"}
            </h2>
            <div className="divide-y divide-[#d4af37]/10">
              {myDuels.map((d) => (
                <div
                  key={d._id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Link
                      to={`/duel/${d.code}`}
                      className="font-mono font-bold text-[#ffe9a8] hover:underline"
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#16a34a] text-white text-[11px] font-bold"
                        >
                          <FaWhatsapp />
                          <span>WhatsApp</span>
                        </a>
                        <Link
                          to={`/duel/${d.code}`}
                          className="px-2.5 py-1 rounded-full bg-[#241c11] border border-[#d4af37]/40 text-[#ffe9a8] text-[11px] font-bold"
                        >
                          {es ? "Ver" : "Open"}
                        </Link>
                      </>
                    ) : d.status === "completed" ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          userData?.id && String(d.winnerId) === String(userData.id)
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-red-950/40 border-red-500/30 text-red-300"
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

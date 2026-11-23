import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  FaAnchor,
  FaCheck,
  FaCoins,
  FaCopy,
  FaCrown,
  FaFish,
  FaShieldAlt,
  FaUsers,
  FaWater,
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

interface SeaFish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  gold: boolean;
  caught: boolean;
  scatterVx: number;
  scatterVy: number;
  phase: number;
}

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const localRunStartRef = useRef<number | null>(null);
  const growthRef = useRef<number>(0.06);
  const phaseRef = useRef<Phase>("betting");
  const multRef = useRef<number>(1.0);
  const prevPhaseRef = useRef<Phase | null>(null);
  const lastTickSoundRef = useRef<number>(0);

  // Local 100ms ticker for betting countdown UI
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Subscribe to Socket.io live room events
  useEffect(() => {
    const onState = (next: BigBassState) => {
      if (!next) return;
      growthRef.current = next.growth || 0.06;

      if (next.phase === "running") {
        // Anchor local clock from server's authoritative elapsedMs to avoid clock-skew drift
        localRunStartRef.current = Date.now() - (next.elapsedMs || 0);
        if (prevPhaseRef.current === "betting") {
          sound.play("launch");
        }
      } else if (next.phase === "crashed") {
        localRunStartRef.current = null;
        multRef.current = next.multiplier;
        setLiveMultiplier(next.multiplier);
        if (prevPhaseRef.current === "running") {
          sound.play("explode");
        }
      } else {
        localRunStartRef.current = null;
        multRef.current = 1.0;
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
      coinRainEmitter.trigger(evt.multiplier >= 5 ? 60 : 28);
      const label =
        evt.type === "half"
          ? es
            ? "¡50% asegurado!"
            : "50% secured!"
          : es
          ? "¡Pesca cobrada!"
          : "Catch cashed out!";
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

  // 60 FPS animated Roman Fishing Galley + Underwater Golden Net Canvas!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let t = 0;

    // Seed underwater fish school
    const fishes: SeaFish[] = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * 900,
      y: 230 + Math.random() * 140,
      vx: -(0.7 + Math.random() * 1.4),
      vy: (Math.random() - 0.5) * 0.4,
      size: 10 + (i % 4) * 4.5,
      gold: i % 3 === 0,
      caught: false,
      scatterVx: (Math.random() - 0.5) * 9,
      scatterVy: (Math.random() - 0.5) * 7,
      phase: Math.random() * Math.PI * 2,
    }));

    const bubbles = Array.from({ length: 24 }, () => ({
      x: Math.random() * 900,
      y: 205 + Math.random() * 185,
      r: 1.5 + Math.random() * 3.5,
      speed: 0.4 + Math.random() * 0.9,
    }));

    const drawFish = (
      x: number,
      y: number,
      size: number,
      gold: boolean,
      flipX: boolean,
      wiggle: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      if (flipX) ctx.scale(-1, 1);
      ctx.rotate(Math.sin(wiggle) * 0.14);

      // Tail
      ctx.beginPath();
      ctx.moveTo(size * 0.85, 0);
      ctx.lineTo(size * 1.45, -size * 0.45);
      ctx.lineTo(size * 1.45, size * 0.45);
      ctx.closePath();
      ctx.fillStyle = gold ? "#f59e0b" : "#0d9488";
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.48, 0, 0, Math.PI * 2);
      const grad = ctx.createLinearGradient(-size, -size * 0.4, size, size * 0.4);
      if (gold) {
        grad.addColorStop(0, "#fff5c8");
        grad.addColorStop(0.5, "#f59e0b");
        grad.addColorStop(1, "#b45309");
      } else {
        grad.addColorStop(0, "#6ee7b7");
        grad.addColorStop(0.55, "#10b981");
        grad.addColorStop(1, "#065f46");
      }
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = gold ? "#fef3c7" : "#a7f3d0";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Eye
      ctx.beginPath();
      ctx.arc(-size * 0.48, -size * 0.08, Math.max(1.5, size * 0.13), 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      t += 0.032;
      const w = canvas.width;
      const h = canvas.height;
      const currentPhase = phaseRef.current;

      // Update smooth multiplier
      if (currentPhase === "running" && localRunStartRef.current) {
        const elapsedSec = Math.max(0, (Date.now() - localRunStartRef.current) / 1000);
        const m = Math.max(1.0, Math.exp(elapsedSec * growthRef.current));
        multRef.current = m;
        setLiveMultiplier(Math.floor(m * 100) / 100);

        // Subtle rising tick sound every 650ms
        const now = performance.now();
        if (now - lastTickSoundRef.current > 650) {
          lastTickSoundRef.current = now;
          sound.play("tick", m);
        }
      }

      const mult = multRef.current;
      const speedMult = currentPhase === "running" ? Math.min(3.4, 1 + (mult - 1) * 0.35) : 0.45;
      const waterY = h * 0.52;

      // 1. Twilight Mediterranean Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, waterY);
      if (currentPhase === "crashed") {
        skyGrad.addColorStop(0, "#1c090e");
        skyGrad.addColorStop(1, "#351118");
      } else {
        skyGrad.addColorStop(0, "#061120");
        skyGrad.addColorStop(0.55, "#0d253d");
        skyGrad.addColorStop(1, "#183a52");
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, waterY);

      // Golden Moon & Halo
      const moonX = w * 0.78;
      const moonY = h * 0.19;
      const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 120);
      halo.addColorStop(0, "rgba(255, 233, 168, 0.48)");
      halo.addColorStop(1, "rgba(212, 175, 55, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Distant Roman Colosseum Silhouette scrolling gently
      const archScroll = (t * 14 * speedMult) % 140;
      ctx.fillStyle = "rgba(8, 22, 38, 0.75)";
      for (let ax = -archScroll - 140; ax < w + 140; ax += 140) {
        ctx.fillRect(ax, waterY - 36, 118, 36);
        ctx.fillStyle = currentPhase === "crashed" ? "#2a0e14" : "#112e47";
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(ax + 24 + k * 34, waterY - 12, 10, Math.PI, 0);
          ctx.lineTo(ax + 34 + k * 34, waterY);
          ctx.lineTo(ax + 14 + k * 34, waterY);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "rgba(8, 22, 38, 0.75)";
      }

      // 2. Deep Sea Gradient
      const seaGrad = ctx.createLinearGradient(0, waterY, 0, h);
      seaGrad.addColorStop(0, "#0e4d6f");
      seaGrad.addColorStop(0.45, "#072e47");
      seaGrad.addColorStop(1, "#031524");
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, waterY, w, h - waterY);

      // Underwater Sun/Moon Light Shafts
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = "#ffe9a8";
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 220 + t * 18) % (w + 180)) - 90;
        ctx.beginPath();
        ctx.moveTo(bx, waterY);
        ctx.lineTo(bx + 55, waterY);
        ctx.lineTo(bx - 35, h);
        ctx.lineTo(bx - 95, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Boat & Net anchor positions
      const boatX = w * 0.56 + Math.sin(t * 1.1) * 8;
      const boatY = waterY + Math.sin(t * 2.4) * 4.5 - 4;
      const netX = boatX - 155;
      const netY = waterY + 92 + Math.sin(t * 2.1 + 1) * 6;
      const caughtTarget =
        currentPhase === "running"
          ? Math.min(fishes.length, Math.max(2, Math.floor(2 + Math.log2(mult) * 4.5)))
          : 0;

      // 3. Underwater Golden Trawling Net
      if (currentPhase !== "crashed") {
        // Golden Tow Cable from boat stern to net
        ctx.save();
        ctx.strokeStyle = "#ffd966";
        ctx.lineWidth = 2.6;
        ctx.setLineDash([7, 4]);
        ctx.beginPath();
        ctx.moveTo(boatX - 66, boatY - 8);
        ctx.quadraticCurveTo(boatX - 110, waterY + 55, netX + 52, netY - 22);
        ctx.stroke();
        ctx.setLineDash([]);

        // Net Volumetric Gold Glow (grows with multiplier!)
        const netRadius = 56 + Math.min(28, (mult - 1) * 4.5);
        const netGlow = ctx.createRadialGradient(netX, netY, 12, netX, netY, netRadius * 1.45);
        netGlow.addColorStop(
          0,
          mult >= 5 ? "rgba(255, 217, 102, 0.42)" : "rgba(52, 211, 153, 0.28)"
        );
        netGlow.addColorStop(1, "rgba(212, 175, 55, 0)");
        ctx.fillStyle = netGlow;
        ctx.beginPath();
        ctx.arc(netX, netY, netRadius * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // Net Sack Shape
        ctx.beginPath();
        ctx.ellipse(netX, netY, netRadius * 1.15, netRadius * 0.68, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(212, 175, 55, 0.16)";
        ctx.fill();
        ctx.strokeStyle = mult >= 5 ? "#ffe9a8" : "#d4af37";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Net Diamond Mesh Lines
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = "rgba(255, 233, 168, 0.35)";
        ctx.lineWidth = 1;
        for (let mx = netX - 100; mx < netX + 100; mx += 18) {
          ctx.beginPath();
          ctx.moveTo(mx, netY - 70);
          ctx.lineTo(mx + 45, netY + 70);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(mx + 45, netY - 70);
          ctx.lineTo(mx, netY + 70);
          ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
      } else {
        // Snapped rope flying back!
        ctx.save();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(boatX - 66, boatY - 8);
        ctx.lineTo(boatX - 102, boatY + 24 + Math.sin(t * 8) * 6);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Animated Underwater Fish (Swimming & Caught inside Net!)
      fishes.forEach((f, idx) => {
        if (currentPhase === "running" && idx < caughtTarget) {
          f.caught = true;
          const targetX = netX + Math.cos(f.phase + t * 2) * 38;
          const targetY = netY + Math.sin(f.phase * 1.3 + t * 2.4) * 22;
          f.x += (targetX - f.x) * 0.08;
          f.y += (targetY - f.y) * 0.08;
        } else if (currentPhase === "crashed" && f.caught) {
          f.x += f.scatterVx;
          f.y += f.scatterVy;
        } else {
          f.caught = false;
          f.x += f.vx * speedMult;
          f.y += Math.sin(t * 1.6 + f.phase) * 0.45;
          if (f.x < -30) {
            f.x = w + 30;
            f.y = waterY + 30 + Math.random() * (h - waterY - 55);
          }
          if (f.x > w + 40) f.x = -25;
        }
        drawFish(f.x, f.y, f.size, f.gold, f.vx > 0 && currentPhase === "crashed", t * 6 + f.phase);
      });

      // Rising underwater bubbles
      ctx.fillStyle = "rgba(186, 230, 253, 0.35)";
      for (const b of bubbles) {
        b.y -= b.speed * (currentPhase === "running" ? 1.5 : 0.7);
        b.x -= 0.4 * speedMult;
        if (b.y < waterY + 6) {
          b.y = h - 8;
          b.x = Math.random() * w;
        }
        if (b.x < 0) b.x = w;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Imperial Roman Fishing Galley Boat
      ctx.save();
      ctx.translate(boatX, boatY);
      ctx.rotate(Math.sin(t * 2.2) * 0.045);

      // Mast & Crimson-Gold Sail
      ctx.fillStyle = "#5c3518";
      ctx.fillRect(-6, -78, 7, 74);
      ctx.beginPath();
      ctx.moveTo(0, -74);
      ctx.quadraticCurveTo(44, -52, 34, -14);
      ctx.quadraticCurveTo(8, -20, 0, -18);
      ctx.closePath();
      ctx.fillStyle = "#991b1b";
      ctx.fill();
      ctx.strokeStyle = "#ffd966";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gladiator Angler silhouette on deck
      ctx.fillStyle = "#d4af37";
      ctx.beginPath();
      ctx.arc(-34, -22, 8, 0, Math.PI * 2); // golden helmet
      ctx.fill();
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(-40, -14, 12, 16); // crimson tunic

      // Wooden Imperial Hull
      ctx.beginPath();
      ctx.moveTo(-76, -2);
      ctx.lineTo(74, -4);
      ctx.quadraticCurveTo(86, -12, 94, -20);
      ctx.quadraticCurveTo(84, 18, 56, 22);
      ctx.lineTo(-56, 22);
      ctx.quadraticCurveTo(-72, 14, -76, -2);
      ctx.closePath();
      const hullGrad = ctx.createLinearGradient(0, -12, 0, 22);
      hullGrad.addColorStop(0, "#6b3e1b");
      hullGrad.addColorStop(1, "#2a1407");
      ctx.fillStyle = hullGrad;
      ctx.fill();
      ctx.strokeStyle = "#e5bc48";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Gold trim stripe
      ctx.strokeStyle = "#ffe9a8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-64, 7);
      ctx.lineTo(66, 7);
      ctx.stroke();
      ctx.restore();

      // 6. Rolling Foreground Wave Crest
      ctx.beginPath();
      ctx.moveTo(0, waterY + 6);
      for (let x = 0; x <= w; x += 24) {
        const y = waterY + 6 + Math.sin(x * 0.025 + t * 3.2 * speedMult) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, waterY + 26);
      ctx.lineTo(0, waterY + 26);
      ctx.closePath();
      ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
      ctx.fill();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

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

  // Spacebar quick full cashout during live cruise
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

  const halfPreviewPayout = myPlayer
    ? Math.floor((myPlayer.bet / 2) * liveMultiplier * 100) / 100
    : 0;
  const fullPreviewPayout = myPlayer
    ? Math.floor(myPlayer.remainingBet * liveMultiplier * 100) / 100
    : 0;

  const copyValue = (key: string, val: string) => {
    navigator.clipboard?.writeText(val).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2">
      <div className="w-full max-w-[1220px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#131d27] via-[#0e151d] to-[#0a0f14] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)]">
        {/* Imperial Sea Marquee Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-[#0e2030] via-[#172e40] to-[#0e2030] border-b border-[#d4af37]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_14px_rgba(212,175,55,0.45)]">
              <div className="w-full h-full rounded-full bg-[#091c2b] flex items-center justify-center">
                <FaFish className="text-[#ffd966] text-sm" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text">
                  Big Bass Crash
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {es ? "En Vivo · Retiro 50%" : "Live · 50% Cashout"}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#8eb3cc] font-semibold">
                {es
                  ? "Pesca Imperial Multijugador · Asegurá el 50% y seguí pescando · Provably Fair"
                  : "Multiplayer Imperial Fishing · Secure 50% and keep fishing · Provably Fair"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0a1824] border border-[#d4af37]/35 text-[11px] font-bold text-[#ffe9a8]">
              <FaUsers className="text-[#d4af37] text-xs" />
              <span className="font-mono">{players.length}</span>
              <span className="hidden sm:inline text-[#8eb3cc]">
                {es ? "pescando" : "fishing"}
              </span>
            </span>
          </div>
        </div>

        {/* History Strip */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#09131c] border-b border-[#1c3244] overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#7c9eb5] mr-1">
              {es ? "Últimas:" : "History:"}
            </span>
            {history.map((cp, idx) => (
              <span
                key={`${idx}-${cp}`}
                className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${
                  cp >= 10
                    ? "bg-[#2e2208] border-[#ffd966] text-[#ffe9a8]"
                    : cp >= 2
                    ? "bg-emerald-950/75 border-emerald-500/45 text-emerald-300"
                    : "bg-red-950/75 border-red-500/45 text-red-300"
                }`}
              >
                {cp.toFixed(2)}x
              </span>
            ))}
          </div>
        )}

        {/* Arena Grid */}
        <div className="flex flex-col-reverse lg:flex-row">
          {/* LEFT: Controls Panel */}
          <div className="lg:w-[350px] shrink-0 flex flex-col gap-4 p-4 sm:p-5 border-t lg:border-t-0 lg:border-r border-[#d4af37]/20 bg-[#0d161f]/90">
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
                  <span className="text-[11px] font-mono text-[#8eb3cc]">
                    {t("games.balance")}:{" "}
                    <strong className="text-[#ffe9a8]">
                      <Monetary value={Math.floor(userBalance)} />
                    </strong>
                  </span>
                )}
              </div>

              <div className="flex items-center rounded-xl border-2 border-[#274156] bg-[#071018] focus-within:border-[#d4af37] transition-all">
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
                    className="py-1.5 rounded-lg text-xs font-black font-mono border border-[#243d52] bg-[#10202e] text-[#dbeafe] hover:border-[#d4af37]/70 hover:text-[#ffe9a8] disabled:opacity-40 cursor-pointer"
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
                  {es ? "Auto 50% (x)" : "Auto 50% (x)"}
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
                  className="w-full h-10 px-3 rounded-xl bg-[#071018] border border-[#274156] focus:border-[#d4af37] text-xs font-mono font-bold text-[#ffe9a8] placeholder-[#4a657a] outline-none disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {es ? "Auto 100% (x)" : "Auto 100% (x)"}
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
                  className="w-full h-10 px-3 rounded-xl bg-[#071018] border border-[#274156] focus:border-emerald-400 text-xs font-mono font-bold text-emerald-300 placeholder-[#4a657a] outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Signature Dual Cashout / Bet Controls */}
            <div className="flex flex-col gap-2.5 mt-auto pt-2 border-t border-[#1c3244]">
              {phase === "running" && myPlayer && !myPlayer.fullCashedOut ? (
                <>
                  {/* 50% Partial Cashout Button (Signature Big Bass Crash feature!) */}
                  <button
                    type="button"
                    disabled={!canCashout50}
                    onClick={handleCashout50}
                    className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      canCashout50
                        ? "bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] text-[#1a1204] border-[#fff2c2]/80 shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:brightness-110 active:scale-[0.98]"
                        : "bg-[#121e29] text-[#607b90] border-[#1f3447] cursor-not-allowed"
                    }`}
                  >
                    <FaAnchor className="text-sm" />
                    <span>
                      {myPlayer.halfCashedOut
                        ? `${es ? "✓ 50% asegurado" : "✓ 50% locked"} (${myPlayer.halfMultiplier?.toFixed(2)}x)`
                        : `${es ? "Cobrar 50%" : "Cash out 50%"} · $${halfPreviewPayout.toFixed(2)}`}
                    </span>
                  </button>

                  {/* Full / Remaining Cashout Button */}
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
                  <p className="text-[10px] text-center text-[#7c9eb5]">
                    {es ? "Barra espaciadora = Cobrar 100% al instante" : "Spacebar = Instant full cashout"}
                  </p>
                </>
              ) : myPlayer && myPlayer.fullCashedOut ? (
                <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/50 p-3 flex flex-col items-center gap-2 text-center">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    🎣 {es ? "¡Gran pesca asegurada!" : "Catch secured!"}
                  </span>
                  <span className="font-mono font-black text-lg text-emerald-200">
                    +<Monetary value={myPlayer.totalPayout} showFraction />
                  </span>
                  {myPlayer.totalPayout > myPlayer.bet && (
                    <ShareWinButton
                      gameName="Big Bass Crash"
                      multiplier={myPlayer.fullMultiplier || myPlayer.halfMultiplier || 1}
                      payout={myPlayer.totalPayout}
                      compact
                    />
                  )}
                </div>
              ) : myPlayer && phase === "betting" ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-[#102536] border border-[#d4af37]/60 text-center text-xs font-black uppercase tracking-wider text-[#ffe9a8]">
                  ⚓ {es ? `¡Subiste al barco! ($${myPlayer.bet}) · Zarpando en ${timeLeftSec}s` : `On board! ($${myPlayer.bet}) · Sailing in ${timeLeftSec}s`}
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
                    : `${es ? "Lanzar Red" : "Cast Net"} · $${cleanBet.toLocaleString("en-US")}`}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Live Mediterranean Boat & Golden Net Canvas */}
          <div className="flex-1 flex flex-col gap-3 p-3.5 sm:p-5 min-w-0 bg-[#08121b]">
            <div className="relative w-full h-[330px] sm:h-[385px] rounded-2xl overflow-hidden border-2 border-[#25455e] bg-[#061120] shadow-[inset_0_0_45px_rgba(0,0,0,0.85)]">
              <canvas
                ref={canvasRef}
                width={860}
                height={385}
                className="w-full h-full object-cover block"
              />

              {/* Central Multiplier / Phase Overlay */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-start pt-5 sm:pt-7 px-4 text-center">
                {phase === "betting" ? (
                  <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-[#071320]/80 backdrop-blur-md border border-[#d4af37]/45 shadow-xl">
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffe9a8] flex items-center gap-1.5">
                      <FaWater className="text-sky-400" />
                      {es ? "El barco zarpa en" : "Boat sails in"}
                    </span>
                    <span className="font-mono font-black text-3xl sm:text-4xl text-white">
                      {timeLeftSec}s
                    </span>
                    <div className="w-44 h-1.5 rounded-full bg-[#132a3e] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#b8901f] to-[#ffe9a8] transition-all duration-100"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <motion.div
                    animate={phase === "crashed" ? { scale: [1.15, 1] } : { scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <span
                      className={`font-mono font-black tracking-tight drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)] ${
                        phase === "crashed"
                          ? "text-red-400"
                          : liveMultiplier >= 5
                          ? "text-[#ffe9a8]"
                          : "text-emerald-300"
                      }`}
                      style={{ fontSize: "clamp(2.5rem, 6vw, 4.25rem)", lineHeight: 1 }}
                    >
                      {liveMultiplier.toFixed(2)}x
                    </span>
                    {phase === "crashed" ? (
                      <span className="mt-2 px-4 py-1 rounded-full bg-red-950/90 border border-red-400/70 text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-red-200 shadow-lg">
                        💥 {es ? "¡SE ROMPIÓ LA RED!" : "THE NET SNAPPED!"}
                      </span>
                    ) : (
                      <span className="mt-1 px-3 py-0.5 rounded-full bg-black/50 border border-[#d4af37]/40 text-[11px] font-bold uppercase tracking-widest text-[#ffe9a8]">
                        🐟 {es ? "La red se está llenando..." : "Reeling in the catch..."}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Provably Fair Strip */}
            {state?.hash && (
              <div className="rounded-xl bg-[#0a1520] border border-[#1d3448] px-3.5 py-2 flex flex-col gap-1 text-[11px] text-[#7c9eb5]">
                <div className="flex items-center justify-between gap-2 font-mono">
                  <span className="truncate flex items-center gap-1.5">
                    <FaShieldAlt className="text-[#d4af37] shrink-0" />
                    <span className="text-[#9bb8cc]">Hash #{state.roundId}:</span> {state.hash}
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
                  <div className="flex items-center justify-between gap-2 font-mono text-[#ffe9a8]">
                    <span className="truncate">
                      <span className="text-[#9bb8cc]">Seed ({state.reveal.crashPoint.toFixed(2)}x): </span>
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

        {/* Live Multiplayer Anglers Roster */}
        <div className="border-t border-[#d4af37]/25 bg-[#0a131b] px-4 sm:px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FaCrown className="text-[#d4af37]" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-[#ffe9a8]">
                {es ? "Tripulación en esta ronda" : "Crew on this voyage"}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#112434] border border-[#d4af37]/30 text-[10px] font-mono font-bold text-[#ffd966]">
                {players.length}
              </span>
            </div>
            <span className="text-xs font-mono text-[#8eb3cc]">
              {es ? "Pozo total:" : "Total pot:"}{" "}
              <strong className="text-[#ffe9a8]">
                <Monetary value={totalPot} />
              </strong>
            </span>
          </div>

          {sortedPlayers.length === 0 ? (
            <div className="py-5 text-center text-xs text-[#7393aa] font-semibold">
              {es
                ? "Todavía no hay pescadores a bordo. ¡Lanzá tu red para la próxima salida!"
                : "No anglers on board yet. Cast your net for the next voyage!"}
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
                        ? "bg-[#26200b]/60 border-[#ffd966]/50"
                        : lostAll
                        ? "bg-red-950/30 border-red-500/35 opacity-75"
                        : isMe
                        ? "bg-[#122a3d] border-[#ffd966]/70"
                        : "bg-[#0e1b26] border-[#1f364a]"
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
                        <span className="text-[11px] font-mono text-[#7c9eb5]">
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
                            +<Monetary value={p.halfPayout} /> {phase === "crashed" ? "· 💥" : "· 🎣"}
                          </span>
                        </div>
                      ) : lostAll ? (
                        <span className="text-[11px] font-black uppercase text-red-400">
                          💥 {es ? "Sin pesca" : "Lost"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#132b3e] border border-[#d4af37]/35 text-[#ffe9a8]">
                          {phase === "running"
                            ? es
                              ? "Pescando"
                              : "Fishing"
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

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCheck,
  FaCheckCircle,
  FaCoins,
  FaCopy,
  FaCrown,
  FaDice,
  FaFire,
  FaShieldAlt,
} from "react-icons/fa";
import { GiDiamondHard, GiMineExplosion } from "react-icons/gi";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import ShareWinButton from "../../components/ShareWinButton";
import {
  minesActive,
  minesCashout,
  minesReveal,
  minesStart,
} from "../../services/games/GamesServices";
import sound from "../../services/sound";
import { translateApiMessage } from "../../services/apiMessageI18n";
import { coinRainEmitter } from "../../components/CoinRain";
import MineTile, { TileState } from "./MineTile";
import {
  GRID_SIZE,
  MAX_BET,
  MINES_ASSETS,
  MINES_PRESETS,
  MIN_BET,
  buildMultiplierLadder,
  multiplierFor,
  rippleDelayFromTile,
  verifyMinesFairness,
} from "./minesUtils";

interface ActiveGame {
  gameId: string;
  bet: number;
  minesCount: number;
  revealed: number[];
  hash: string;
  currentMultiplier: number;
  nextMultiplier: number;
  potentialPayout: number;
}

interface RoundHistoryItem {
  id: number;
  type: "cashout" | "boom";
  multiplier: number;
  payout: number;
  minesCount: number;
}

const HYPOGEUM_EMBERS = [
  { id: 0, left: "8%", delay: 0.0, dur: 4.5, emerald: false },
  { id: 1, left: "14%", delay: 1.4, dur: 3.9, emerald: true },
  { id: 2, left: "21%", delay: 0.7, dur: 4.9, emerald: false },
  { id: 3, left: "79%", delay: 0.3, dur: 4.3, emerald: false },
  { id: 4, left: "86%", delay: 1.9, dur: 4.0, emerald: true },
  { id: 5, left: "92%", delay: 1.1, dur: 4.7, emerald: false },
];

const Mines = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { isLogged, toogleUserFlow, userData } = useContext(UserContext);

  const [bet, setBet] = useState<number>(100);
  const [minesCount, setMinesCount] = useState<number>(5);
  const [game, setGame] = useState<ActiveGame | null>(null);
  const [tiles, setTiles] = useState<TileState[]>(Array(GRID_SIZE).fill("hidden"));
  const [loading, setLoading] = useState<boolean>(false);
  const [revealing, setRevealing] = useState<number | null>(null);
  const [targetedTile, setTargetedTile] = useState<number | null>(null);
  const [roundOver, setRoundOver] = useState<boolean>(false);
  const [blastEpicenter, setBlastEpicenter] = useState<number | null>(null);
  const [boomShakeSeq, setBoomShakeSeq] = useState<number>(0);

  // Per-tile floating multiplier pop-up when a safe gem is uncovered
  const [tilePopMult, setTilePopMult] = useState<Record<number, number>>({});

  // Smooth rolling potential payout display
  const [displayPayout, setDisplayPayout] = useState<number>(100);
  const payoutRafRef = useRef<number>(0);
  const displayedPayoutRef = useRef<number>(100);

  // Provably Fair state + live cryptographic SHA-256 verification
  const [lastSeed, setLastSeed] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [lastMines, setLastMines] = useState<number[] | null>(null);
  const [fairnessVerified, setFairnessVerified] = useState<"idle" | "valid" | "invalid">("idle");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Victory / loss banner + session history
  const [lastResult, setLastResult] = useState<{
    type: "boom" | "cashout";
    payout?: number;
    multiplier?: number;
    perfectClear?: boolean;
    bet?: number;
  } | null>(null);
  const [showVictoryCard, setShowVictoryCard] = useState<boolean>(false);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);

  const ladderStepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Resume an active round after a refresh (the stake lives in the DB)
  useEffect(() => {
    if (!isLogged) return;
    minesActive()
      .then((res) => {
        if (res.game) {
          applyGameState(res.game);
          setBet(res.game.bet);
          setMinesCount(res.game.minesCount);
          toast.info(t("mines.resume"), { theme: "dark" });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogged]);

  // Smooth rolling currency counter for potential payout
  const animatePayoutTo = useCallback((target: number) => {
    cancelAnimationFrame(payoutRafRef.current);
    const from = displayedPayoutRef.current;
    if (Math.abs(target - from) < 0.01) {
      displayedPayoutRef.current = target;
      setDisplayPayout(target);
      return;
    }
    const start = performance.now();
    const dur = 380;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      displayedPayoutRef.current = val;
      setDisplayPayout(val);
      if (p < 1) {
        payoutRafRef.current = requestAnimationFrame(step);
      } else {
        displayedPayoutRef.current = target;
        setDisplayPayout(target);
      }
    };
    payoutRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(payoutRafRef.current), []);

  const applyGameState = (g: ActiveGame) => {
    setGame(g);
    setLastHash(g.hash);
    setRoundOver(false);
    setLastResult(null);
    setShowVictoryCard(false);
    setLastSeed(null);
    setLastMines(null);
    setFairnessVerified("idle");
    setBlastEpicenter(null);
    setTilePopMult({});
    const newTiles: TileState[] = Array(GRID_SIZE).fill("hidden");
    g.revealed.forEach((i) => (newTiles[i] = "gem"));
    setTiles(newTiles);
    displayedPayoutRef.current = g.potentialPayout;
    setDisplayPayout(g.potentialPayout);
  };

  /** Reveal all mines AND peek dimmed unrevealed safe gems across the board on round end */
  const revealFullBoard = (mines: number[], hitIndex: number | null) => {
    const mineSet = new Set(mines);
    setBlastEpicenter(hitIndex);
    setTiles((prev) =>
      prev.map((curr, idx) => {
        if (mineSet.has(idx)) {
          return idx === hitIndex ? "mineHit" : "mine";
        }
        return curr === "gem" ? "gem" : "unrevealedGem";
      })
    );
  };

  const inRound = game !== null && !roundOver;
  const activeMines = game ? game.minesCount : minesCount;
  const totalGems = GRID_SIZE - activeMines;
  const revealedCount = game ? game.revealed.length : tiles.filter((x) => x === "gem").length;
  const gemsLeft = Math.max(0, totalGems - revealedCount);
  const tilesLeft = GRID_SIZE - revealedCount;
  const nextSafePct = tilesLeft > 0 ? Math.round((gemsLeft / tilesLeft) * 100) : 0;

  const ladder = useMemo(() => buildMultiplierLadder(activeMines), [activeMines]);

  // Auto-center the multiplier step ladder onto the active next target step
  useEffect(() => {
    const targetStep = Math.min(totalGems, revealedCount + 1);
    const el = ladderStepRefs.current[targetStep];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [revealedCount, activeMines, totalGems]);

  // Keep idle payout display synced with chosen bet
  useEffect(() => {
    if (!inRound) {
      const clean = Math.max(0, Math.floor(Number(bet) || 0));
      displayedPayoutRef.current = clean;
      setDisplayPayout(clean);
    }
  }, [bet, inRound]);

  const handleStart = useCallback(async () => {
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }
    const cleanBet = Math.floor(Number(bet));
    if (!Number.isFinite(cleanBet) || cleanBet < MIN_BET || cleanBet > MAX_BET) return;

    setLoading(true);
    try {
      const res = await minesStart(cleanBet, minesCount);
      sound.play("chip");
      applyGameState(res.game);
    } catch (error: any) {
      toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
    } finally {
      setLoading(false);
    }
  }, [bet, isLogged, minesCount, t, toogleUserFlow]);

  const handleReveal = useCallback(
    async (index: number) => {
      if (!game || roundOver || tiles[index] !== "hidden" || revealing !== null) return;
      setRevealing(index);
      sound.play("stoneFlip");
      try {
        const res = await minesReveal(index);
        if (res.result === "boom") {
          sound.play("boom");
          setBoomShakeSeq((s) => s + 1);
          revealFullBoard(res.mines, res.tileIndex);
          setRoundOver(true);
          setLastSeed(res.serverSeed);
          setLastMines(res.mines);
          setFairnessVerified("idle");
          setLastResult({ type: "boom", bet: game.bet });
          setShowVictoryCard(false);
          setRoundHistory((prev) => [
            {
              id: Date.now() + Math.random(),
              type: "boom",
              multiplier: 0,
              payout: 0,
              minesCount: game.minesCount,
            },
            ...prev.slice(0, 8),
          ]);
          setGame(null);
        } else if (res.result === "cashout") {
          // Cleared EVERY safe tile on the board!
          sound.play("bigWin");
          coinRainEmitter.trigger(110);
          setTiles((prev) => {
            const next = [...prev];
            next[index] = "gem";
            return next;
          });
          setTilePopMult((prev) => ({ ...prev, [index]: res.multiplier }));
          revealFullBoard(res.mines, null);
          setRoundOver(true);
          setLastSeed(res.serverSeed);
          setLastMines(res.mines);
          setFairnessVerified("idle");
          setLastResult({
            type: "cashout",
            payout: res.payout,
            multiplier: res.multiplier,
            perfectClear: true,
            bet: game.bet,
          });
          animatePayoutTo(res.payout);
          setShowVictoryCard(true);
          setRoundHistory((prev) => [
            {
              id: Date.now() + Math.random(),
              type: "cashout",
              multiplier: res.multiplier,
              payout: res.payout,
              minesCount: game.minesCount,
            },
            ...prev.slice(0, 8),
          ]);
          setGame(null);
          toast.success(`${t("mines.cashedOut")} x${res.multiplier}`, { theme: "dark" });
        } else {
          const nextCount = res.game?.revealed?.length ?? 1;
          const stepMult = res.game?.currentMultiplier ?? multiplierFor(nextCount, game.minesCount);
          sound.play("gem", nextCount);
          setTiles((prev) => {
            const next = [...prev];
            next[index] = "gem";
            return next;
          });
          setTilePopMult((prev) => ({ ...prev, [index]: stepMult }));
          setGame(res.game);
          animatePayoutTo(res.game.potentialPayout);
        }
      } catch (error: any) {
        toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
      } finally {
        setRevealing(null);
        setTargetedTile(null);
      }
    },
    [animatePayoutTo, game, revealing, roundOver, t, tiles]
  );

  const handleRandomTile = useCallback(() => {
    if (!inRound || revealing !== null) return;
    const hiddenIndices = tiles
      .map((state, idx) => (state === "hidden" ? idx : -1))
      .filter((idx) => idx !== -1);
    if (hiddenIndices.length === 0) return;
    const pick = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
    setTargetedTile(pick);
    handleReveal(pick);
  }, [handleReveal, inRound, revealing, tiles]);

  const handleCashout = useCallback(async () => {
    if (!game || game.revealed.length === 0 || loading) return;
    setLoading(true);
    try {
      const res = await minesCashout();
      const mult = res.multiplier || game.currentMultiplier;
      sound.play(mult >= 5 ? "bigWin" : "cashout");
      coinRainEmitter.trigger(mult >= 10 ? 95 : mult >= 3 ? 55 : 28);
      revealFullBoard(res.mines, null);
      setRoundOver(true);
      setLastSeed(res.serverSeed);
      setLastMines(res.mines);
      setFairnessVerified("idle");
      setLastResult({
        type: "cashout",
        payout: res.payout,
        multiplier: res.multiplier,
        bet: game.bet,
      });
      animatePayoutTo(res.payout);
      setShowVictoryCard(true);
      setRoundHistory((prev) => [
        {
          id: Date.now() + Math.random(),
          type: "cashout",
          multiplier: res.multiplier,
          payout: res.payout,
          minesCount: game.minesCount,
        },
        ...prev.slice(0, 8),
      ]);
      setGame(null);
      toast.success(`${t("mines.cashedOut")} x${res.multiplier}`, { theme: "dark" });
    } catch (error: any) {
      toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
    } finally {
      setLoading(false);
    }
  }, [animatePayoutTo, game, loading, t]);

  // Keyboard ergonomics: Space = Start/Cashout, R = Random Tile
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (inRound && game && game.revealed.length > 0) {
          handleCashout();
        } else if (!inRound && !loading) {
          handleStart();
        }
      } else if ((e.key === "r" || e.key === "R") && inRound) {
        e.preventDefault();
        handleRandomTile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, handleCashout, handleRandomTile, handleStart, inRound, loading]);

  const handleVerifyFairness = async () => {
    if (!lastSeed || !lastMines || !displayHash) return;
    try {
      const check = await verifyMinesFairness(lastSeed, lastMines, displayHash);
      setFairnessVerified(check.valid ? "valid" : "invalid");
      if (check.valid) {
        sound.play("chip");
      }
    } catch {
      setFairnessVerified("invalid");
    }
  };

  const copyText = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  const userBalance = Number(userData?.walletBalance ?? 0);
  const cleanBet = Math.floor(Number(bet) || 0);
  const maxAffordable = Math.max(
    MIN_BET,
    Math.min(MAX_BET, Math.floor(userBalance > 0 ? userBalance : 100))
  );

  const quickBets: { label: string; apply: (b: number) => number }[] = [
    { label: "½", apply: (b) => Math.max(MIN_BET, Math.floor(b / 2)) },
    { label: "x2", apply: (b) => Math.max(MIN_BET, b * 2) },
    { label: "$10", apply: () => 10 },
    { label: "$100", apply: () => 100 },
    { label: "MAX", apply: () => maxAffordable },
  ];

  const riskBadge =
    activeMines <= 3
      ? {
          label: es ? "Bajo" : "Low",
          cls: "text-emerald-300 bg-emerald-950/75 border-emerald-500/45",
        }
      : activeMines <= 10
      ? {
          label: es ? "Medio" : "Medium",
          cls: "text-[#ffe9a8] bg-[#2c210e] border-[#d4af37]/55",
        }
      : activeMines <= 15
      ? {
          label: es ? "Alto" : "High",
          cls: "text-orange-300 bg-orange-950/75 border-orange-500/45",
        }
      : {
          label: es ? "Extremo" : "Extreme",
          cls: "text-[#ff8a93] bg-[#361014] border-[#e63946]/55",
        };

  const canStart =
    !loading &&
    cleanBet >= MIN_BET &&
    cleanBet <= MAX_BET &&
    (userData == null || userBalance >= cleanBet);

  const previewFirstMult = multiplierFor(1, minesCount);
  const previewMaxMult = multiplierFor(GRID_SIZE - minesCount, minesCount);
  const displayHash = game?.hash || lastHash;
  const streakHeat = inRound ? Math.min(1, revealedCount / Math.max(3, Math.min(8, totalGems))) : 0;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2">
      {/* Main AAA Colosseum Hypogeum Mines Container */}
      <div className="w-full max-w-[1160px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/50 bg-[#0d0a07] shadow-[0_32px_80px_-14px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,233,168,0.14)]">
        {/* Top Imperial Gold Accent Hairline */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffe9a8]/90 to-transparent" />

        {/* Imperial Marquee Header */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-[#21180d] via-[#2e2212] to-[#21180d] border-b border-[#d4af37]/35">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#fff2c2] to-[#8a6b18] p-[1.5px] shrink-0 shadow-[0_0_16px_rgba(212,175,55,0.5)]">
              <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                <FaCrown className="text-[#ffd966] text-sm" />
              </div>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.18em] gold-text truncate">
                  {es ? "Minas del Coliseo" : "Colosseum Mines"}
                </h1>
                {inRound && revealedCount >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-[10px] font-black uppercase tracking-wider text-emerald-300 animate-pulse">
                    <FaFire className="text-amber-300" />
                    {revealedCount} {es ? "racha" : "streak"}
                  </span>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#a59574] font-semibold truncate">
                {es
                  ? "Hipogeo Imperial · 25 Losas · Provably Fair · 99% RTP"
                  : "Imperial Hypogeum · 25 Stone Slabs · Provably Fair · 99% RTP"}
              </span>
            </div>
          </div>

          {/* Live Gems & Mines Telemetry Pills */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a2117] border border-emerald-400/50 text-xs font-mono tabular-nums font-black text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <GiDiamondHard className="text-emerald-400 text-sm" />
              <span>
                {gemsLeft}/{totalGems}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2e1014] border border-[#ef4444]/55 text-xs font-mono tabular-nums font-black text-[#ff949c] shadow-[0_0_12px_rgba(239,68,68,0.2)]">
              <GiMineExplosion className="text-[#ff5964] text-sm" />
              <span>{activeMines}</span>
            </div>
          </div>
        </div>

        {/* Body: Left Pro Control Panel + Right Cinematic Hypogeum 5x5 Vault */}
        <div className="flex flex-col-reverse lg:flex-row">
          {/* ---------- LEFT: Pro Control Deck ---------- */}
          <div className="lg:w-[348px] shrink-0 flex flex-col gap-4 p-4 sm:p-5 border-t lg:border-t-0 lg:border-r border-[#d4af37]/25 bg-gradient-to-b from-[#15100a] to-[#0d0a06]">
            {/* Bet Input */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="mines-bet"
                  className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5"
                >
                  <FaCoins className="text-[#d4af37] text-xs" />
                  {t("mines.bet")}
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

              <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#080705] focus-within:border-[#d4af37] focus-within:shadow-[0_0_18px_rgba(212,175,55,0.22)] transition-all">
                <span className="pl-3.5 text-[#d4af37] font-black text-lg">$</span>
                <input
                  id="mines-bet"
                  type="number"
                  value={bet || ""}
                  disabled={inRound}
                  min={MIN_BET}
                  max={MAX_BET}
                  placeholder="100"
                  onKeyDown={(e) => {
                    if (
                      !/[0-9]/.test(e.key) &&
                      !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                    ) {
                      e.preventDefault();
                    }
                  }}
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
                    disabled={inRound}
                    data-no-sfx
                    onClick={() => {
                      sound.play("chip");
                      setBet((b) =>
                        Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(q.apply(b || 0))))
                      );
                    }}
                    className={`py-1.5 rounded-lg text-xs font-black font-mono transition-all border disabled:opacity-40 cursor-pointer ${
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

            {/* Mines Count Selector: Presets + Precision 1..24 Slider */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5">
                  <GiMineExplosion className="text-[#ff5964] text-sm" />
                  {t("mines.mines")}{" "}
                  <span className="font-mono text-[#ffe9a8]">({minesCount})</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${riskBadge.cls}`}
                >
                  {riskBadge.label}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {MINES_PRESETS.map((n) => {
                  const selected = minesCount === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={inRound}
                      data-no-sfx
                      onClick={() => {
                        sound.play("chip");
                        setMinesCount(n);
                      }}
                      className={`py-1.5 rounded-lg border font-mono tabular-nums text-xs font-black transition-all disabled:opacity-45 cursor-pointer ${
                        selected
                          ? "bg-gradient-to-b from-[#f0d472] to-[#a67e1c] border-[#fff4cc] text-[#1a1204] shadow-[0_0_12px_rgba(212,175,55,0.48)]"
                          : "bg-[#1a140d] border-[#3a2f1d] text-[#d8ccb2] hover:border-[#d4af37]/70 hover:text-[#ffe9a8]"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              {/* Precision Slider (allows any mine count 1..24) */}
              <div className="flex items-center gap-2.5 px-1">
                <button
                  type="button"
                  disabled={inRound || minesCount <= 1}
                  data-no-sfx
                  onClick={() => {
                    sound.play("chip");
                    setMinesCount((m) => Math.max(1, m - 1));
                  }}
                  aria-label={es ? "Menos minas" : "Fewer mines"}
                  className="w-7 h-7 rounded-lg bg-[#1d160d] border border-[#4a391b] text-[#ffe9a8] font-black hover:border-[#ffd966] disabled:opacity-40 cursor-pointer flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="range"
                  min={1}
                  max={GRID_SIZE - 1}
                  value={minesCount}
                  disabled={inRound}
                  onChange={(e) => setMinesCount(Number(e.target.value))}
                  aria-label={t("mines.mines")}
                  className="flex-1 accent-[#d4af37] cursor-pointer disabled:opacity-45 h-1.5 rounded-lg bg-[#2a2114]"
                />
                <button
                  type="button"
                  disabled={inRound || minesCount >= GRID_SIZE - 1}
                  data-no-sfx
                  onClick={() => {
                    sound.play("chip");
                    setMinesCount((m) => Math.min(GRID_SIZE - 1, m + 1));
                  }}
                  aria-label={es ? "Más minas" : "More mines"}
                  className="w-7 h-7 rounded-lg bg-[#1d160d] border border-[#4a391b] text-[#ffe9a8] font-black hover:border-[#ffd966] disabled:opacity-40 cursor-pointer flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Quick Risk/Reward Preview when Idle */}
              {!inRound && (
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="px-2.5 py-1.5 rounded-xl bg-[#0a0806] border border-[#d4af37]/18 flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-[#9b8d6f] font-bold">
                      {es ? "1ª gema segura" : "1st safe gem"}
                    </span>
                    <span className="font-mono font-black text-[#ffe9a8]">
                      x{previewFirstMult.toFixed(2)}{" "}
                      <span className="text-[10px] text-emerald-400/90 font-semibold">
                        ({Math.round(((GRID_SIZE - minesCount) / GRID_SIZE) * 100)}%)
                      </span>
                    </span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl bg-[#0a0806] border border-[#d4af37]/18 flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-[#9b8d6f] font-bold">
                      {es ? "Tablero completo" : "Full clear"}
                    </span>
                    <span className="font-mono font-black text-emerald-300 truncate">
                      x{previewMaxMult >= 1000 ? `${(previewMaxMult / 1000).toFixed(1)}k` : previewMaxMult.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Session History Strip */}
            {roundHistory.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1 border-t border-[#d4af37]/15">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a7d61]">
                  {es ? "Últimas rondas" : "Recent rounds"}
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {roundHistory.map((item) => (
                    <span
                      key={item.id}
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                        item.type === "boom"
                          ? "bg-[#2b1014] border-[#ef4444]/50 text-[#ff8a93]"
                          : item.multiplier >= 5
                          ? "bg-gradient-to-b from-[#45320d] to-[#231805] border-[#ffd966]/80 text-[#fff2c2]"
                          : "bg-[#0e261b] border-emerald-500/50 text-emerald-300"
                      }`}
                    >
                      {item.type === "boom"
                        ? "💥"
                        : `x${item.multiplier.toFixed(2)}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2.5 mt-auto pt-2 border-t border-[#d4af37]/18">
              {inRound && game ? (
                <>
                  <button
                    type="button"
                    onClick={handleCashout}
                    disabled={game.revealed.length === 0 || loading}
                    className={`w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-[0.12em] text-sm sm:text-base transition-all border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      game.revealed.length > 0
                        ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#051a10] border-emerald-100/80 shadow-[0_0_30px_rgba(16,185,129,0.52)] active:scale-[0.98]"
                        : "bg-[#1d170f] text-[#9b8d6f] border-[#3e3219] cursor-not-allowed"
                    }`}
                  >
                    {game.revealed.length > 0 ? (
                      <>
                        <span className="font-mono tabular-nums leading-tight">
                          {t("mines.cashout")} ·{" "}
                          <Monetary
                            value={displayPayout}
                            showFraction={game.potentialPayout % 1 !== 0}
                          />
                        </span>
                        <span className="text-[11px] font-mono font-extrabold opacity-85">
                          x{game.currentMultiplier.toFixed(2)} · +$
                          {Math.max(0, game.potentialPayout - game.bet).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span>{t("mines.pickTile")}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRandomTile}
                    disabled={revealing !== null || loading}
                    className="w-full py-2.5 px-4 rounded-xl font-bold uppercase tracking-[0.14em] text-xs bg-[#1e170e] hover:bg-[#2a2013] text-[#ffe9a8] border border-[#d4af37]/45 hover:border-[#ffd966] transition-all flex items-center justify-center gap-2 disabled:opacity-45 cursor-pointer"
                  >
                    <FaDice className="text-[#ffd966] text-sm" />
                    <span>{es ? "Elegir losa al azar (R)" : "Pick random tile (R)"}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStart}
                  className="w-full py-4 px-4 rounded-xl font-black uppercase tracking-[0.16em] text-sm sm:text-base text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] border border-[#fff2c2]/75 shadow-[0_10px_28px_rgba(212,175,55,0.42)] transition-all duration-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                >
                  {loading
                    ? t("games.loading")
                    : userData != null && userBalance < cleanBet
                    ? t("games.notEnough")
                    : `${t("mines.start")}${cleanBet > 0 ? ` · $${cleanBet.toLocaleString("en-US")}` : ""}`}
                </button>
              )}

              <span className="hidden sm:block text-[10px] text-center text-[#8d7f63] font-semibold">
                {inRound
                  ? es
                    ? "Espacio = Cobrar · R = Losa al azar"
                    : "Space = Cashout · R = Random tile"
                  : es
                  ? "Espacio = Empezar ronda al instante"
                  : "Space = Instant start round"}
              </span>
            </div>
          </div>

          {/* ---------- RIGHT: Cinematic Hypogeum 5x5 Vault Arena ---------- */}
          <div className="flex-1 flex flex-col gap-3.5 p-3.5 sm:p-6 relative overflow-hidden bg-[#090705]">
            {/* Painterly Underground Colosseum Hypogeum Backdrop */}
            <img
              src={MINES_ASSETS.backdrop}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-80"
            />

            {/* Animated Flickering Torch Glows on Left & Right Hypogeum Arches */}
            <div
              className="slot-brazier-flame absolute left-[5%] top-[34%] w-36 h-36 rounded-full pointer-events-none blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,165,45,0.34) 0%, rgba(210,80,15,0.12) 55%, transparent 75%)",
              }}
            />
            <div
              className="slot-brazier-flame absolute right-[5%] top-[34%] w-36 h-36 rounded-full pointer-events-none blur-2xl"
              style={{
                animationDelay: "0.3s",
                background:
                  "radial-gradient(circle, rgba(255,165,45,0.34) 0%, rgba(210,80,15,0.12) 55%, transparent 75%)",
              }}
            />

            {/* Floating Hypogeum Torch & Emerald Embers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {HYPOGEUM_EMBERS.map((e) => (
                <motion.span
                  key={e.id}
                  initial={{ y: 240, opacity: 0, scale: 0.5 }}
                  animate={{
                    y: [-10, -210],
                    x: [0, e.id % 2 === 0 ? 12 : -12, 0],
                    opacity: [0, 0.85, 0],
                    scale: [0.5, 1.15, 0.3],
                  }}
                  transition={{
                    duration: e.dur,
                    delay: e.delay,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  style={{ left: e.left, bottom: "14%" }}
                  className={`absolute w-1.5 h-1.5 rounded-full ${
                    e.emerald
                      ? "bg-emerald-300 shadow-[0_0_8px_#34d399]"
                      : "bg-[#ffd966] shadow-[0_0_8px_#f59e0b]"
                  }`}
                />
              ))}
            </div>

            {/* Dynamic Tension & Outcome Atmosphere Vignette */}
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-500"
              style={{
                background:
                  lastResult?.type === "boom"
                    ? "radial-gradient(62% 62% at 50% 48%, rgba(220,38,38,0.28), rgba(7,4,4,0.8) 84%)"
                    : lastResult?.type === "cashout"
                    ? "radial-gradient(62% 62% at 50% 48%, rgba(16,185,129,0.22), rgba(7,6,4,0.76) 84%)"
                    : streakHeat > 0
                    ? `radial-gradient(62% 62% at 50% 48%, rgba(16,185,129,${(
                        0.08 +
                        streakHeat * 0.14
                      ).toFixed(2)}), rgba(7,6,4,0.78) 84%)`
                    : "radial-gradient(62% 62% at 50% 48%, rgba(14,10,6,0.34), rgba(6,5,4,0.8) 85%)",
              }}
            />

            {/* Live Multiplier Telemetry HUD */}
            <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[540px] mx-auto">
              <div
                className={`rounded-xl px-2.5 sm:px-3 py-2 border backdrop-blur-md flex flex-col items-center justify-center transition-all ${
                  inRound && game && game.revealed.length > 0
                    ? "bg-[#1e170a]/90 border-[#ffd966]/70 shadow-[0_0_18px_rgba(212,175,55,0.24)]"
                    : "bg-[#0e0b08]/88 border-[#382b17]"
                }`}
              >
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#a59574] font-bold">
                  {es ? "Actual" : "Current"}
                </span>
                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#fff2c2]">
                  x{(game ? game.currentMultiplier : lastResult?.multiplier || 1).toFixed(2)}
                </span>
              </div>

              <div className="rounded-xl px-2.5 sm:px-3 py-2 bg-[#0e0b08]/88 border border-[#382b17] backdrop-blur-md flex flex-col items-center justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#a59574] font-bold">
                  {t("mines.next")} ({nextSafePct}%)
                </span>
                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#ffd966]">
                  x{(game ? game.nextMultiplier : previewFirstMult).toFixed(2)}
                </span>
              </div>

              <div
                className={`rounded-xl px-2.5 sm:px-3 py-2 border backdrop-blur-md flex flex-col items-center justify-center transition-all ${
                  (inRound && game && game.revealed.length > 0) || lastResult?.type === "cashout"
                    ? "bg-[#0a2117]/90 border-emerald-400/65 shadow-[0_0_18px_rgba(16,185,129,0.26)]"
                    : "bg-[#0e0b08]/88 border-[#382b17]"
                }`}
              >
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#a59574] font-bold">
                  {t("games.payout")}
                </span>
                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-emerald-300 truncate max-w-full">
                  <Monetary
                    value={displayPayout}
                    showFraction={displayPayout % 1 !== 0}
                  />
                </span>
              </div>
            </div>

            {/* Live Multiplier Step Progression Ladder */}
            <div className="relative z-10 w-full max-w-[540px] mx-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
                {ladder.map((item) => {
                  const completed = item.step <= revealedCount;
                  const isNext = item.step === revealedCount + 1 && inRound;
                  return (
                    <div
                      key={item.step}
                      ref={(el) => {
                        ladderStepRefs.current[item.step] = el;
                      }}
                      className={`shrink-0 px-2.5 py-1 rounded-lg border font-mono text-[10px] sm:text-[11px] flex items-center gap-1.5 transition-all backdrop-blur-sm ${
                        completed
                          ? "bg-emerald-950/85 border-emerald-400/70 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : isNext
                          ? "bg-gradient-to-b from-[#3d2d0d]/95 to-[#221706]/95 border-[#ffe9a8] text-[#fff4cc] scale-105 shadow-[0_0_14px_rgba(255,215,0,0.45)]"
                          : "bg-[#110d08]/80 border-[#342817] text-[#9b8d6f]"
                      }`}
                    >
                      <span className="text-[9px] opacity-75">
                        {completed ? "✓" : `#${item.step}`}
                      </span>
                      <span className="font-black">x{item.multiplier.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ornate Gilded 5x5 Stone Vault Board */}
            <motion.div
              key={`board-shake-${boomShakeSeq}`}
              animate={
                boomShakeSeq > 0
                  ? { x: [0, -10, 10, -7, 7, -3, 3, 0], y: [0, -4, 4, -2, 2, 0] }
                  : { x: 0, y: 0 }
              }
              transition={{ duration: 0.44 }}
              className={`relative z-10 w-full max-w-[520px] mx-auto bg-gradient-to-b from-[#231a0d]/92 via-[#130e08]/95 to-[#0a0805]/95 backdrop-blur-sm p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-colors duration-300 shadow-[inset_0_0_46px_rgba(0,0,0,0.96),0_22px_50px_rgba(0,0,0,0.85)] ${
                lastResult?.type === "boom"
                  ? "border-[#ef4444]/80 shadow-[0_0_45px_rgba(220,38,38,0.35),inset_0_0_46px_rgba(0,0,0,0.96)]"
                  : lastResult?.type === "cashout"
                  ? "border-emerald-400/80 shadow-[0_0_45px_rgba(16,185,129,0.32),inset_0_0_46px_rgba(0,0,0,0.96)]"
                  : "border-[#d4af37]/60"
              }`}
            >
              {/* Engraved Antique Gold Corner Rivets */}
              <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#fff2c2] to-[#7a5b14] shadow-sm pointer-events-none" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#fff2c2] to-[#7a5b14] shadow-sm pointer-events-none" />
              <span className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#fff2c2] to-[#7a5b14] shadow-sm pointer-events-none" />
              <span className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#fff2c2] to-[#7a5b14] shadow-sm pointer-events-none" />

              {/* 5x5 Interactive Stone Grid */}
              <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {tiles.map((state, i) => (
                  <MineTile
                    key={i}
                    index={i}
                    state={state}
                    inRound={inRound}
                    roundOver={roundOver}
                    isRevealing={revealing === i}
                    isTargeted={targetedTile === i}
                    rippleDelay={rippleDelayFromTile(i, blastEpicenter)}
                    popMultiplier={tilePopMult[i] ?? null}
                    onSelect={handleReveal}
                  />
                ))}
              </div>

              {/* Celebratory Floating Victory Crest Card (dismissible to inspect solved board) */}
              <AnimatePresence>
                {showVictoryCard && lastResult?.type === "cashout" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowVictoryCard(false)}
                    className="absolute inset-0 z-40 rounded-2xl sm:rounded-3xl bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4 cursor-pointer"
                  >
                    <motion.div
                      initial={{ scale: 0.65, y: 16, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative flex flex-col items-center text-center px-6 py-5 rounded-2xl bg-gradient-to-b from-[#172c21]/96 via-[#0d1c14]/96 to-[#08120c]/96 border-2 border-emerald-300/85 shadow-[0_0_50px_rgba(16,185,129,0.55),inset_0_2px_12px_rgba(167,243,208,0.22)] max-w-[310px] w-full"
                    >
                      <button
                        type="button"
                        onClick={() => setShowVictoryCard(false)}
                        aria-label={es ? "Cerrar" : "Close"}
                        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/45 border border-emerald-400/40 text-emerald-200 hover:bg-black/70 text-xs font-bold flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>

                      <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#fff2c2] to-[#b58316] p-[2px] shadow-[0_0_24px_rgba(255,215,0,0.65)] mb-2">
                        <img
                          src={MINES_ASSETS.gem}
                          alt="Emerald"
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>

                      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                        {lastResult.perfectClear
                          ? es
                            ? "¡BÓVEDA PERFECTA!"
                            : "PERFECT CLEAR!"
                          : es
                          ? "¡BOTÍN ASEGURADO!"
                          : "BOUNTY SECURED!"}
                      </span>

                      <span className="mt-1 font-mono font-black text-3xl sm:text-4xl text-[#fff5cc] drop-shadow-[0_0_16px_rgba(255,215,0,0.6)]">
                        x{lastResult.multiplier?.toFixed(2)}
                      </span>

                      <div className="mt-1 font-mono font-black text-xl text-emerald-300">
                        <Monetary
                          value={lastResult.payout || 0}
                          showFraction={(lastResult.payout || 0) % 1 !== 0}
                        />
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                        {(lastResult.multiplier || 0) >= 1.5 && (lastResult.payout || 0) > 0 && (
                          <ShareWinButton
                            gameName={es ? "Minas del Coliseo" : "Colosseum Mines"}
                            multiplier={lastResult.multiplier || 1}
                            payout={lastResult.payout || 0}
                            compact
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowVictoryCard(false);
                            handleStart();
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#c49722] via-[#ffe28a] to-[#c49722] text-[#1a1204] text-xs font-black uppercase tracking-wider shadow-md hover:brightness-110 cursor-pointer"
                        >
                          {es ? "Jugar otra vez" : "Play again"}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Compact Result Status Strip below board */}
            <AnimatePresence>
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`relative z-10 w-full max-w-[520px] mx-auto rounded-xl px-4 py-2.5 border backdrop-blur-md text-center font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 ${
                    lastResult.type === "boom"
                      ? "bg-gradient-to-r from-[#2e0b0e]/95 via-[#491116]/95 to-[#2e0b0e]/95 border-[#ef4444]/75 text-[#ffb8be] shadow-[0_0_24px_rgba(220,38,38,0.3)]"
                      : "bg-gradient-to-r from-[#10261b]/95 via-[#183828]/95 to-[#10261b]/95 border-emerald-400/75 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.28)]"
                  }`}
                >
                  {lastResult.type === "boom" ? (
                    <>
                      <GiMineExplosion className="text-[#ff5964] text-lg shrink-0" />
                      <span>{t("mines.boom")}</span>
                    </>
                  ) : (
                    <>
                      <FaCrown className="text-[#ffd966] text-base shrink-0" />
                      <span className="font-mono tabular-nums">
                        {t("mines.cashedOut")} x{lastResult.multiplier?.toFixed(2)} ·{" "}
                        <Monetary
                          value={lastResult.payout || 0}
                          showFraction={(lastResult.payout || 0) % 1 !== 0}
                        />
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cryptographic Provably Fair Strip with 1-Click Client SHA-256 Verifier */}
            {(displayHash || lastSeed) && (
              <div className="relative z-10 w-full max-w-[520px] mx-auto rounded-xl bg-[#0c0907]/90 backdrop-blur-md border border-[#362a18] px-3.5 py-2.5 flex flex-col gap-1.5 text-[11px] text-[#9b8d6f]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[#cbb88b] font-bold uppercase tracking-widest text-[10px]">
                    <FaShieldAlt className="text-[#d4af37]" />
                    <span>Provably Fair · SHA-256</span>
                  </div>

                  {lastSeed && lastMines && (
                    <button
                      type="button"
                      onClick={handleVerifyFairness}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 cursor-pointer ${
                        fairnessVerified === "valid"
                          ? "bg-emerald-950/80 border-emerald-400/70 text-emerald-300"
                          : fairnessVerified === "invalid"
                          ? "bg-red-950/80 border-red-400/70 text-red-300"
                          : "bg-[#22190c] border-[#d4af37]/50 text-[#ffe9a8] hover:border-[#ffd966]"
                      }`}
                    >
                      {fairnessVerified === "valid" ? (
                        <>
                          <FaCheckCircle />
                          <span>{es ? "Hash Verificado" : "Hash Verified"}</span>
                        </>
                      ) : fairnessVerified === "invalid" ? (
                        <span>{es ? "No coincide" : "Mismatch"}</span>
                      ) : (
                        <span>{es ? "Verificar ronda" : "Verify round"}</span>
                      )}
                    </button>
                  )}
                </div>

                {displayHash && (
                  <div className="flex items-center justify-between gap-2 font-mono">
                    <span className="truncate">
                      <span className="text-[#8a7d61]">Hash: </span>
                      {displayHash}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("hash", displayHash)}
                      className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1 cursor-pointer"
                      title={es ? "Copiar hash" : "Copy hash"}
                    >
                      {copiedKey === "hash" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                    </button>
                  </div>
                )}

                {lastSeed && (
                  <div className="flex items-center justify-between gap-2 font-mono">
                    <span className="truncate text-[#e6ca6a]">
                      <span className="text-[#8a7d61]">{t("mines.seed")}: </span>
                      {lastSeed}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText("seed", lastSeed)}
                      className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1 cursor-pointer"
                      title={es ? "Copiar seed" : "Copy seed"}
                    >
                      {copiedKey === "seed" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mines;

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { FaCrown, FaCoins, FaDice, FaShieldAlt, FaCopy, FaCheck } from "react-icons/fa";
import { GiMineExplosion, GiDiamondHard } from "react-icons/gi";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import { minesActive, minesStart, minesReveal, minesCashout } from "../../services/games/GamesServices";
import sound from "../../services/sound";
import { translateApiMessage } from "../../services/apiMessageI18n";
import { coinRainEmitter } from "../../components/CoinRain";

const GRID_SIZE = 25;
const MIN_BET = 1;
const MAX_BET = 50000;
const MINES_OPTIONS = [1, 3, 5, 10, 15, 20, 24];
const GEM_IMG = "/images/slot/lily.webp";

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

type TileState = "hidden" | "gem" | "mine" | "mineHit";

const firstGemMultiplier = (mines: number) =>
    Math.max(1, Math.floor((GRID_SIZE / (GRID_SIZE - mines)) * 0.99 * 100) / 100);

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
    const [roundOver, setRoundOver] = useState<boolean>(false);
    const [lastSeed, setLastSeed] = useState<string | null>(null);
    const [lastHash, setLastHash] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{
        type: "boom" | "cashout";
        payout?: number;
        multiplier?: number;
    } | null>(null);

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

    const applyGameState = (g: ActiveGame) => {
        setGame(g);
        setLastHash(g.hash);
        setRoundOver(false);
        setLastResult(null);
        setLastSeed(null);
        const newTiles: TileState[] = Array(GRID_SIZE).fill("hidden");
        g.revealed.forEach((i) => (newTiles[i] = "gem"));
        setTiles(newTiles);
    };

    const revealMines = (mines: number[], hitIndex: number | null) => {
        setTiles((prev) => {
            const next = [...prev];
            mines.forEach((m) => {
                next[m] = m === hitIndex ? "mineHit" : "mine";
            });
            return next;
        });
    };

    const handleStart = async () => {
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
    };

    const handleReveal = async (index: number) => {
        if (!game || roundOver || tiles[index] !== "hidden" || revealing !== null) return;
        setRevealing(index);
        try {
            const res = await minesReveal(index);
            if (res.result === "boom") {
                sound.play("boom");
                revealMines(res.mines, res.tileIndex);
                setRoundOver(true);
                setLastSeed(res.serverSeed);
                setLastResult({ type: "boom" });
                setGame(null);
            } else if (res.result === "cashout") {
                sound.play("bigWin");
                coinRainEmitter.trigger(80);
                revealMines(res.mines, null);
                setRoundOver(true);
                setLastSeed(res.serverSeed);
                setLastResult({ type: "cashout", payout: res.payout, multiplier: res.multiplier });
                setGame(null);
                toast.success(`${t("mines.cashedOut")} x${res.multiplier}`, { theme: "dark" });
            } else {
                sound.play("gem", res.game?.revealed?.length ?? 1);
                setTiles((prev) => {
                    const next = [...prev];
                    next[index] = "gem";
                    return next;
                });
                setGame(res.game);
            }
        } catch (error: any) {
            toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
        } finally {
            setRevealing(null);
        }
    };

    const handleRandomTile = () => {
        if (!inRound || revealing !== null) return;
        const hiddenIndices = tiles
            .map((state, idx) => (state === "hidden" ? idx : -1))
            .filter((idx) => idx !== -1);
        if (hiddenIndices.length === 0) return;
        const pick = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
        handleReveal(pick);
    };

    const handleCashout = async () => {
        if (!game || game.revealed.length === 0) return;
        setLoading(true);
        try {
            const res = await minesCashout();
            sound.play("cashout");
            coinRainEmitter.trigger(55);
            revealMines(res.mines, null);
            setRoundOver(true);
            setLastSeed(res.serverSeed);
            setLastResult({ type: "cashout", payout: res.payout, multiplier: res.multiplier });
            setGame(null);
            toast.success(`${t("mines.cashedOut")} x${res.multiplier}`, { theme: "dark" });
        } catch (error: any) {
            toast.error(translateApiMessage(error, t("toast.connError")), { theme: "dark" });
        } finally {
            setLoading(false);
        }
    };

    const copyText = (key: string, value: string) => {
        navigator.clipboard?.writeText(value).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        });
    };

    const inRound = game !== null && !roundOver;
    const activeMines = game ? game.minesCount : minesCount;
    const totalGems = GRID_SIZE - activeMines;
    const revealedCount = game ? game.revealed.length : tiles.filter((x) => x === "gem").length;
    const gemsLeft = Math.max(0, totalGems - revealedCount);
    const tilesLeft = GRID_SIZE - revealedCount;
    const nextSafePct = tilesLeft > 0 ? Math.round((gemsLeft / tilesLeft) * 100) : 0;

    const userBalance = Number(userData?.walletBalance ?? 0);
    const cleanBet = Math.floor(Number(bet) || 0);
    const maxAffordable = Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(userBalance > 0 ? userBalance : 100)));

    const quickBets: { label: string; apply: (b: number) => number }[] = [
        { label: "½", apply: (b) => Math.max(MIN_BET, Math.floor(b / 2)) },
        { label: "x2", apply: (b) => Math.max(MIN_BET, b * 2) },
        { label: "$10", apply: () => 10 },
        { label: "$100", apply: () => 100 },
        { label: "MAX", apply: () => maxAffordable },
    ];

    const riskBadge =
        activeMines <= 3
            ? { label: es ? "Bajo" : "Low", cls: "text-emerald-300 bg-emerald-950/70 border-emerald-500/40" }
            : activeMines <= 10
                ? { label: es ? "Medio" : "Medium", cls: "text-[#ffe9a8] bg-[#2c210e] border-[#d4af37]/50" }
                : activeMines <= 15
                    ? { label: es ? "Alto" : "High", cls: "text-orange-300 bg-orange-950/70 border-orange-500/40" }
                    : { label: es ? "Extremo" : "Extreme", cls: "text-[#ff8a93] bg-[#361014] border-[#e63946]/50" };

    const canStart =
        !loading &&
        cleanBet >= MIN_BET &&
        cleanBet <= MAX_BET &&
        (userData == null || userBalance >= cleanBet);

    const previewFirstMult = firstGemMultiplier(minesCount);
    const displayHash = game?.hash || lastHash;

    return (
        <div className="w-full flex flex-col items-center justify-center gap-6 px-3 pb-12 -mt-2">
            {/* Main Colosseum Mines Container */}
            <div className="w-full max-w-[1040px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
                {/* Imperial Marquee Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_12px_rgba(212,175,55,0.45)]">
                            <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                                <FaCrown className="text-[#ffd966] text-xs" />
                            </div>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] gold-text">
                                {es ? "Minas del Coliseo" : "Colosseum Mines"}
                            </h1>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#9b8d6f] font-semibold">
                                {es ? "25 Losas · Provably Fair · 99% RTP" : "25 Tiles · Provably Fair · 99% RTP"}
                            </span>
                        </div>
                    </div>

                    {/* Live Gems & Mines Counters */}
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d1f17] border border-emerald-500/40 text-xs font-mono tabular-nums font-bold text-emerald-300">
                            <GiDiamondHard className="text-emerald-400 text-sm" />
                            <span>
                                {gemsLeft}/{totalGems}
                            </span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2b1114] border border-[#e63946]/45 text-xs font-mono tabular-nums font-bold text-[#ff8a93]">
                            <GiMineExplosion className="text-[#ff5964] text-sm" />
                            <span>{activeMines}</span>
                        </div>
                    </div>
                </div>

                {/* Body: Control Panel + 5x5 Vault Grid */}
                <div className="flex flex-col-reverse lg:flex-row">
                    {/* ---------- Left Control Panel ---------- */}
                    <div className="lg:w-[340px] shrink-0 flex flex-col gap-5 p-5 border-t lg:border-t-0 lg:border-r border-[#d4af37]/20 bg-[#120e09]/85">
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

                            <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#090806] focus-within:border-[#d4af37] focus-within:shadow-[0_0_16px_rgba(212,175,55,0.2)] transition-all">
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
                                    className="w-full bg-transparent py-3 px-2.5 text-white font-mono tabular-nums font-black text-lg outline-none disabled:opacity-60"
                                />
                            </div>

                            <div className="grid grid-cols-5 gap-1.5">
                                {quickBets.map((q) => (
                                    <button
                                        key={q.label}
                                        type="button"
                                        disabled={inRound}
                                        onClick={() => {
                                            sound.play("chip");
                                            setBet((b) => Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(q.apply(b || 0)))));
                                        }}
                                        className={`py-1.5 rounded-lg text-xs font-black font-mono transition-all border disabled:opacity-40 ${
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

                        {/* Mines Count Selector */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] uppercase tracking-[0.2em] text-[#b9a77a] font-bold flex items-center gap-1.5">
                                    <GiMineExplosion className="text-[#ff5964] text-sm" />
                                    {t("mines.mines")}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${riskBadge.cls}`}
                                >
                                    {riskBadge.label}
                                </span>
                            </div>

                            <div className="grid grid-cols-7 gap-1.5">
                                {MINES_OPTIONS.map((n) => {
                                    const selected = minesCount === n;
                                    return (
                                        <button
                                            key={n}
                                            type="button"
                                            disabled={inRound}
                                            onClick={() => {
                                                sound.play("chip");
                                                setMinesCount(n);
                                            }}
                                            className={`py-2 rounded-lg border font-mono tabular-nums text-xs font-black transition-all disabled:opacity-45 ${
                                                selected
                                                    ? "bg-gradient-to-b from-[#e6ca6a] to-[#a67e1c] border-[#fff2c2] text-[#1a1204] shadow-[0_0_12px_rgba(212,175,55,0.45)]"
                                                    : "bg-[#1a140d] border-[#3a2f1d] text-[#d8ccb2] hover:border-[#d4af37]/65 hover:text-[#ffe9a8]"
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 1st-gem preview when idle */}
                            {!inRound && (
                                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0b0907] border border-[#d4af37]/15 text-[11px]">
                                    <span className="text-[#9b8d6f] font-semibold">
                                        {es ? "1ª gema segura:" : "1st safe gem:"}
                                    </span>
                                    <span className="font-mono tabular-nums font-black text-[#ffe9a8]">
                                        x{previewFirstMult.toFixed(2)}{" "}
                                        <span className="text-[#9b8d6f] font-semibold">
                                            ({Math.round(((GRID_SIZE - minesCount) / GRID_SIZE) * 100)}%)
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2.5 mt-auto">
                            {inRound && game ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCashout}
                                        disabled={game.revealed.length === 0 || loading}
                                        className={`w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-[0.12em] text-sm sm:text-base transition-all border flex items-center justify-center gap-2 ${
                                            game.revealed.length > 0
                                                ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#051a10] border-emerald-200/70 shadow-[0_0_26px_rgba(16,185,129,0.45)] active:scale-[0.98]"
                                                : "bg-[#1d170f] text-[#9b8d6f] border-[#3e3219] cursor-not-allowed"
                                        }`}
                                    >
                                        {game.revealed.length > 0 ? (
                                            <span className="font-mono tabular-nums">
                                                {t("mines.cashout")} ·{" "}
                                                <Monetary value={game.potentialPayout} showFraction /> (x
                                                {game.currentMultiplier.toFixed(2)})
                                            </span>
                                        ) : (
                                            <span>{t("mines.pickTile")}</span>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleRandomTile}
                                        disabled={revealing !== null || loading}
                                        className="w-full py-2.5 px-4 rounded-xl font-bold uppercase tracking-[0.14em] text-xs bg-[#1e170e] hover:bg-[#2a2013] text-[#ffe9a8] border border-[#d4af37]/40 hover:border-[#ffd966] transition-all flex items-center justify-center gap-2 disabled:opacity-45"
                                    >
                                        <FaDice className="text-[#d4af37] text-sm" />
                                        {es ? "Elegir casilla al azar" : "Pick random tile"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleStart}
                                    disabled={!canStart}
                                    className="w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-[0.15em] text-[#1a1204] bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] border border-[#fff2c2]/60 shadow-[0_8px_24px_rgba(212,175,55,0.35)] transition-all duration-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    {loading
                                        ? t("games.loading")
                                        : userData != null && userBalance < cleanBet
                                            ? t("games.notEnough")
                                            : `${t("mines.start")}${cleanBet > 0 ? ` · $${cleanBet.toLocaleString("en-US")}` : ""}`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ---------- Right 5x5 Vault Arena ---------- */}
                    <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6 relative overflow-hidden bg-[radial-gradient(65%_55%_at_50%_40%,rgba(212,175,55,0.09),transparent_70%),linear-gradient(180deg,#120e09_0%,#0a0806_100%)]">
                        {/* Live Multiplier HUD Bar */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div
                                className={`rounded-xl px-3 py-2 border flex flex-col items-center justify-center transition-all ${
                                    inRound && game && game.revealed.length > 0
                                        ? "bg-[#1e170a] border-[#d4af37]/60 shadow-[0_0_16px_rgba(212,175,55,0.18)]"
                                        : "bg-[#0d0b08] border-[#2d2416]"
                                }`}
                            >
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#9b8d6f] font-bold">
                                    {es ? "Actual" : "Current"}
                                </span>
                                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#ffe9a8]">
                                    x{(game ? game.currentMultiplier : 1).toFixed(2)}
                                </span>
                            </div>

                            <div className="rounded-xl px-3 py-2 bg-[#0d0b08] border border-[#2d2416] flex flex-col items-center justify-center">
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#9b8d6f] font-bold">
                                    {t("mines.next")} ({nextSafePct}%)
                                </span>
                                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-[#d4af37]">
                                    x{(game ? game.nextMultiplier : previewFirstMult).toFixed(2)}
                                </span>
                            </div>

                            <div
                                className={`rounded-xl px-3 py-2 border flex flex-col items-center justify-center transition-all ${
                                    inRound && game && game.revealed.length > 0
                                        ? "bg-[#0c1d15] border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.18)]"
                                        : "bg-[#0d0b08] border-[#2d2416]"
                                }`}
                            >
                                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#9b8d6f] font-bold">
                                    {t("games.payout")}
                                </span>
                                <span className="font-mono tabular-nums font-black text-base sm:text-lg text-emerald-300 truncate max-w-full">
                                    <Monetary
                                        value={game ? game.potentialPayout : cleanBet}
                                        showFraction={Boolean(game && game.potentialPayout % 1 !== 0)}
                                    />
                                </span>
                            </div>
                        </div>

                        {/* 5x5 Stone Vault Frame */}
                        <div className="w-full max-w-[500px] mx-auto bg-[#080705] p-3 sm:p-4 rounded-2xl border-2 border-[#3e3017] shadow-[inset_0_0_40px_rgba(0,0,0,0.95),0_16px_40px_rgba(0,0,0,0.75)] relative">
                            <div className="grid grid-cols-5 gap-2 sm:gap-3">
                                {tiles.map((state, i) => {
                                    const isHidden = state === "hidden";
                                    const isGem = state === "gem";
                                    const isMine = state === "mine";
                                    const isMineHit = state === "mineHit";
                                    const isRevealingThis = revealing === i;

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={!inRound || !isHidden || revealing !== null}
                                            onClick={() => handleReveal(i)}
                                            aria-label={`Tile ${i + 1}`}
                                            className={`aspect-square relative rounded-xl flex items-center justify-center select-none overflow-hidden transition-all duration-200 ${
                                                isGem
                                                    ? "tile-pop bg-[#091c13] ring-2 ring-emerald-400/90 shadow-[0_0_22px_rgba(16,185,129,0.5),inset_0_0_14px_rgba(52,211,153,0.3)]"
                                                    : isMineHit
                                                        ? "tile-shake bg-gradient-to-br from-[#dc2626] via-[#991b1b] to-[#450a0a] ring-2 ring-[#fca5a5] shadow-[0_0_28px_rgba(239,68,68,0.85)]"
                                                        : isMine
                                                            ? "bg-gradient-to-br from-[#3a1215] to-[#1a0709] border border-[#991b1b]/70 opacity-75"
                                                            : `bg-gradient-to-b from-[#2c2317] via-[#1f1911] to-[#15100a] border border-[#4a3b22] border-b-[4px] border-b-[#0e0a06] shadow-[inset_0_1px_1px_rgba(255,233,168,0.14)] ${
                                                                  inRound
                                                                      ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#d4af37] hover:from-[#382c1b] hover:to-[#1e170e] hover:shadow-[0_0_18px_rgba(212,175,55,0.28),inset_0_1px_2px_rgba(255,233,168,0.3)] active:translate-y-0.5"
                                                                      : roundOver
                                                                          ? "opacity-45 cursor-default"
                                                                          : "opacity-80 cursor-default"
                                                              } ${isRevealingThis ? "animate-pulse border-[#ffd966]" : ""}`
                                            }`}
                                        >
                                            {/* Hidden carved stone ornament */}
                                            {isHidden && (
                                                <div className="w-4 h-4 sm:w-5 sm:h-5 rotate-45 border border-[#d4af37]/20 bg-[#d4af37]/[0.04] rounded-[3px] pointer-events-none" />
                                            )}

                                            {/* Revealed Emerald Jewel */}
                                            {isGem && (
                                                <>
                                                    <img
                                                        src={GEM_IMG}
                                                        alt="Gem"
                                                        draggable={false}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 via-transparent to-white/15 pointer-events-none" />
                                                </>
                                            )}

                                            {/* Revealed Mine */}
                                            {(isMine || isMineHit) && (
                                                <GiMineExplosion
                                                    className={`${
                                                        isMineHit
                                                            ? "text-[#fff1f2] text-3xl sm:text-4xl drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                                                            : "text-[#f87171] text-2xl sm:text-3xl opacity-85"
                                                    }`}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Round Result Banner */}
                        <AnimatePresence>
                            {lastResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={`w-full max-w-[500px] mx-auto rounded-xl px-4 py-3 border text-center font-black uppercase tracking-wider text-sm sm:text-base flex items-center justify-center gap-2 ${
                                        lastResult.type === "boom"
                                            ? "bg-gradient-to-r from-[#2e0b0e] via-[#471015] to-[#2e0b0e] border-[#e63946]/70 text-[#ffb3b8] shadow-[0_0_24px_rgba(220,38,38,0.25)]"
                                            : "bg-gradient-to-r from-[#261c08] via-[#3d2d0d] to-[#261c08] border-[#ffd966] text-[#fff2c2] shadow-[0_0_28px_rgba(212,175,55,0.3)]"
                                    }`}
                                >
                                    {lastResult.type === "boom" ? (
                                        <>
                                            <GiMineExplosion className="text-[#ff5964] text-xl shrink-0" />
                                            <span>{t("mines.boom")}</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaCrown className="text-[#ffd966] text-lg shrink-0" />
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

                        {/* Provably Fair Verification Footer */}
                        {(displayHash || lastSeed) && (
                            <div className="w-full max-w-[500px] mx-auto rounded-xl bg-[#0b0907] border border-[#2c2316] px-3.5 py-2.5 flex flex-col gap-1.5 text-[11px] text-[#8a7f63]">
                                <div className="flex items-center gap-1.5 text-[#b9a77a] font-bold uppercase tracking-widest text-[10px]">
                                    <FaShieldAlt className="text-[#d4af37]" />
                                    <span>Provably Fair</span>
                                </div>
                                {displayHash && (
                                    <div className="flex items-center justify-between gap-2 font-mono">
                                        <span className="truncate">
                                            <span className="text-[#9b8d6f]">Hash: </span>
                                            {displayHash}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => copyText("hash", displayHash)}
                                            className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1"
                                            title="Copiar hash"
                                        >
                                            {copiedKey === "hash" ? <FaCheck /> : <FaCopy />}
                                        </button>
                                    </div>
                                )}
                                {lastSeed && (
                                    <div className="flex items-center justify-between gap-2 font-mono">
                                        <span className="truncate text-[#e6ca6a]">
                                            <span className="text-[#9b8d6f]">{t("mines.seed")}: </span>
                                            {lastSeed}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => copyText("seed", lastSeed)}
                                            className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1"
                                            title="Copiar seed"
                                        >
                                            {copiedKey === "seed" ? <FaCheck /> : <FaCopy />}
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

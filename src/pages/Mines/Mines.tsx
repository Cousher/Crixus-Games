import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import UserContext from "../../UserContext";
import Monetary from "../../components/Monetary";
import MainButton from "../../components/MainButton";
import { minesActive, minesStart, minesReveal, minesCashout } from "../../services/games/GamesServices";
import { GiMineExplosion, GiDiamondHard } from "react-icons/gi";

const GRID_SIZE = 25;
const MINES_OPTIONS = [3, 5, 10, 15, 20, 24];

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

const Mines = () => {
    const { t } = useTranslation();
    const { isLogged, toogleUserFlow, userData } = useContext(UserContext);

    const [bet, setBet] = useState<number | null>(100);
    const [minesCount, setMinesCount] = useState<number>(5);
    const [game, setGame] = useState<ActiveGame | null>(null);
    const [tiles, setTiles] = useState<TileState[]>(Array(GRID_SIZE).fill("hidden"));
    const [loading, setLoading] = useState<boolean>(false);
    const [revealing, setRevealing] = useState<number | null>(null);
    const [roundOver, setRoundOver] = useState<boolean>(false);
    const [lastSeed, setLastSeed] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{ type: "boom" | "cashout"; payout?: number; multiplier?: number } | null>(null);

    // resume an active round after a refresh (the stake lives in the DB)
    useEffect(() => {
        if (!isLogged) return;
        minesActive()
            .then((res) => {
                if (res.game) {
                    applyGameState(res.game);
                    toast.info(t("mines.resume"), { theme: "dark" });
                }
            })
            .catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLogged]);

    const applyGameState = (g: ActiveGame) => {
        setGame(g);
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
        if (!bet || bet < 1) return;
        setLoading(true);
        try {
            const res = await minesStart(bet, minesCount);
            applyGameState(res.game);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t("toast.connError"), { theme: "dark" });
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
                revealMines(res.mines, res.tileIndex);
                setRoundOver(true);
                setLastSeed(res.serverSeed);
                setLastResult({ type: "boom" });
                setGame(null);
            } else if (res.result === "cashout") {
                // revealed every safe tile: auto cashout at max multiplier
                revealMines(res.mines, null);
                setRoundOver(true);
                setLastSeed(res.serverSeed);
                setLastResult({ type: "cashout", payout: res.payout, multiplier: res.multiplier });
                setGame(null);
                toast.success(`${t("mines.cashedOut")} x${res.multiplier}`, { theme: "dark" });
            } else {
                setTiles((prev) => {
                    const next = [...prev];
                    next[index] = "gem";
                    return next;
                });
                setGame(res.game);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t("toast.connError"), { theme: "dark" });
        } finally {
            setRevealing(null);
        }
    };

    const handleCashout = async () => {
        if (!game || game.revealed.length === 0) return;
        setLoading(true);
        try {
            const res = await minesCashout();
            revealMines(res.mines, null);
            setRoundOver(true);
            setLastSeed(res.serverSeed);
            setLastResult({ type: "cashout", payout: res.payout, multiplier: res.multiplier });
            setGame(null);
            toast.success(`${t("mines.cashedOut")} x${res.multiplier}`, { theme: "dark" });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t("toast.connError"), { theme: "dark" });
        } finally {
            setLoading(false);
        }
    };

    const inRound = game !== null && !roundOver;

    const tileClasses = (state: TileState, index: number) => {
        const base = "aspect-square rounded-md flex items-center justify-center text-2xl md:text-3xl transition-all duration-200 select-none";
        switch (state) {
            case "gem":
                return `${base} bg-emerald-700/80 border border-emerald-400 scale-95 shadow-[0_0_12px_rgba(52,211,153,0.5)]`;
            case "mine":
                return `${base} bg-red-900/60 border border-red-700 opacity-70`;
            case "mineHit":
                return `${base} bg-red-600 border border-red-300 animate-pulse shadow-[0_0_18px_rgba(239,68,68,0.9)]`;
            default:
                return `${base} bg-[#2a251c] border border-[#3d362a] ${inRound ? "cursor-pointer hover:bg-[#3a3324] hover:border-amber-600" : "opacity-80"} ${revealing === index ? "animate-pulse" : ""}`;
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-6 py-8">
            <h1 className="text-3xl font-bold tracking-widest text-amber-400">{t("mines.title")}</h1>

            <div className="flex flex-col lg:flex-row gap-6 bg-[#1c1813] rounded p-6 w-[95vw] max-w-[900px]">
                {/* side panel */}
                <div className="lg:w-[280px] flex flex-col gap-4">
                    <label className="text-sm text-gray-400">{t("mines.bet")}</label>
                    <input
                        type="number"
                        value={bet || ""}
                        disabled={inRound}
                        min={1}
                        max={50000}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            setBet(value < 0 ? 0 : value);
                        }}
                        className="p-2 border border-[#3d362a] bg-[#12100c] rounded w-full text-white"
                    />

                    <label className="text-sm text-gray-400">{t("mines.mines")}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {MINES_OPTIONS.map((n) => (
                            <button
                                key={n}
                                disabled={inRound}
                                onClick={() => setMinesCount(n)}
                                className={`p-2 rounded border text-sm ${minesCount === n
                                    ? "bg-amber-600 border-amber-400 text-white"
                                    : "bg-[#12100c] border-[#3d362a] text-gray-300 hover:border-amber-700"
                                    } ${inRound ? "opacity-50" : ""}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>

                    {inRound && game ? (
                        <div className="flex flex-col gap-2 mt-2 bg-[#12100c] rounded p-3 border border-[#3d362a]">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{t("games.multiplier")}</span>
                                <span className="text-emerald-400 font-bold">x{game.currentMultiplier.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{t("mines.next")}</span>
                                <span className="text-amber-400">x{game.nextMultiplier.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{t("games.payout")}</span>
                                <span className="text-white font-bold"><Monetary value={game.potentialPayout} showFraction /></span>
                            </div>
                        </div>
                    ) : null}

                    {inRound ? (
                        <MainButton
                            text={game && game.revealed.length > 0
                                ? <span>{t("mines.cashout")} (<Monetary value={game.potentialPayout} showFraction />)</span>
                                : t("mines.pickTile")}
                            onClick={handleCashout}
                            type="success"
                            loading={loading}
                            disabled={!game || game.revealed.length === 0 || loading}
                        />
                    ) : (
                        <MainButton
                            text={t("mines.start")}
                            onClick={handleStart}
                            loading={loading}
                            disabled={loading || !bet || bet < 1 || (userData && userData.walletBalance < (bet ?? 0))}
                        />
                    )}

                    {lastResult && (
                        <div className={`text-center font-bold p-2 rounded ${lastResult.type === "boom" ? "text-red-400 bg-red-950/50" : "text-emerald-400 bg-emerald-950/40"}`}>
                            {lastResult.type === "boom"
                                ? t("mines.boom")
                                : <span>{t("mines.cashedOut")} x{lastResult.multiplier?.toFixed(2)} → <Monetary value={lastResult.payout || 0} showFraction /></span>}
                        </div>
                    )}
                </div>

                {/* 5x5 grid */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="grid grid-cols-5 gap-2 md:gap-3">
                        {tiles.map((state, i) => (
                            <div key={i} className={tileClasses(state, i)} onClick={() => handleReveal(i)}>
                                {state === "gem" && <GiDiamondHard className="text-emerald-300" />}
                                {(state === "mine" || state === "mineHit") && <GiMineExplosion className="text-red-300" />}
                            </div>
                        ))}
                    </div>

                    {/* provably fair footer */}
                    {(game || lastSeed) && (
                        <div className="text-[10px] text-gray-500 break-all mt-2">
                            {game && <div>{t("mines.fairness")}: {game.hash}</div>}
                            {lastSeed && <div>{t("mines.seed")}: {lastSeed}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Mines;

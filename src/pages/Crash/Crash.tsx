import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCrown, FaShieldAlt, FaCopy, FaCheck } from "react-icons/fa";
import SocketConnection from "../../services/socket";
import UserContext from "../../UserContext";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import LiveBets from "./LiveBets";
import GameContainer from "./GameContainer";
import SideMenu from "./SideMenu";

const socket = SocketConnection.getInstance();
const DEFAULT_GROWTH = 0.06;

interface GameHistory {
  crashPoint: number;
}

const CrashGame = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const [bet, setBet] = useState<number | null>(10);
  const [autoCashout, setAutoCashout] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(true);
  const [countDown, setCountDown] = useState<number>(0);
  const [userGambled, setUserGambled] = useState<boolean>(false);
  const [userMultiplier, setUserMultiplier] = useState<number>(0);
  const [userCashedOut, setUserCashedOut] = useState<boolean>(false);
  const [disableButton, setDisableButton] = useState<boolean>(false);
  const [roundHash, setRoundHash] = useState<string | null>(null);
  const [lastSeed, setLastSeed] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>({
    gameBets: {},
    gamePlayers: {},
    crashPoint: 1.0,
    gameStartTime: null,
  });

  // Local client-side RAF interpolation refs (eliminates 80ms server socket spam on mobile)
  const roundOriginPerfRef = useRef<number | null>(null);
  const growthRef = useRef<number>(DEFAULT_GROWTH);
  const multiplierRef = useRef<number>(1.0);
  const userCashedOutRef = useRef<boolean>(false);
  const lastTickStep = useRef<number>(0);
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

  useEffect(() => {
    userCashedOutRef.current = userCashedOut;
  }, [userCashedOut]);

  const { isLogged, userData, toogleUserFlow } = useContext(UserContext);

  const stopRaf = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  const startRafLoop = useCallback(
    (elapsedMs = 0, growth = DEFAULT_GROWTH) => {
      stopRaf();
      growthRef.current = growth;
      roundOriginPerfRef.current = performance.now() - elapsedMs;
      let lastRender = 0;

      const tick = (now: number) => {
        if (roundOriginPerfRef.current === null) return;
        const elapsedSec = Math.max(0, (now - roundOriginPerfRef.current) / 1000);
        const m = Math.exp(elapsedSec * growthRef.current);
        multiplierRef.current = m;

        // Throttle React updates to ~30fps: silky smooth visually while halving mobile CPU load
        if (now - lastRender >= 33) {
          lastRender = now;
          setMultiplier(m);
          const step = Math.floor(m * 4);
          if (step > lastTickStep.current) {
            lastTickStep.current = step;
            sound.play("tick", m);
          }
        }

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [stopRaf]
  );

  useEffect(() => stopRaf, [stopRaf]);

  const handleBet = useCallback(() => {
    if (!isLogged) {
      toogleUserFlow(true);
      return;
    }

    const cleanBet = Math.floor(Number(bet) || 0);
    if (cleanBet < 1 || cleanBet > 10000) return;

    setUserGambled(true);
    sound.play("chip");

    socket.emit("crash:bet", {
      bet: cleanBet,
      autoCashout: autoCashout && autoCashout >= 1.01 ? autoCashout : null,
    });
    setUserCashedOut(false);
  }, [isLogged, toogleUserFlow, bet, autoCashout]);

  const handleCashout = useCallback(() => {
    setDisableButton(true);
    socket.emit("crash:cashout", () => {
      setDisableButton(false);
    });
  }, []);

  useEffect(() => {
    const cashoutSuccessListener = (data: any) => {
      setUserMultiplier(data.multiplier);
      setUserCashedOut(true);
      setDisableButton(false);
      sound.play("cashout");
      if (data.multiplier >= 5) coinRainEmitter.trigger(60);
      else if (data.multiplier >= 2) coinRainEmitter.trigger(30);
    };

    const gameStateListener = (nextState: any) => {
      setGameState(nextState);
    };

    const historyListener = (serverHistory: number[]) => {
      setHistory(serverHistory.map((cp) => ({ crashPoint: cp })).reverse());
    };

    const hashListener = (hash: string) => {
      setRoundHash(hash);
    };

    const revealListener = (payload: { serverSeed?: string }) => {
      if (payload?.serverSeed) setLastSeed(payload.serverSeed);
    };

    const startListener = (payload?: { startedAt?: number; growth?: number }) => {
      sound.play("launch");
      lastTickStep.current = 0;
      setMultiplier(1.0);
      setCrashPoint(null);
      setLastSeed(null);
      setGameStarted(true);
      setGameEnded(false);
      setUserCashedOut(false);
      setUserMultiplier(0);
      setCountDown(0);
      startRafLoop(0, payload?.growth ?? DEFAULT_GROWTH);
    };

    const resultListener = (crashPointValue: number) => {
      stopRaf();
      roundOriginPerfRef.current = null;
      sound.play("explode");

      setCrashPoint(crashPointValue);
      setMultiplier(crashPointValue);
      setGameStarted(false);
      setUserGambled(false);
      setGameEnded(true);
      setCountDown(11.5);
    };

    // Lightweight periodic server sync (~1.8s) gently corrects any local clock drift
    const multiplierSyncListener = (serverMultiplier: number) => {
      if (roundOriginPerfRef.current === null) return;
      const g = growthRef.current || DEFAULT_GROWTH;
      if (serverMultiplier > 1) {
        const expectedElapsedMs = (Math.log(serverMultiplier) / g) * 1000;
        const currentElapsedMs = performance.now() - roundOriginPerfRef.current;
        if (Math.abs(expectedElapsedMs - currentElapsedMs) > 120) {
          roundOriginPerfRef.current = performance.now() - expectedElapsedMs;
        }
      }
    };

    // Immediate sync when opening /crash mid-round or mid-countdown
    const syncListener = (sync: {
      running: boolean;
      elapsedMs: number;
      multiplier: number;
      nextRoundInMs: number;
      growth?: number;
    }) => {
      if (sync.running) {
        setCrashPoint(null);
        setGameStarted(true);
        setGameEnded(false);
        setCountDown(0);
        setMultiplier(sync.multiplier || 1.0);
        lastTickStep.current = Math.floor((sync.multiplier || 1.0) * 4);
        startRafLoop(sync.elapsedMs || 0, sync.growth ?? DEFAULT_GROWTH);
      } else {
        stopRaf();
        roundOriginPerfRef.current = null;
        setGameStarted(false);
        setGameEnded(true);
        setMultiplier(1.0);
        setCountDown(Math.max(0, (sync.nextRoundInMs || 0) / 1000));
      }
    };

    socket.on("crash:cashoutSuccess", cashoutSuccessListener);
    socket.on("crash:gameState", gameStateListener);
    socket.on("crash:history", historyListener);
    socket.on("crash:hash", hashListener);
    socket.on("crash:reveal", revealListener);
    socket.on("crash:start", startListener);
    socket.on("crash:result", resultListener);
    socket.on("crash:multiplier", multiplierSyncListener);
    socket.on("crash:sync", syncListener);

    // Ask server for immediate state in case socket was already connected before visiting /crash
    socket.emit("crash:requestSync");

    return () => {
      socket.off("crash:cashoutSuccess", cashoutSuccessListener);
      socket.off("crash:gameState", gameStateListener);
      socket.off("crash:history", historyListener);
      socket.off("crash:hash", hashListener);
      socket.off("crash:reveal", revealListener);
      socket.off("crash:start", startListener);
      socket.off("crash:result", resultListener);
      socket.off("crash:multiplier", multiplierSyncListener);
      socket.off("crash:sync", syncListener);
    };
  }, [startRafLoop, stopRaf]);

  // Countdown beeps for the last 3 seconds
  const lastBeep = useRef<number | null>(null);
  useEffect(() => {
    if (gameStarted || countDown <= 0) {
      lastBeep.current = null;
      return;
    }
    const whole = Math.ceil(countDown);
    if (whole <= 3 && whole !== lastBeep.current) {
      lastBeep.current = whole;
      sound.play("countdown");
    }
  }, [countDown, gameStarted]);

  // Smooth countdown timer with cleanup
  useEffect(() => {
    if (countDown > 0.1 && !gameStarted) {
      const timerId = setTimeout(() => {
        setCountDown((prev) => Math.max(0, prev - 0.1));
      }, 100);
      return () => clearTimeout(timerId);
    }
  }, [countDown, gameStarted]);

  const copyValue = (key: string, val: string) => {
    navigator.clipboard?.writeText(val).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  // Only feed live ticking multiplier into SideMenu when the user can actually cash out
  const sideMenuMultiplier = gameStarted && userGambled && !userCashedOut ? multiplier : 1.0;

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 px-2 sm:px-4 pb-12 -mt-2">
      {/* Main Colosseum Crash Container */}
      <div className="w-full max-w-[1140px] flex flex-col rounded-[1.75rem] overflow-hidden border-2 border-[#d4af37]/45 bg-gradient-to-b from-[#1e1811] via-[#14100b] to-[#0d0a08] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,233,168,0.12)]">
        {/* Imperial Top Marquee Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-[#21190e] via-[#2c2112] to-[#21190e] border-b border-[#d4af37]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#ffe9a8] to-[#8a6b18] p-[1.5px] shadow-[0_0_12px_rgba(212,175,55,0.45)]">
              <div className="w-full h-full rounded-full bg-[#171108] flex items-center justify-center">
                <FaCrown className="text-[#ffd966] text-xs" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] gold-text">
                Crixus Crash
              </h1>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#9b8d6f] font-semibold">
                {es ? "Carruaje del Coliseo · Provably Fair" : "Colosseum Chariot · Provably Fair"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Provably fair hash quick-copy pill */}
            {roundHash && (
              <button
                type="button"
                onClick={() => copyValue("hash", roundHash)}
                title={roundHash}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0e0b08] border border-[#d4af37]/30 hover:border-[#ffd966] text-[10px] font-mono text-[#b9a77a] transition-colors"
              >
                <FaShieldAlt className="text-[#d4af37]" />
                <span>Hash: {roundHash.slice(0, 8)}…</span>
                {copiedKey === "hash" ? <FaCheck className="text-emerald-400" /> : <FaCopy className="text-[#d4af37]" />}
              </button>
            )}

            {/* Live Status Pill */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${
                gameStarted
                  ? "bg-[#0e261b]/85 border-emerald-400/50 text-emerald-300"
                  : crashPoint !== null && countDown > 9.2
                    ? "bg-[#3a1216]/85 border-[#e63946]/60 text-[#ff9ea5]"
                    : "bg-[#2a200e]/85 border-[#d4af37]/55 text-[#ffe9a8]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  gameStarted
                    ? "bg-emerald-400 animate-ping"
                    : crashPoint !== null && countDown > 9.2
                      ? "bg-[#ff4d5a]"
                      : "bg-[#ffd966] animate-pulse"
                }`}
              />
              {gameStarted ? (
                <span>{es ? "En vuelo" : "Flying"}</span>
              ) : crashPoint !== null && countDown > 9.2 ? (
                <span className="font-mono tabular-nums">
                  {t("games.crashed")} · {crashPoint.toFixed(2)}x
                </span>
              ) : (
                <span className="font-mono tabular-nums">
                  {es ? "Apuestas" : "Bets"} · {countDown.toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body: Mobile puts flying Chariot ON TOP, controls right below within thumb reach */}
        <div className="flex flex-col-reverse lg:flex-row relative">
          <SideMenu
            bet={bet}
            setBet={setBet}
            autoCashout={autoCashout}
            setAutoCashout={setAutoCashout}
            gameStarted={gameStarted}
            handleBet={handleBet}
            handleCashout={handleCashout}
            isLogged={isLogged}
            userGambled={userGambled}
            userCashedOut={userCashedOut}
            userData={userData}
            userMultiplier={userMultiplier}
            liveMultiplier={sideMenuMultiplier}
            disableButton={disableButton}
          />
          <GameContainer
            crashPoint={crashPoint}
            multiplier={multiplier}
            gameEnded={gameEnded}
            countDown={countDown}
            history={history}
            userCashedOut={userCashedOut}
            userMultiplier={userMultiplier}
          />
        </div>

        {/* Revealed Provably Fair Seed Strip */}
        {lastSeed && (
          <div className="px-4 sm:px-5 py-2 bg-[#0b0907] border-t border-[#d4af37]/15 flex items-center justify-between gap-2 text-[11px] font-mono text-[#9b8d6f]">
            <span className="truncate">
              <span className="text-[#d4af37] font-bold">Seed: </span>
              {lastSeed}
            </span>
            <button
              type="button"
              onClick={() => copyValue("seed", lastSeed)}
              className="text-[#d4af37] hover:text-[#ffe9a8] shrink-0 p-1"
              title="Copiar seed"
            >
              {copiedKey === "seed" ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
            </button>
          </div>
        )}
      </div>

      <LiveBets gameState={gameState} currentUserId={userData?.id} />
    </div>
  );
};

export default CrashGame;

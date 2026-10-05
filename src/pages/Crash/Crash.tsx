import { useContext, useEffect, useRef, useState } from "react";
import SocketConnection from "../../services/socket"
import UserContext from "../../UserContext";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
// Removed svg imports
import LiveBets from "./LiveBets";
import GameContainer from "./GameContainer";
import SideMenu from "./SideMenu";

const socket = SocketConnection.getInstance();

interface GameHistory {
  crashPoint: number;
}

const CrashGame = () => {
  const [bet, setBet] = useState<number | null>(null);
  const [autoCashout, setAutoCashout] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(null as number | null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [gameStarted, setGameStarted] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [countDown, setCountDown] = useState(0);
  const [userGambled, setUserGambled] = useState(false);
  const [userMultiplier, setUserMultiplier] = useState(0);
  
  const [userCashedOut, setUserCashedOut] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [gameState, setGameState] = useState<any>({
    gameBets: {},
    gamePlayers: {},
    crashPoint: 1.0,
    gameStartTime: null,
  });

  // Bug 2 fix: use refs to avoid stale closures in socket listeners
  const multiplierRef = useRef(multiplier);
  const userCashedOutRef = useRef(userCashedOut);

  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

  useEffect(() => {
    userCashedOutRef.current = userCashedOut;
  }, [userCashedOut]);

  // last 0.25x step that played a tick sound
  const lastTickStep = useRef(0);

  const { isLogged, toogleUserData, userData, toogleUserFlow } = useContext(UserContext);

  const handleBet = () => {
    if (!isLogged) {
      // Bug 4 fix: pass true to open the login modal
      toogleUserFlow(true);
      return;
    }

    if (bet === null || bet < 1) return;
    setUserGambled(true);
    sound.play("chip");

    socket.emit("crash:bet", { bet, autoCashout: autoCashout && autoCashout >= 1.01 ? autoCashout : null });
    setUserCashedOut(false);
  };

  const handleCashout = () => {
    setDisableButton(true); // Disable the button immediately

    socket.emit("crash:cashout", () => {
      setDisableButton(false); // Re-enable the button after the server responds
    });
  };

  useEffect(() => {
    const cashoutSuccessListener = (data: any) => {
      setUserMultiplier(data.multiplier);
      setUserCashedOut(true);
      setDisableButton(false); // Ensure the button is enabled after a successful cashout
      sound.play("cashout");
      if (data.multiplier >= 5) coinRainEmitter.trigger(60);
      else if (data.multiplier >= 2) coinRainEmitter.trigger(30);
    };

    socket.on("crash:cashoutSuccess", cashoutSuccessListener);

    return () => {
      socket.off("crash:cashoutSuccess", cashoutSuccessListener);
    };
  }, [userData, toogleUserData]);

  useEffect(() => {
    const gameStateListener = (gameState: any) => {
      setGameState(gameState);
    };

    socket.on("crash:gameState", gameStateListener);

    return () => {
      socket.off("crash:gameState", gameStateListener);
    };
  }, []);

  // Bug 2 fix: stable listeners — no more re-registering on every multiplier tick
  useEffect(() => {
    const startListener = () => {
      sound.play("launch");
      lastTickStep.current = 0;
      
      setMultiplier(1.0);
      setCrashPoint(null);
      setGameStarted(true);
      setGameEnded(false);
      setUserCashedOut(false);
      setUserMultiplier(0);
      setCountDown(0); // Reset the countdown
    };

    let timeoutId: ReturnType<typeof setTimeout>;

    const resultListener = (crashPointValue: number) => {
      sound.play("explode");
      
      setCrashPoint(crashPointValue);

      setGameStarted(false);
      setUserGambled(false);

      // Bug 2 fix: read latest values from refs instead of stale closure
      if (!userCashedOutRef.current && multiplierRef.current >= crashPointValue) {
        // The user did not cash out in time and lost their bet
        setMultiplier(crashPointValue);
      }

      setGameEnded(true);
      setCountDown(10.7);

      
    };

    socket.on("crash:start", startListener);
    socket.on("crash:result", resultListener);

    return () => {
      // Clean up listeners when the component is unmounted
      socket.off("crash:start", startListener);
      socket.off("crash:result", resultListener);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Bug 2 fix: empty deps — listeners are stable

  useEffect(() => {
    const historyListener = (serverHistory: number[]) => {
      // server sends newest-first; GameContainer renders the tail as newest
      setHistory(serverHistory.map((crashPoint) => ({ crashPoint })).reverse());
    };

    socket.on("crash:history", historyListener);

    return () => {
      socket.off("crash:history", historyListener);
    };
  }, []);

  useEffect(() => {
    const multiplierListener = (multiplier: number) => {
      setMultiplier(multiplier);
      const step = Math.floor(multiplier * 4);
      if (step > lastTickStep.current) {
        lastTickStep.current = step;
        sound.play("tick", multiplier);
      }
    };

    socket.on("crash:multiplier", multiplierListener);

    return () => {
      socket.off("crash:multiplier", multiplierListener);
    };
  }, []);

  // countdown beeps for the last 3 seconds
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

  // Bug 3 fix: countdown with proper cleanup
  useEffect(() => {
    if (countDown > 0.1 && !gameStarted) {
      const timerId = setTimeout(() => {
        setCountDown((prev) => {
          const next = prev - 0.1;
          return next < 0 ? 0 : next;
        });
      }, 100);

      return () => clearTimeout(timerId);
    }
  }, [countDown, gameStarted]);

  return (
    <div className="w-screen flex flex-col items-center justify-center gap-12 mt-4 px-4">
      <div className="flex bg-gradient-to-br from-[#1c1813] to-[#0a0807] rounded-3xl flex-col lg:flex-row shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-gray-800/80 overflow-hidden relative">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(255,255,255,0.02)] rounded-3xl" />
        <SideMenu bet={bet} setBet={setBet} autoCashout={autoCashout} setAutoCashout={setAutoCashout}
         gameStarted={gameStarted} handleBet={handleBet} handleCashout={handleCashout}
         isLogged={isLogged} userGambled={userGambled} userCashedOut={userCashedOut} userData={userData} userMultiplier={userMultiplier} disableButton={disableButton}/>
        <GameContainer
          crashPoint={crashPoint}
          multiplier={multiplier}
          gameEnded={gameEnded}
          countDown={countDown}
          history={history}
          userCashedOut={userCashedOut}
          userMultiplier={userMultiplier} />
      </div>
      <LiveBets gameState={gameState} />
    </div >
  );
};

export default CrashGame;

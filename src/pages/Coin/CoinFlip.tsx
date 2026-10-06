import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SocketConnection from "../../services/socket"
import Coin, { CARA_IMG, CRUZ_IMG } from "./Coin"
import { motion } from "framer-motion";
import UserContext from "../../UserContext";
import LiveBets from "./LiveBets";
import sound from "../../services/sound";

const socket = SocketConnection.getInstance();

interface GameHistory {
  result: number;
}

const CoinFlip = () => {
  const { t } = useTranslation();
  const [bet, setBet] = useState(0);
  const [_betAux, setBetAux] = useState(0);
  const [choice, setChoice] = useState(null as number | null);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [countDown, setCountDown] = useState(0);
  const [userGambled, setUserGambled] = useState(false);
  const [gameState, setGameState] = useState<any>({
    heads: {
      players: {},
      bets: {},
      choices: {},
    },
    tails: {
      players: {},
      bets: {},
      choices: {},
    }
  });
  const { isLogged, userData, toogleUserFlow } = useContext(UserContext);

  const handleBet = () => {
    if (!isLogged) {
      toogleUserFlow();
      return;
    }


    socket.emit("coinFlip:bet", bet, choice);
    sound.play("chip");

    setUserGambled(true);
    setBetAux(bet);
  };

  useEffect(() => {
    const startListener = () => {
      sound.play("flip");
      setResult(null);
      setSpinning(true); // Start spinning when the game starts
      setCountDown(0); // Reset the countdown
      setGameEnded(false); // The game has started
    };

    const resultListener = (result: number) => {
      setResult(result);
      setSpinning(false);
      if (userGambled && choice === result) {
        setTimeout(() => sound.play("win"), 600);
      }

      //wait 1 second before adding the result to the history
      setTimeout(() => {
        setHistory((prevHistory) => [...prevHistory, { result }]);
        setGameEnded(true);
        setCountDown(7.4);
        setGameState({
          heads: {
            players: {},
            bets: {},
            choices: {},
          },
          tails: {
            players: {},
            bets: {},
            choices: {},
          }
        });
      }, 1200);

      setUserGambled(false);
    };

    socket.on("coinFlip:start", startListener);
    socket.on("coinFlip:result", resultListener);

    return () => {
      // Clean up listeners when the component is unmounted
      socket.off("coinFlip:start", startListener);
      socket.off("coinFlip:result", resultListener);
    };
  }, [choice, bet, userGambled]);

  useEffect(() => {
    const gameStateListener = (gameState: any) => {
      setGameState(gameState);

    };

    socket.on("coinFlip:gameState", gameStateListener);


    return () => {
      socket.off("coinFlip:gameState", gameStateListener);
    };
  }, []);


  useEffect(() => {
    if (countDown > 0.1 && !spinning) {
      setTimeout(() => {
        setCountDown(countDown - 0.1);
      }, 100);
    }
  }, [countDown]);

  const sides = [
    { id: 0, label: t("games.heads"), img: CARA_IMG, ring: "ring-[#c0262d]", glow: "shadow-[0_0_25px_rgba(192,38,45,0.55)]", border: "border-[#c0262d]" },
    { id: 1, label: t("games.tails"), img: CRUZ_IMG, ring: "ring-[#ffd966]", glow: "shadow-[0_0_25px_rgba(255,217,102,0.5)]", border: "border-[#d4af37]" },
  ];

  const maxAllowed = Math.min(userData?.walletBalance ?? 1000000, 1000000);
  const quickBets: { label: string; apply: (b: number) => number }[] = [
    { label: "½", apply: (b) => Math.floor(b / 2) },
    { label: "x2", apply: (b) => b * 2 },
    { label: "+10", apply: (b) => b + 10 },
    { label: "+100", apply: (b) => b + 100 },
    { label: "MAX", apply: () => Math.floor(maxAllowed) },
  ];

  const betDisabled =
    choice === null || bet === 0 || userGambled || (userData !== null && userData.walletBalance < bet) || spinning || bet > 1000000;

  const showResult = result !== null && !spinning;
  const resultSide = sides.find((s) => s.id === result);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-8 px-3 pb-10">
      <div className="w-full max-w-[1180px] flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-[#d4af37]/30 bg-gradient-to-b from-[#1c1813] to-[#100d0a] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]">
        {/* ---------- bet panel ---------- */}
        <div className="lg:w-[340px] flex flex-col gap-5 p-5 border-b lg:border-b-0 lg:border-r border-[#d4af37]/20">
          <div className="flex flex-col gap-2">
            <label htmlFor="coinflip-bet" className="text-xs uppercase tracking-widest text-[#b9a77a] font-bold">{t("games.bet")}</label>
            <div className="flex items-center rounded-xl border border-[#d4af37]/30 bg-black/40 focus-within:border-[#ffd966] transition-colors">
              <span className="pl-3 text-[#25D160] font-bold">$</span>
              <input
                id="coinflip-bet"
                type="number"
                value={bet}
                onKeyDown={(event) => {
                  if (!/[0-9]/.test(event.key) && event.key !== "Backspace") {
                    event.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setBet(value < 0 ? 0 : value);
                }}
                className="w-full bg-transparent p-3 text-white font-bold text-lg outline-none"
              />
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {quickBets.map((q) => (
                <button
                  key={q.label}
                  id={`coinflip-quick-${q.label}`}
                  type="button"
                  onClick={() => setBet((b) => Math.max(0, Math.min(1000000, q.apply(b))))}
                  className="py-1.5 rounded-lg text-xs font-bold bg-[#2a231a] text-[#e7ddc8] border border-[#d4af37]/15 hover:border-[#d4af37]/60 hover:text-white transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-[#b9a77a] font-bold">{t("games.chooseSide")}</span>
            <div className="grid grid-cols-2 gap-3">
              {sides.map((s) => {
                const selected = choice === s.id;
                return (
                  <button
                    key={s.id}
                    id={`coinflip-side-${s.id === 0 ? "heads" : "tails"}`}
                    type="button"
                    onClick={() => setChoice(s.id)}
                    aria-pressed={selected}
                    className={`group relative flex flex-col items-center gap-2 rounded-xl p-3 border-2 transition-all duration-200 ${selected ? `${s.border} bg-black/50 ${s.glow} -translate-y-0.5` : "border-white/5 bg-black/25 hover:border-white/20"}`}
                  >
                    <img
                      src={s.img}
                      alt={s.label}
                      className={`w-16 h-16 rounded-full transition-transform duration-300 ${selected ? "scale-110" : "group-hover:scale-105 opacity-80 group-hover:opacity-100"}`}
                    />
                    <span className="font-black uppercase tracking-wider text-white text-sm">{s.label}</span>
                    <span className="text-[10px] font-bold text-[#25D160]">{t("games.paysX2")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            id="coinflip-enter"
            onClick={handleBet}
            disabled={betDisabled}
            className="mt-auto w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-black bg-gradient-to-r from-[#b8901f] via-[#ffd966] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {
              spinning ? t("games.spinning")
                : choice === null ? t("games.chooseSide")
                  : bet === 0 ? t("games.placeBetValue")
                    : bet > 1000000 ? t("games.maxBet")
                      : userGambled ? t("games.youreIn")
                        : userData !== null && userData.walletBalance < bet ? t("games.notEnough")
                          : t("games.enterGame")
            }
          </button>
        </div>

        {/* ---------- arena ---------- */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="coin-arena relative flex items-center justify-center h-[300px] sm:h-[380px] overflow-hidden" style={{ perspective: "1200px" }}>
            {gameEnded && (
              <div className="absolute top-0 left-0 right-0 z-20">
                <div className="h-1 bg-black/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#b8901f] to-[#ffd966] transition-[width] duration-100 ease-linear"
                    style={{ width: `${Math.max(0, Math.min(100, (countDown / 7.4) * 100))}%` }}
                  />
                </div>
                <div className="p-3 text-xs font-bold text-[#e7ddc8]">
                  {t("games.nextGameIn")} <span className="text-[#ffd966]">{countDown.toFixed(1)}s</span>
                </div>
              </div>
            )}

            <div className="coin-pedestal-ring" />
            <div className={`coin-pedestal transition-transform duration-300 ${spinning ? "scale-75 opacity-70" : ""}`} />

            <div className="relative z-10 -mt-6">
              <Coin spinning={spinning} result={result} />
            </div>

            {showResult && resultSide && (
              <div
                key={history.length}
                className={`coin-result-pop absolute bottom-4 left-1/2 z-20 px-6 py-2 rounded-full border-2 bg-black/70 backdrop-blur ${resultSide.border} ${resultSide.glow}`}
              >
                <span className="font-black uppercase tracking-widest text-white text-sm sm:text-base">
                  {t("games.landedOn", { side: resultSide.label })}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 p-4 border-t border-[#d4af37]/20">
            <h3 className="text-xs uppercase tracking-widest text-[#b9a77a] font-bold">{t("games.lastResults")}</h3>
            <div className="flex items-center gap-2 justify-end w-full overflow-hidden h-[30px]">
              {history.slice(-20).map((e, i, arr) => (
                <motion.img
                  key={history.length - arr.length + i}
                  src={e.result === 0 ? CARA_IMG : CRUZ_IMG}
                  alt={e.result === 0 ? t("games.heads") : t("games.tails")}
                  title={e.result === 0 ? t("games.heads") : t("games.tails")}
                  className={`w-[28px] h-[28px] min-w-[28px] rounded-full ring-2 ${e.result === 0 ? "ring-[#c0262d]" : "ring-[#d4af37]"}`}
                  initial={i === arr.length - 1 ? { opacity: 0, x: 30, scale: 0.6 } : false}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ ease: "easeOut", duration: 0.8 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1180px] grid grid-cols-1 md:grid-cols-2 gap-6">
        {gameState &&
          ["Heads", "Tails"].map((e, i) => (
            <LiveBets gameState={gameState} type={e} key={i} />
          ))
        }
      </div>
    </div>
  );
};

export default CoinFlip;


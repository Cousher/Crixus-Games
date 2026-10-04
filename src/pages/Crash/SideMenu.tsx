import { User } from '../../components/Types';
import { useTranslation } from "react-i18next";

interface SideMenuProps {
    bet: number | null;
    setBet: any;
    autoCashout: number | null;
    setAutoCashout: any;
    gameStarted: boolean;
    handleBet: any;
    handleCashout: any;
    isLogged: boolean;
    userGambled: boolean;
    userCashedOut: boolean;
    userData: User;
    userMultiplier: number;
    disableButton: boolean;
}

const SideMenu: React.FC<SideMenuProps> = ({ bet, setBet, autoCashout, setAutoCashout, gameStarted, handleBet, handleCashout, isLogged, userGambled, userCashedOut, userData, userMultiplier, disableButton }) => {
  const { t } = useTranslation();

    const renderMessage = () => {
      let message = "";
  
      if (!isLogged) {
        message = t("games.signInToPlay");
      } else if (userCashedOut) {
        message = `${t("games.cashedOutAt")} x${userMultiplier.toFixed(2)}`;
      } else if (userGambled) {
        message = gameStarted ? t("games.cashOut") : t("games.youreIn");
      } else if (gameStarted) {
        message = t("games.waitNextRound");
      } else if (bet === 0 || !bet || bet < 1) {
        message = t("games.placeBetValue");
      } else if (bet > 10000) {
        message = `${t("games.maxBet")} (10,000)`;
      } else if (userData.walletBalance < (bet ?? 0)) {
        message = t("games.notEnough");
      } else {
        message = t("games.placeBet");
      }
      return message;
    }
  
    return (
      <div className="lg:w-[340px] flex flex-col items-center gap-6 border-b lg:border-b-0 lg:border-r border-gray-800/80 p-6 bg-[#0a0807]/40 z-10">
        
        {/* Bet Input */}
        <div className="w-full flex flex-col gap-2 relative">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("games.betAmount")}</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="text-[#ECA823] font-black">$</span>
            </div>
            <input
              type="number"
              value={bet || ""}
              onKeyDown={(event) => {
                if (!/[0-9]/.test(event.key) && event.key !== "Backspace") {
                  event.preventDefault();
                }
              }}
              max={10000}
              onChange={(e) => {
                const value = Number(e.target.value);
                setBet(value < 0 ? 0 : value);
              }}
              className="w-full bg-[#1c1813] border-2 border-gray-800/60 rounded-xl py-3 pl-8 pr-4 text-white font-bold text-lg focus:outline-none focus:border-[#ECA823]/50 transition-colors shadow-inner"
              placeholder="0"
            />
            {/* Quick action buttons overlay */}
            <div className="absolute inset-y-0 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button data-no-sfx onClick={() => setBet((bet || 0) / 2)} className="bg-gray-800 hover:bg-gray-700 text-xs px-2 py-1 rounded font-bold text-gray-300">1/2</button>
               <button data-no-sfx onClick={() => setBet((bet || 0) * 2)} className="bg-gray-800 hover:bg-gray-700 text-xs px-2 py-1 rounded font-bold text-gray-300">2x</button>
            </div>
          </div>
        </div>

        {/* Auto Cashout Input */}
        <div className="w-full flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("games.autoCashout")}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="text-emerald-400 font-black">x</span>
            </div>
            <input
              type="number"
              step="0.01"
              min={1.01}
              max={1000}
              placeholder="2.00"
              value={autoCashout || ""}
              disabled={userGambled}
              onChange={(e) => {
                const value = Number(e.target.value);
                setAutoCashout(value <= 0 ? null : value);
              }}
              className="w-full bg-[#1c1813] border-2 border-gray-800/60 rounded-xl py-3 pl-8 pr-4 text-white font-bold text-lg focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner disabled:opacity-50"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={gameStarted ? handleCashout : handleBet}
          className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all mt-2 relative overflow-hidden shadow-lg ${
            (gameStarted && (!userGambled || userCashedOut)) || (!gameStarted && userGambled) || (!gameStarted && (bet === 0 || !bet || bet > 10000)) || disableButton
              ? "bg-gray-800 text-gray-500 border-2 border-gray-700 cursor-not-allowed"
              : gameStarted && userGambled && !userCashedOut
                ? "bg-emerald-500 hover:bg-emerald-400 text-white border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]"
                : "bg-amber-500 hover:bg-amber-400 text-white border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
          }`}
          disabled={
            (gameStarted && (!userGambled || userCashedOut)) ||
            (!gameStarted && userGambled) ||
            (!gameStarted && (bet === 0 || !bet || bet > 10000)) ||
            disableButton
          }
        >
          {renderMessage()}
        </button>
      </div>
    );
  }
  
  export default SideMenu;
  

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
        message = "Sign in to play";
      } else if (userCashedOut) {
        message = `${t("games.cashedOutAt")} x${userMultiplier.toFixed(2)}`;
      } else if (userGambled) {
        message = gameStarted ? t("games.cashOut") : t("games.youreIn");
      } else if (gameStarted) {
        message = t("games.waitNextRound");
      } else if (bet === 0 || !bet || bet < 1) {
        message = t("games.placeBetValue");
      } else if (bet > 1000000) {
        message = t("games.maxBet");
      } else if (userData.walletBalance < (bet ?? 0)) {
        message = t("games.notEnough");
      } else {
        message = t("games.placeBet");
      }
      return message;
    }
  
    return (
      <div className="lg:w-[340px] flex flex-col items-center gap-4 border-r border-gray-700 py-4 px-6">
        <input
          type="number"
          value={bet || ""}
          onKeyDown={(event) => {
            if (!/[0-9]/.test(event.key) && event.key !== "Backspace") {
              event.preventDefault();
            }
          }}
          max={1000000}
          onChange={(e) => {
            const value = Number(e.target.value);
            setBet(value < 0 ? 0 : value);
          }}
          className="p-2 border rounded w-1/2 lg:w-full"
        />
        <div className="w-1/2 lg:w-full flex flex-col gap-1">
          <label className="text-xs text-gray-400">Auto cash out (x)</label>
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
            className="p-2 border rounded w-full"
          />
        </div>
        <button
          onClick={gameStarted ? handleCashout : handleBet}
          className="p-2 border rounded bg-amber-600 hover:bg-amber-700 w-full mt-4"
          disabled={
            (gameStarted && (!userGambled || userCashedOut)) ||
            (!gameStarted && userGambled) || (!gameStarted && bet === 0 || !bet || bet > 1000000) || disableButton
          }
        >
          {renderMessage()}
        </button>
      </div>
    );
  }
  
  export default SideMenu;
  

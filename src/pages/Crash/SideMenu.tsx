import React from "react";
import { User } from "../../components/Types";
import { useTranslation } from "react-i18next";
import { FaCoins, FaBolt } from "react-icons/fa";
import Monetary from "../../components/Monetary";
import sound from "../../services/sound";

const MIN_BET = 1;
const MAX_BET = 10000;
const AUTO_PRESETS: { label: string; value: number | null }[] = [
    { label: "1.5x", value: 1.5 },
    { label: "2x", value: 2 },
    { label: "5x", value: 5 },
    { label: "10x", value: 10 },
    { label: "Off", value: null },
];

interface SideMenuProps {
    bet: number | null;
    setBet: (v: number | null) => void;
    autoCashout: number | null;
    setAutoCashout: (v: number | null) => void;
    gameStarted: boolean;
    handleBet: () => void;
    handleCashout: () => void;
    isLogged: boolean;
    userGambled: boolean;
    userCashedOut: boolean;
    userData: User | null;
    userMultiplier: number;
    liveMultiplier: number;
    disableButton: boolean;
}

const SideMenu: React.FC<SideMenuProps> = React.memo(
    ({
        bet,
        setBet,
        autoCashout,
        setAutoCashout,
        gameStarted,
        handleBet,
        handleCashout,
        isLogged,
        userGambled,
        userCashedOut,
        userData,
        userMultiplier,
        liveMultiplier,
        disableButton,
    }) => {
        const { t } = useTranslation();

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

        const canCashoutNow = gameStarted && userGambled && !userCashedOut && !disableButton;
        const isDisabled =
            (gameStarted && (!userGambled || userCashedOut)) ||
            (!gameStarted && userGambled) ||
            (!gameStarted && isLogged && (cleanBet < MIN_BET || cleanBet > MAX_BET || userBalance < cleanBet)) ||
            disableButton;

        const livePayout = cleanBet * liveMultiplier;

        const renderMessage = () => {
            if (!isLogged) return t("games.signInToPlay");
            if (userCashedOut) return `${t("games.cashedOutAt")} ${userMultiplier.toFixed(2)}x`;
            if (userGambled) {
                if (gameStarted) {
                    return (
                        <span className="font-mono tabular-nums">
                            {t("games.cashOut")} · <Monetary value={livePayout} showFraction /> (
                            {liveMultiplier.toFixed(2)}x)
                        </span>
                    );
                }
                return t("games.youreIn");
            }
            if (gameStarted) return t("games.waitNextRound");
            if (cleanBet < MIN_BET) return t("games.placeBetValue");
            if (cleanBet > MAX_BET) return `${t("games.maxBet")} (10,000)`;
            if (userBalance < cleanBet) return t("games.notEnough");
            return `${t("games.placeBet")} · $${cleanBet.toLocaleString("en-US")}`;
        };

        return (
            <div className="lg:w-[340px] shrink-0 flex flex-col gap-5 border-t lg:border-t-0 lg:border-r border-[#d4af37]/20 p-4 sm:p-5 bg-[#120e09]/85 z-10">
                {/* Bet Input */}
                <div className="w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="crash-bet"
                            className="text-[11px] font-bold text-[#b9a77a] uppercase tracking-[0.2em] flex items-center gap-1.5"
                        >
                            <FaCoins className="text-[#d4af37] text-xs" />
                            {t("games.bet")}
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
                            id="crash-bet"
                            type="number"
                            min={MIN_BET}
                            max={MAX_BET}
                            value={bet || ""}
                            disabled={userGambled}
                            onKeyDown={(event) => {
                                if (
                                    !/[0-9]/.test(event.key) &&
                                    !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(event.key)
                                ) {
                                    event.preventDefault();
                                }
                            }}
                            onChange={(e) => {
                                const value = Math.floor(Number(e.target.value));
                                setBet(!Number.isFinite(value) || value <= 0 ? 0 : Math.min(MAX_BET, value));
                            }}
                            className="w-full bg-transparent py-3 px-2.5 text-white font-mono tabular-nums font-black text-lg outline-none disabled:opacity-55"
                            placeholder="10"
                        />
                    </div>

                    {/* Always-visible Quick Chips (mobile friendly) */}
                    <div className="grid grid-cols-5 gap-1.5">
                        {quickBets.map((q) => (
                            <button
                                key={q.label}
                                type="button"
                                data-no-sfx
                                disabled={userGambled}
                                onClick={() => {
                                    sound.play("chip");
                                    setBet(Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(q.apply(cleanBet)))));
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

                {/* Auto Cashout Input + Presets */}
                <div className="w-full flex flex-col gap-2">
                    <label
                        htmlFor="crash-autocashout"
                        className="text-[11px] font-bold text-[#b9a77a] uppercase tracking-[0.2em] flex items-center gap-1.5"
                    >
                        <FaBolt className="text-emerald-400 text-xs" />
                        {t("games.autoCashout")}
                    </label>
                    <div className="flex items-center rounded-xl border-2 border-[#3e3219] bg-[#090806] focus-within:border-emerald-400/70 transition-all">
                        <span className="pl-3.5 text-emerald-400 font-black text-base">x</span>
                        <input
                            id="crash-autocashout"
                            type="number"
                            step="0.1"
                            min={1.01}
                            max={1000}
                            placeholder="2.00"
                            value={autoCashout || ""}
                            disabled={userGambled}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                setAutoCashout(!Number.isFinite(value) || value <= 0 ? null : Math.min(1000, value));
                            }}
                            className="w-full bg-transparent py-2.5 px-2.5 text-white font-mono tabular-nums font-black text-base outline-none disabled:opacity-55"
                        />
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                        {AUTO_PRESETS.map((p) => {
                            const active = autoCashout === p.value;
                            return (
                                <button
                                    key={p.label}
                                    type="button"
                                    data-no-sfx
                                    disabled={userGambled}
                                    onClick={() => {
                                        sound.play("chip");
                                        setAutoCashout(p.value);
                                    }}
                                    className={`py-1.5 rounded-lg text-xs font-black font-mono transition-all border disabled:opacity-40 ${
                                        active
                                            ? "bg-emerald-900/70 text-emerald-200 border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                                            : "bg-[#1a150e] text-[#c8bba0] border-[#3a2f1d] hover:border-emerald-500/50 hover:text-white"
                                    }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Action Button */}
                <button
                    type="button"
                    onClick={gameStarted ? handleCashout : handleBet}
                    disabled={isDisabled}
                    className={`w-full py-3.5 sm:py-4 px-4 rounded-xl font-black text-sm sm:text-base uppercase tracking-[0.14em] transition-all mt-auto relative overflow-hidden border active:scale-[0.98] ${
                        isDisabled
                            ? "bg-[#1c1710] text-[#7a6f59] border-[#332a1b] cursor-not-allowed"
                            : canCashoutNow
                                ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#051a10] border-emerald-200/70 shadow-[0_0_28px_rgba(16,185,129,0.5)] animate-pulse"
                                : "bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#1a1204] border-[#fff2c2]/60 shadow-[0_8px_24px_rgba(212,175,55,0.35)]"
                    }`}
                >
                    {renderMessage()}
                </button>
            </div>
        );
    }
);

SideMenu.displayName = "SideMenu";

export default SideMenu;

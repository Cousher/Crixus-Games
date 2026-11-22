import React from "react";
import { useTranslation } from "react-i18next";
import Monetary from "../../components/Monetary";

interface PaytableProps {
    betAmount: number;
    onClose?: () => void;
    isModal?: boolean;
}

const SYMBOLS = [
    { key: "wild", img: "/images/slot/wild.webp", es: "León Dorado", en: "Golden Lion", mult: 100, wild: true },
    { key: "yellow", img: "/images/slot/green.webp", es: "Áureo de César", en: "Caesar's Gold", mult: 25 },
    { key: "hakkero", img: "/images/slot/hakkero.webp", es: "Yelmo Imperial", en: "Imperial Helm", mult: 12 },
    { key: "yin_yang", img: "/images/slot/yin.webp", es: "Espadas Gladius", en: "Gladius Blades", mult: 8 },
    { key: "green", img: "/images/slot/lily.webp", es: "Esmeralda", en: "Emerald", mult: 3 },
    { key: "blue", img: "/images/slot/shangai.webp", es: "Zafiro", en: "Sapphire", mult: 1 },
    { key: "red", img: "/images/slot/red.webp", es: "Rubí", en: "Ruby", mult: 0.5 },
];

const PAYLINES_PREVIEW = [
    { num: 1, cells: [0, 1, 2] },
    { num: 2, cells: [3, 4, 5] },
    { num: 3, cells: [6, 7, 8] },
    { num: 4, cells: [0, 4, 8] },
    { num: 5, cells: [2, 4, 6] },
];

const Paytable: React.FC<PaytableProps> = ({ betAmount, onClose, isModal = false }) => {
    const { i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");
    const safeBet = Math.max(1, Math.floor(Number(betAmount) || 1));

    const content = (
        <div className="w-full bg-gradient-to-b from-[#211b11] via-[#16120b] to-[#0f0c08] rounded-2xl border border-[#d4af37]/40 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,233,168,0.12)] p-4 flex flex-col gap-3.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] gold-text">
                        {es ? "Tabla de Pagos" : "Paytable"}
                    </h3>
                    <p className="text-[11px] text-[#9b8d6f] mt-0.5">
                        {es ? "3 en línea · Premio según tu apuesta" : "3 in a row · Payout at current bet"}
                    </p>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-[#2a2114] border border-[#d4af37]/40 text-[#ffe9a8] hover:bg-[#3c2f1b] flex items-center justify-center text-sm font-bold"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Symbols list */}
            <div className="flex flex-col gap-1.5">
                {SYMBOLS.map((sym) => {
                    const payout = sym.mult * safeBet;
                    return (
                        <div
                            key={sym.key}
                            className={`flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl border transition-colors ${
                                sym.wild
                                    ? "bg-gradient-to-r from-[#3a2b10]/70 via-[#2a1f0b]/60 to-[#1a1409]/70 border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                                    : "bg-[#0d0b08]/80 border-[#d4af37]/15 hover:border-[#d4af37]/35"
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                    src={sym.img}
                                    alt={es ? sym.es : sym.en}
                                    className="w-9 h-9 rounded-lg object-cover ring-1 ring-[#d4af37]/40 shrink-0"
                                    loading="lazy"
                                />
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-[#f3ead6] truncate">
                                            {es ? sym.es : sym.en}
                                        </span>
                                        {sym.wild && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-[#d4af37] text-[#1a1204]">
                                                WILD
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-[#9b8d6f] font-mono tabular-nums">
                                        <Monetary value={payout} showFraction={payout % 1 !== 0} />
                                    </span>
                                </div>
                            </div>
                            <span
                                className={`font-mono tabular-nums font-black text-sm shrink-0 ${
                                    sym.wild
                                        ? "text-[#ffe9a8] drop-shadow-[0_0_8px_rgba(255,217,102,0.5)]"
                                        : sym.mult >= 8
                                            ? "text-[#e6ca6a]"
                                            : "text-[#b9a77a]"
                                }`}
                            >
                                {sym.mult}x
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Wild note */}
            <div className="rounded-xl bg-[#120e08] border border-[#d4af37]/25 px-3 py-2 text-[11px] leading-snug text-[#c8bba0]">
                <span className="text-[#ffd966] font-bold">{es ? "Comodín (WILD): " : "Wild: "}</span>
                {es
                    ? "El León Dorado reemplaza a cualquier símbolo. 3 leones pagan 100x (hasta 500x en tablero completo)."
                    : "The Golden Lion substitutes for any symbol. 3 lions pay 100x (up to 500x full board)."}
            </div>

            {/* 5 Paylines mini visual diagram */}
            <div className="border-t border-[#d4af37]/20 pt-2.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8d6f] mb-2">
                    {es ? "5 Líneas Ganadoras (se suman)" : "5 Winning Paylines (cumulative)"}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                    {PAYLINES_PREVIEW.map((pl) => (
                        <div
                            key={pl.num}
                            className="flex flex-col items-center gap-1 bg-[#0b0907] rounded-lg p-1.5 border border-[#d4af37]/20"
                        >
                            <div className="grid grid-cols-3 gap-[2px] w-7 h-7">
                                {Array.from({ length: 9 }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`rounded-[2px] ${
                                            pl.cells.includes(idx)
                                                ? "bg-[#ffd966] shadow-[0_0_4px_rgba(255,217,102,0.8)]"
                                                : "bg-[#2a2315]"
                                        }`}
                                    />
                                ))}
                            </div>
                            <span className="text-[9px] font-bold text-[#b89531]">#{pl.num}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (isModal) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <div
                    className="w-full max-w-[380px] max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {content}
                </div>
            </div>
        );
    }

    return content;
};

export default Paytable;

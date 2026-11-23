import React from "react";
import { useTranslation } from "react-i18next";
import Monetary from "../../components/Monetary";
import { PAYLINES, SLOT_SYMBOLS } from "./slotConfig";

interface PaytableProps {
  betAmount: number;
  winningSymbols?: Set<string>;
  hoveredPayline?: string | null;
  onHoverPayline?: (lineId: string | null) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const Paytable: React.FC<PaytableProps> = ({
  betAmount,
  winningSymbols,
  hoveredPayline = null,
  onHoverPayline,
  onClose,
  isModal = false,
}) => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const safeBet = Math.max(1, Math.floor(Number(betAmount) || 1));

  const content = (
    <div className="w-full bg-gradient-to-b from-[#1e170e]/95 via-[#141009]/95 to-[#0d0a06]/95 backdrop-blur-md rounded-2xl border border-[#d4af37]/45 shadow-[0_20px_50px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,233,168,0.14)] p-4 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-2.5">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] gold-text">
            {es ? "Tabla de Pagos" : "Paytable"}
          </h3>
          <p className="text-[11px] text-[#a59574] mt-0.5">
            {es ? "3 en línea · Premio según apuesta actual" : "3 of a kind · Payout at current bet"}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#2a2114] border border-[#d4af37]/45 text-[#ffe9a8] hover:bg-[#3c2f1b] flex items-center justify-center text-sm font-bold cursor-pointer"
            aria-label={es ? "Cerrar" : "Close"}
          >
            ✕
          </button>
        )}
      </div>

      {/* Symbols list with live winning highlight */}
      <div className="flex flex-col gap-1.5">
        {SLOT_SYMBOLS.map((sym) => {
          const payout = sym.mult * safeBet;
          const isWinner = Boolean(winningSymbols?.has(sym.key));
          return (
            <div
              key={sym.key}
              className={`flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all duration-300 ${
                isWinner
                  ? "bg-gradient-to-r from-[#4b3610]/90 via-[#32230a]/90 to-[#1f1607]/90 border-[#ffe9a8] shadow-[0_0_18px_rgba(255,215,0,0.38)] scale-[1.02]"
                  : sym.wild
                  ? "bg-gradient-to-r from-[#3a2b10]/70 via-[#2a1f0b]/60 to-[#1a1409]/70 border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                  : "bg-[#0d0b08]/85 border-[#d4af37]/18 hover:border-[#d4af37]/40"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={sym.img}
                  alt={es ? sym.es : sym.en}
                  className={`w-9 h-9 rounded-lg object-cover shrink-0 ${
                    isWinner
                      ? "ring-2 ring-[#fff2c2]"
                      : "ring-1 ring-[#d4af37]/45"
                  }`}
                  loading="lazy"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#f5ecd9] truncate">
                      {es ? sym.es : sym.en}
                    </span>
                    {sym.wild && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-gradient-to-b from-[#ffe999] to-[#c4921e] text-[#1a1204]">
                        WILD
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#a59574] font-mono tabular-nums">
                    <Monetary value={payout} showFraction={payout % 1 !== 0} />
                  </span>
                </div>
              </div>
              <span
                className={`font-mono tabular-nums font-black text-sm shrink-0 ${
                  isWinner
                    ? "text-[#fff7d6] drop-shadow-[0_0_10px_rgba(255,217,102,0.9)]"
                    : sym.wild
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

      {/* Wild & Anticipation Feature Note */}
      <div className="rounded-xl bg-[#110d07]/90 border border-[#d4af37]/28 px-3 py-2 text-[11px] leading-snug text-[#cec0a4]">
        <span className="text-[#ffd966] font-black">{es ? "Comodín León: " : "Lion Wild: "}</span>
        {es
          ? "Reemplaza cualquier símbolo. 3 leones pagan 100x (hasta 500x en tablero completo)."
          : "Substitutes any symbol. 3 lions pay 100x (up to 500x full board)."}
      </div>

      {/* Interactive 5 Paylines Visual Diagram */}
      <div className="border-t border-[#d4af37]/20 pt-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9b8d6f]">
            {es ? "5 Líneas (pasá el mouse)" : "5 Paylines (hover)"}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-[#d4af37]/80 font-bold">
            {es ? "Se suman" : "Cumulative"}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PAYLINES.map((pl) => {
            const active = hoveredPayline === pl.id;
            return (
              <button
                key={pl.id}
                type="button"
                data-no-sfx
                onMouseEnter={() => onHoverPayline?.(pl.id)}
                onMouseLeave={() => onHoverPayline?.(null)}
                onFocus={() => onHoverPayline?.(pl.id)}
                onBlur={() => onHoverPayline?.(null)}
                onClick={() => onHoverPayline?.(active ? null : pl.id)}
                className={`flex flex-col items-center gap-1 rounded-lg p-1.5 border transition-all cursor-pointer ${
                  active
                    ? "bg-[#2a1f0b] border-[#ffe9a8] shadow-[0_0_12px_rgba(255,217,102,0.5)] scale-105"
                    : "bg-[#0b0907] border-[#d4af37]/22 hover:border-[#d4af37]/65"
                }`}
              >
                <div className="grid grid-cols-3 gap-[2px] w-7 h-7">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-[2px] ${
                        pl.cells.includes(idx)
                          ? "bg-[#ffd966] shadow-[0_0_5px_rgba(255,217,102,0.85)]"
                          : "bg-[#2a2315]"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-[9px] font-black ${active ? "text-[#fff3c4]" : "text-[#b89531]"}`}>
                  #{pl.num}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[390px] max-h-[90vh] overflow-y-auto"
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

import { useTranslation } from "react-i18next";
import Monetary from "./Monetary";

interface CaseProps {
  id: string;
  title: string;
  image: string;
  price: number;
}

const Case: React.FC<CaseProps> = ({ id, title, image, price }) => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  return (
    <div
      key={id}
      className="group relative flex flex-col w-full items-center rounded-2xl transition-all duration-300 cursor-pointer bg-gradient-to-b from-[#211a11] via-[#15110c] to-[#0c0907] border border-[#d4af37]/35 hover:border-[#ffd966] shadow-[0_14px_35px_rgba(0,0,0,0.65)] hover:shadow-[0_18px_42px_rgba(212,175,55,0.22),inset_0_0_24px_rgba(212,175,55,0.08)] hover:-translate-y-1.5 overflow-hidden"
    >
      {/* Top golden hairline */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Sweep shine */}
      <span className="game-card-shine" aria-hidden="true" />

      {/* Pedestal Showcase */}
      <div className="relative w-full flex justify-center items-center h-36 sm:h-48 md:h-52 pt-4 px-4">
        <div className="absolute bottom-4 w-28 h-7 bg-[#d4af37] blur-2xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 rounded-full pointer-events-none" />
        <img
          loading="lazy"
          decoding="async"
          src={image}
          alt={title}
          className="w-28 h-28 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain rounded-xl z-10 drop-shadow-[0_14px_18px_rgba(0,0,0,0.85)] group-hover:scale-105 group-hover:drop-shadow-[0_18px_24px_rgba(212,175,55,0.35)] transition-all duration-400"
        />
      </div>

      {/* Info Footer */}
      <div className="flex flex-col w-full px-3 sm:px-4 pb-4 pt-3 items-center relative z-10 border-t border-[#d4af37]/20 bg-[#0d0a07]/85">
        <span className="font-black text-sm sm:text-base md:text-lg text-[#f3ead6] uppercase tracking-[0.14em] group-hover:text-[#ffe9a8] transition-colors text-center truncate max-w-full">
          {title}
        </span>

        <div className="mt-2.5 flex items-center justify-center gap-2">
          <span className="font-mono tabular-nums font-black text-sm sm:text-base text-[#ffe9a8] bg-gradient-to-b from-[#2e230d] to-[#1a1306] px-4 py-1 rounded-full border border-[#d4af37]/55 shadow-[inset_0_1px_2px_rgba(255,233,168,0.2)] group-hover:border-[#ffd966] transition-all">
            <Monetary value={price} />
          </span>
        </div>

        <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8d6f] group-hover:text-[#ffd966] transition-colors">
          {es ? "Abrir cofre →" : "Open chest →"}
        </span>
      </div>
    </div>
  );
};

export default Case;

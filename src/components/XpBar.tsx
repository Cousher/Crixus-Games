import { useTranslation } from "react-i18next";
import { levelProgress, xpToNext } from "../utils/levels";

interface XpBarProps {
  xp: number;
  level: number;
  compact?: boolean;
}

/** Always-visible progress towards the next level (goal-gradient effect). */
const XpBar: React.FC<XpBarProps> = ({ xp, level, compact }) => {
  const { t } = useTranslation();
  if (!Number.isFinite(xp) || !Number.isFinite(level)) return null;
  const pct = Math.round(levelProgress(xp, level) * 100);
  const remaining = xpToNext(xp, level);

  return (
    <div
      className={`flex flex-col gap-1 ${compact ? "w-20" : "w-32"}`}
      title={t("ux.xpToNext", { xp: remaining.toLocaleString(), level: level + 1 })}
    >
      <div className="flex justify-between text-[10px] leading-none text-[#b9a77a] font-semibold tracking-wide">
        <span>LVL {level}</span>
        <span className="text-[#e0b341]">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#2a251c] overflow-hidden">
        <div
          className="xp-fill h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
};

export default XpBar;

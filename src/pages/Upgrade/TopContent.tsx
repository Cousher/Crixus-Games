import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineClose } from "react-icons/ai";
import { GiAnvilImpact, GiUpgrade } from "react-icons/gi";
import { FaBolt, FaCrown, FaFire } from "react-icons/fa";
import { toast } from "react-toastify";
import ClockPointer from "./ClockPointer";
import { upgradeItem } from "../../services/games/GamesServices";
import Rarities from "../../components/Rarities";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";

// 100% synced with backend/games/upgrade.js & Items.tsx
const RARITY_CAPS: Record<string, number> = {
  "1": 0.8,
  "2": 0.7,
  "3": 0.6,
  "4": 0.5,
  "5": 0.45,
};

const FORGE_BG = "/images/upgrade/forge_foundry_bg.webp";

const FORGE_EMBERS = [
  { id: 0, left: "7%", delay: 0.0, dur: 4.1 },
  { id: 1, left: "13%", delay: 1.3, dur: 3.6 },
  { id: 2, left: "20%", delay: 0.6, dur: 4.5 },
  { id: 3, left: "80%", delay: 0.3, dur: 4.0 },
  { id: 4, left: "87%", delay: 1.7, dur: 3.5 },
  { id: 5, left: "93%", delay: 0.9, dur: 4.4 },
];

interface ForgeHistoryEntry {
  id: number;
  success: boolean;
  name: string;
  ratePct: number;
}

interface Props {
  selectedItems: any[];
  setSelectedItems: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedCase: React.Dispatch<React.SetStateAction<string | null>>;
  selectedTarget: any;
  setSelectedTarget: React.Dispatch<React.SetStateAction<any>>;
  successRate: number;
  finished: boolean;
  setFinished: React.Dispatch<React.SetStateAction<boolean>>;
  toggleReload: boolean;
  setToggleReload: React.Dispatch<React.SetStateAction<boolean>>;
  spinning: boolean;
  setSpinning: React.Dispatch<React.SetStateAction<boolean>>;
}

const OfferEmblemSVG = () => (
  <svg
    viewBox="0 0 160 160"
    className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 drop-shadow-[0_10px_25px_rgba(236,168,35,0.3)]"
  >
    <defs>
      <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE999" />
        <stop offset="50%" stopColor="#C48718" />
        <stop offset="100%" stopColor="#593602" />
      </linearGradient>
      <radialGradient id="pedestalGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(236, 168, 35, 0.28)" />
        <stop offset="100%" stopColor="rgba(236, 168, 35, 0)" />
      </radialGradient>
    </defs>
    <circle cx="80" cy="80" r="70" fill="url(#pedestalGlow)" />
    <circle
      cx="80"
      cy="80"
      r="60"
      fill="none"
      stroke="url(#bronzeGrad)"
      strokeWidth="1.5"
      strokeDasharray="6 4"
      opacity="0.55"
    />
    <g
      opacity="0.88"
      stroke="url(#bronzeGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M 38 122 L 118 42 M 108 38 L 122 38 L 122 52" />
      <path d="M 122 122 L 42 42 M 52 38 L 38 38 L 38 52" />
    </g>
    <path
      d="M 55 48 C 70 42, 90 42, 105 48 L 105 92 C 105 110, 80 124, 80 124 C 80 124, 55 110, 55 92 Z"
      fill="#16110b"
      stroke="url(#bronzeGrad)"
      strokeWidth="2.5"
    />
    <circle cx="80" cy="84" r="10" fill="url(#bronzeGrad)" opacity="0.92" />
    <path
      d="M 65 68 L 80 76 L 95 68 M 65 100 L 80 92 L 95 100"
      stroke="url(#bronzeGrad)"
      strokeWidth="1.8"
      fill="none"
      opacity="0.72"
    />
  </svg>
);

const TargetEmblemSVG = () => (
  <svg
    viewBox="0 0 160 160"
    className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 drop-shadow-[0_10px_25px_rgba(236,168,35,0.4)]"
  >
    <defs>
      <linearGradient id="imperialGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF7D6" />
        <stop offset="45%" stopColor="#F5B027" />
        <stop offset="100%" stopColor="#8A5A10" />
      </linearGradient>
      <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(236, 168, 35, 0.34)" />
        <stop offset="100%" stopColor="rgba(236, 168, 35, 0)" />
      </radialGradient>
    </defs>
    <circle cx="80" cy="80" r="72" fill="url(#targetGlow)" />
    <path
      d="M 52 78 L 80 52 L 108 78"
      fill="none"
      stroke="url(#imperialGold)"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.48"
    />
    <path
      d="M 46 62 L 80 32 L 114 62"
      fill="none"
      stroke="url(#imperialGold)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.85"
    />
    <polygon points="80,22 87,46 84,104 76,104 73,46" fill="url(#imperialGold)" />
    <rect x="64" y="104" width="32" height="6" rx="3" fill="url(#imperialGold)" />
    <rect
      x="76"
      y="110"
      width="8"
      height="16"
      rx="2"
      fill="#8A5A10"
      stroke="url(#imperialGold)"
      strokeWidth="1"
    />
    <circle cx="80" cy="130" r="6" fill="url(#imperialGold)" />
    <path
      d="M 70 134 C 42 126, 30 96, 38 66"
      fill="none"
      stroke="url(#imperialGold)"
      strokeWidth="2.2"
      strokeDasharray="5 3"
      opacity="0.78"
    />
    <path
      d="M 90 134 C 118 126, 130 96, 122 66"
      fill="none"
      stroke="url(#imperialGold)"
      strokeWidth="2.2"
      strokeDasharray="5 3"
      opacity="0.78"
    />
  </svg>
);

const TopContent: React.FC<Props> = ({
  selectedItems,
  setSelectedItems,
  selectedTarget,
  setSelectedTarget,
  successRate,
  finished,
  setFinished,
  setToggleReload,
  toggleReload,
  setSelectedCase,
  spinning,
  setSpinning,
}) => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const [loadingUpgrade, setLoadingUpgrade] = useState<boolean>(false);
  const [stopAngle, setStopAngle] = useState(0);
  const [success, setSuccess] = useState(false);
  const [wonItem, setWonItem] = useState<any>(null);
  const [turbo, setTurbo] = useState<boolean>(false);
  const [forgeShakeSeq, setForgeShakeSeq] = useState<number>(0);
  const [forgeHistory, setForgeHistory] = useState<ForgeHistoryEntry[]>([]);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spinDuration = turbo ? 2800 : 5200;

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  // Reset spear needle to 12 o'clock when changing items before spinning
  useEffect(() => {
    if (!spinning && !finished) {
      setStopAngle(0);
    }
  }, [selectedItems, selectedTarget, spinning, finished]);

  const targetCap = selectedTarget ? RARITY_CAPS[String(selectedTarget.rarity)] : null;
  const isAtCap = Boolean(targetCap && successRate >= targetCap - 0.0001);
  const hasInvalidRarity =
    Boolean(selectedTarget) &&
    selectedItems.some((e) => Number(e.item?.rarity) > Number(selectedTarget.rarity));
  const canForge =
    !loadingUpgrade &&
    !spinning &&
    selectedItems.length >= 1 &&
    Boolean(selectedTarget) &&
    !hasInvalidRarity;

  const handleUpgrade = useCallback(async () => {
    if (!canForge) return;

    setLoadingUpgrade(true);
    setFinished(false);
    setSuccess(false);
    setWonItem(null);

    const payload = {
      selectedItemIds: selectedItems.map((item) => item.identifier),
      targetItemId: selectedTarget._id,
    };
    const targetSnapshot = selectedTarget;
    const rateSnapshot = successRate;

    try {
      const response = await upgradeItem(payload.selectedItemIds, payload.targetItemId);
      sound.play("forgeHammer");
      setTimeout(() => sound.play("spin"), 160);
      setSpinning(true);

      // Pad stop angle cleanly away from exact boundary so outcome is unmistakable
      const winArc = Math.max(0.01, Math.min(0.99, rateSnapshot)) * 360;
      const loseArc = 360 - winArc;
      if (response.success) {
        const pad = Math.min(4.5, winArc * 0.16);
        setStopAngle(pad + Math.random() * Math.max(0.5, winArc - pad * 2));
      } else {
        const pad = Math.min(4.5, loseArc * 0.16);
        setStopAngle(winArc + pad + Math.random() * Math.max(0.5, loseArc - pad * 2));
      }
      setLoadingUpgrade(false);

      spinTimerRef.current = setTimeout(() => {
        setSpinning(false);
        setSelectedItems([]);
        setToggleReload(!toggleReload);
        setSuccess(response.success);
        setFinished(true);
        setForgeShakeSeq((s) => s + 1);

        const forgedRelic = response.item || targetSnapshot;
        setForgeHistory((prev) => [
          {
            id: Date.now() + Math.random(),
            success: Boolean(response.success),
            name: forgedRelic?.name || "Relic",
            ratePct: Math.round(rateSnapshot * 100),
          },
          ...prev.slice(0, 7),
        ]);

        if (response.success) {
          sound.play("forgeHammer");
          setTimeout(() => sound.play("bigWin"), 120);
          coinRainEmitter.trigger(80);
          setWonItem(forgedRelic);
          setSelectedCase(null);
          setSelectedTarget(null);
        } else {
          sound.play("boom");
        }
      }, spinDuration);
    } catch (err: any) {
      toast.error(translateApiMessage(err, t("toast.connError")), {
        theme: "dark",
      });
      setLoadingUpgrade(false);
      setSpinning(false);
    }
  }, [
    canForge,
    selectedItems,
    selectedTarget,
    setFinished,
    setSelectedCase,
    setSelectedItems,
    setSelectedTarget,
    setSpinning,
    setToggleReload,
    spinDuration,
    successRate,
    t,
    toggleReload,
  ]);

  // Spacebar shortcut to strike the anvil when ready
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (canForge) {
        e.preventDefault();
        handleUpgrade();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canForge, handleUpgrade]);

  const removeSingleOffer = (identifier: string) => {
    if (spinning) return;
    sound.play("chip");
    setSelectedItems((prev) => prev.filter((it) => it.identifier !== identifier));
  };

  const conduitColor = finished
    ? success
      ? "#34d399"
      : "#ef4444"
    : spinning
    ? "#fbbf24"
    : canForge
    ? "#d4af37"
    : "#4a3818";

  const renderPedestal = (items: any[], isTarget: boolean) => {
    const hasItems = items.length > 0;
    const single = items.length === 1;
    const primaryItem = single ? items[0].item || items[0] : null;
    const primaryColor = primaryItem
      ? Rarities.find((r) => String(r.id) === String(primaryItem.rarity))?.color || "#d4af37"
      : "#d4af37";

    return (
      <div
        className="flex flex-col items-center justify-between w-full lg:w-[305px] xl:w-[335px] min-h-[215px] sm:min-h-[265px] lg:h-[368px] p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#1e170e]/92 via-[#130e09]/94 to-[#0a0705]/95 backdrop-blur-md border-2 relative overflow-hidden group transition-all duration-300"
        style={{
          borderColor: hasItems ? `${primaryColor}85` : "rgba(212,175,55,0.34)",
          boxShadow: hasItems
            ? `0 20px 48px rgba(0,0,0,0.88), inset 0 0 38px ${primaryColor}22`
            : "0 20px 48px rgba(0,0,0,0.82)",
        }}
      >
        <div
          className="absolute top-0 inset-x-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${
              hasItems ? primaryColor : "#d4af37"
            }, transparent)`,
          }}
        />

        {/* Pedestal Header */}
        <div className="w-full flex items-center justify-between gap-2 z-10">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-[#ffe9a8] bg-black/60 border border-[#d4af37]/40 px-3 py-1 rounded-full">
            {isTarget
              ? t("upg.desiredRelic")
              : `${t("upg.yourOffer")}${items.length > 0 ? ` (${items.length}/20)` : ""}`}
          </span>
          {hasItems && !spinning && (
            <button
              type="button"
              onClick={() => {
                sound.play("chip");
                if (isTarget) setSelectedTarget(null);
                else setSelectedItems([]);
              }}
              title={t("games.clear")}
              className="p-1.5 rounded-full bg-black/60 hover:bg-red-500/25 text-[#b9a77a] hover:text-red-400 border border-[#3e3219] hover:border-red-500/50 transition-all cursor-pointer"
            >
              <AiOutlineClose className="text-sm" />
            </button>
          )}
        </div>

        {/* Pedestal Body */}
        {!hasItems ? (
          <>
            <div className="my-3 lg:my-auto flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
              {isTarget ? <TargetEmblemSVG /> : <OfferEmblemSVG />}
            </div>
            <span className="text-[#b5a485] text-xs sm:text-sm font-semibold text-center px-2 leading-snug">
              {isTarget ? t("upg.selectObtain") : t("upg.selectUpgrade")}
            </span>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full my-auto max-h-[210px] overflow-y-auto py-2 z-10">
              {items.map((entry, index) => {
                const it = entry.item || entry;
                const rarityObj = Rarities.find((r) => String(r.id) === String(it?.rarity));
                const rarityColor = rarityObj?.color || "#d4af37";
                const imgSize =
                  items.length === 1
                    ? "w-28 h-28 sm:w-36 sm:h-36"
                    : items.length <= 4
                    ? "w-16 h-16 sm:w-20 sm:h-20"
                    : "w-12 h-12 sm:w-14 sm:h-14";

                return (
                  <div
                    key={entry.identifier || it?._id || index}
                    onClick={() => !isTarget && removeSingleOffer(entry.identifier)}
                    title={
                      !isTarget && !spinning
                        ? es
                          ? "Clic para quitar"
                          : "Click to remove"
                        : it?.name
                    }
                    className={`flex flex-col items-center justify-center relative group/item ${
                      !isTarget && !spinning ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="relative">
                      <img
                        decoding="async"
                        src={it?.image}
                        alt={it?.name || "selected-item"}
                        className={`${imgSize} object-contain rounded-xl border bg-[#0c0907] p-1 shadow-lg transition-transform group-hover/item:scale-105`}
                        style={{
                          boxShadow: `0 6px 22px ${rarityColor}42`,
                          borderColor: `${rarityColor}90`,
                        }}
                      />
                      {!isTarget && !spinning && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow">
                          ✕
                        </span>
                      )}
                    </div>
                    {single && (
                      <div className="flex flex-col items-center mt-2 text-center">
                        <span className="text-sm font-black text-[#fff4dc] truncate max-w-[230px]">
                          {it?.name}
                        </span>
                        {rarityObj && (
                          <span
                            className="text-[10px] font-black uppercase tracking-widest mt-0.5"
                            style={{ color: rarityColor }}
                          >
                            {t("rarity." + rarityObj.id)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="w-full text-center text-[11px] text-[#a59574] font-semibold z-10">
              {isTarget && targetCap
                ? es
                  ? `Tope de probabilidad: ${Math.round(targetCap * 100)}%`
                  : `Max chance cap: ${Math.round(targetCap * 100)}%`
                : !isTarget
                ? es
                  ? "Tocá un ítem para quitarlo"
                  : "Tap an item to remove"
                : null}
            </div>
          </>
        )}
      </div>
    );
  };

  const wonRarityColor = wonItem
    ? Rarities.find((r) => String(r.id) === String(wonItem.rarity))?.color || "#34d399"
    : "#34d399";

  return (
    <motion.div
      key={`forge-stage-${forgeShakeSeq}`}
      animate={
        forgeShakeSeq > 0
          ? { x: [0, -6, 6, -4, 4, 0], y: [0, 3, -2, 0] }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.36 }}
      className="relative flex flex-col items-center w-full px-3 sm:px-6 py-5 sm:py-7 gap-5 overflow-hidden bg-[#0a0705]"
    >
      {/* Full-Bleed Painterly Imperial Blacksmith Foundry Backdrop */}
      <img
        src={FORGE_BG}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none opacity-80"
      />

      {/* Twin Animated Roaring Furnace Glows on Left & Right Hearths */}
      <div
        className="slot-brazier-flame absolute left-[4%] top-[52%] w-44 h-44 rounded-full pointer-events-none blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,145,35,0.48) 0%, rgba(220,75,10,0.18) 55%, transparent 76%)",
        }}
      />
      <div
        className="slot-brazier-flame absolute right-[4%] top-[52%] w-44 h-44 rounded-full pointer-events-none blur-2xl"
        style={{
          animationDelay: "0.28s",
          background:
            "radial-gradient(circle, rgba(255,145,35,0.48) 0%, rgba(220,75,10,0.18) 55%, transparent 76%)",
        }}
      />

      {/* Rising Molten Forge Sparks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {FORGE_EMBERS.map((e) => (
          <motion.span
            key={e.id}
            initial={{ y: 240, opacity: 0, scale: 0.5 }}
            animate={{
              y: [-10, -230],
              x: [0, e.id % 2 === 0 ? 15 : -15, 0],
              opacity: [0, 0.92, 0],
              scale: [0.5, 1.2, 0.3],
            }}
            transition={{
              duration: e.dur,
              delay: e.delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{ left: e.left, bottom: "10%" }}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#ffbe42] shadow-[0_0_8px_#f97316]"
          />
        ))}
      </div>

      {/* Dynamic Outcome & Readability Vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: finished
            ? success
              ? "radial-gradient(58% 60% at 50% 45%, rgba(16,185,129,0.2), rgba(7,5,4,0.74) 85%)"
              : "radial-gradient(58% 60% at 50% 45%, rgba(220,38,38,0.24), rgba(7,4,4,0.78) 85%)"
            : spinning
            ? "radial-gradient(58% 60% at 50% 45%, rgba(245,158,11,0.18), rgba(7,5,4,0.72) 85%)"
            : "radial-gradient(62% 62% at 50% 48%, rgba(12,9,6,0.3), rgba(6,4,3,0.78) 86%)",
        }}
      />

      {/* 3-Column Forge Stage with Animated Molten Energy Conduits (desktop) */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-7 w-full">
        {/* Horizontal SVG Molten Energy Conduit Bridge (desktop) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 120"
          preserveAspectRatio="none"
          className="hidden lg:block absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[78%] h-24 pointer-events-none z-0"
        >
          <line
            x1="0"
            y1="60"
            x2="1000"
            y2="60"
            stroke={conduitColor}
            strokeWidth={spinning ? "5" : "3"}
            strokeOpacity={spinning ? "0.35" : "0.18"}
          />
          <line
            x1="0"
            y1="60"
            x2="1000"
            y2="60"
            stroke={conduitColor}
            strokeWidth={spinning ? "2.6" : "1.8"}
            strokeDasharray="10 10"
            className={spinning || canForge ? "forge-conduit-flow" : ""}
            style={{ animationDuration: spinning ? "0.45s" : "1.6s" }}
          />
        </svg>

        <div className="hidden lg:flex relative z-10">{renderPedestal(selectedItems, false)}</div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-[540px] lg:hidden relative z-10">
          {renderPedestal(selectedItems, false)}
          {renderPedestal(selectedTarget ? [selectedTarget] : [], true)}
        </div>

        {/* Center Imperial Fortune Wheel + Anvil Forge Action Deck */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <ClockPointer
            successRate={successRate}
            spinning={spinning}
            success={success}
            stopAngle={stopAngle}
            finished={finished}
            totalDuration={spinDuration}
          />

          <div className="flex flex-col items-center gap-2 w-full max-w-[316px]">
            {hasInvalidRarity && (
              <span className="px-3 py-1 rounded-full bg-red-950/85 border border-red-500/50 text-xs font-bold text-red-300 text-center">
                {es ? "No podés mejorar a una rareza menor" : "Can't upgrade to a lesser rarity"}
              </span>
            )}
            {isAtCap && !hasInvalidRarity && (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#2e220a]/90 border border-[#ffd966]/55 text-[11px] font-black text-[#fff2c2] text-center">
                <FaFire className="text-amber-400" />
                {es
                  ? `Probabilidad máxima (${Math.round((targetCap || 0) * 100)}%)`
                  : `Max chance (${Math.round((targetCap || 0) * 100)}%)`}
              </span>
            )}

            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={!canForge}
                className={`flex-1 py-3.5 px-5 rounded-xl font-black uppercase tracking-[0.16em] text-sm sm:text-base transition-all border flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer ${
                  canForge
                    ? "bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#1a1204] border-[#fff4cc]/80 shadow-[0_10px_30px_rgba(245,175,35,0.48)]"
                    : "bg-[#1a140e]/90 text-[#7a6f59] border-[#332a1b] cursor-not-allowed"
                }`}
              >
                {loadingUpgrade || spinning ? (
                  <GiAnvilImpact className="text-lg animate-bounce" />
                ) : (
                  <GiUpgrade className="text-lg" />
                )}
                <span>
                  {spinning
                    ? t("games.spinning")
                    : loadingUpgrade
                    ? t("games.loading")
                    : t("games.upgrade")}
                </span>
              </button>

              {/* Turbo Forge Toggle */}
              <button
                type="button"
                disabled={spinning}
                data-no-sfx
                onClick={() => {
                  sound.play("chip");
                  setTurbo((v) => !v);
                }}
                title={es ? "Forja rápida" : "Turbo forge"}
                className={`h-[52px] px-3 rounded-xl border font-black text-xs flex flex-col items-center justify-center transition-all disabled:opacity-45 cursor-pointer ${
                  turbo
                    ? "bg-gradient-to-b from-[#d97706] to-[#92400e] border-[#fff2c2] text-[#fff8dc] shadow-[0_0_16px_rgba(245,158,11,0.5)]"
                    : "bg-[#15110b]/90 border-[#3e3219] text-[#a59574] hover:border-[#d4af37]/70 hover:text-[#ffe9a8]"
                }`}
              >
                <FaBolt className="text-sm" />
                <span className="text-[9px] uppercase tracking-wider mt-0.5 font-mono">
                  {turbo ? "2.8s" : "5.2s"}
                </span>
              </button>
            </div>

            {canForge && (
              <span className="hidden sm:inline text-[10px] text-[#9b8d6f] font-semibold">
                {es ? "Espacio = Golpear el yunque y forjar" : "Space = Strike anvil & forge"}
              </span>
            )}
          </div>
        </div>

        <div className="hidden lg:flex relative z-10">
          {renderPedestal(selectedTarget ? [selectedTarget] : [], true)}
        </div>
      </div>

      {/* Session Forge History Ribbon */}
      {forgeHistory.length > 0 && (
        <div className="relative z-10 flex items-center gap-1.5 max-w-full overflow-x-auto no-scrollbar px-2">
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-[#9b8d6f]">
            {es ? "Forjas:" : "Forges:"}
          </span>
          {forgeHistory.map((h) => (
            <span
              key={h.id}
              className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm ${
                h.success
                  ? "bg-emerald-950/85 border-emerald-400/60 text-emerald-200"
                  : "bg-[#2b1014]/85 border-red-500/45 text-red-300"
              }`}
            >
              {h.success ? "✓" : "✕"} {h.name} · {h.ratePct}%
            </span>
          ))}
        </div>
      )}

      {/* Celebratory Forged Relic Showcase Banner */}
      <AnimatePresence>
        {finished && success && wonItem && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative z-20 w-full max-w-[540px] rounded-2xl bg-gradient-to-r from-[#11281b]/95 via-[#1a3c27]/95 to-[#11281b]/95 backdrop-blur-md border-2 p-4 flex items-center justify-between gap-3 overflow-hidden"
            style={{
              borderColor: wonRarityColor,
              boxShadow: `0 0 40px ${wonRarityColor}55`,
            }}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <motion.img
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                src={wonItem.image}
                alt={wonItem.name}
                className="w-16 h-16 rounded-xl object-contain bg-black/55 p-1.5 border shrink-0 shadow-lg"
                style={{ borderColor: wonRarityColor }}
              />
              <div className="flex flex-col min-w-0">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  <FaCrown className="text-[#ffd966]" />
                  {t("games.upgradeSuccess")}
                </span>
                <span className="text-sm sm:text-base font-black text-white truncate">
                  {wonItem.name}
                </span>
                <span className="text-[11px] text-emerald-200/85">
                  {es ? "Reliquia forjada y guardada en tu inventario" : "Forged relic added to your inventory"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWonItem(null)}
              className="p-2 rounded-full bg-black/45 text-emerald-200 hover:text-white shrink-0 cursor-pointer"
            >
              <AiOutlineClose />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TopContent;

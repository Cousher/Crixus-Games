import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineClose } from "react-icons/ai";
import { GiUpgrade, GiAnvilImpact } from "react-icons/gi";
import { FaBolt, FaCrown } from "react-icons/fa";
import { toast } from "react-toastify";
import ClockPointer from "./ClockPointer";
import { upgradeItem } from "../../services/games/GamesServices";
import Rarities from "../../components/Rarities";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { translateApiMessage } from "../../services/apiMessageI18n";

const RARITY_CAPS: Record<string, number> = {
    "1": 0.8,
    "2": 0.7,
    "3": 0.6,
    "4": 0.45,
    "5": 0.2,
};

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
    <svg viewBox="0 0 160 160" className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 drop-shadow-[0_10px_25px_rgba(236,168,35,0.25)]">
        <defs>
            <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5C451" />
                <stop offset="50%" stopColor="#B87B14" />
                <stop offset="100%" stopColor="#593602" />
            </linearGradient>
            <radialGradient id="pedestalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(236, 168, 35, 0.25)" />
                <stop offset="100%" stopColor="rgba(236, 168, 35, 0)" />
            </radialGradient>
        </defs>
        <circle cx="80" cy="80" r="70" fill="url(#pedestalGlow)" />
        <circle cx="80" cy="80" r="60" fill="none" stroke="url(#bronzeGrad)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
        <g opacity="0.85" stroke="url(#bronzeGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M 38 122 L 118 42 M 108 38 L 122 38 L 122 52" />
            <path d="M 122 122 L 42 42 M 52 38 L 38 38 L 38 52" />
        </g>
        <path
            d="M 55 48 C 70 42, 90 42, 105 48 L 105 92 C 105 110, 80 124, 80 124 C 80 124, 55 110, 55 92 Z"
            fill="#16110b"
            stroke="url(#bronzeGrad)"
            strokeWidth="2.5"
        />
        <circle cx="80" cy="84" r="10" fill="url(#bronzeGrad)" opacity="0.9" />
        <path d="M 65 68 L 80 76 L 95 68 M 65 100 L 80 92 L 95 100" stroke="url(#bronzeGrad)" strokeWidth="1.8" fill="none" opacity="0.7" />
    </svg>
);

const TargetEmblemSVG = () => (
    <svg viewBox="0 0 160 160" className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 drop-shadow-[0_10px_25px_rgba(236,168,35,0.35)]">
        <defs>
            <linearGradient id="imperialGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF6D6" />
                <stop offset="45%" stopColor="#ECA823" />
                <stop offset="100%" stopColor="#8A5A10" />
            </linearGradient>
            <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(236, 168, 35, 0.32)" />
                <stop offset="100%" stopColor="rgba(236, 168, 35, 0)" />
            </radialGradient>
        </defs>
        <circle cx="80" cy="80" r="72" fill="url(#targetGlow)" />
        <path d="M 52 78 L 80 52 L 108 78" fill="none" stroke="url(#imperialGold)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
        <path d="M 46 62 L 80 32 L 114 62" fill="none" stroke="url(#imperialGold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        <polygon points="80,22 87,46 84,104 76,104 73,46" fill="url(#imperialGold)" />
        <rect x="64" y="104" width="32" height="6" rx="3" fill="url(#imperialGold)" />
        <rect x="76" y="110" width="8" height="16" rx="2" fill="#8A5A10" stroke="url(#imperialGold)" strokeWidth="1" />
        <circle cx="80" cy="130" r="6" fill="url(#imperialGold)" />
        <path d="M 70 134 C 42 126, 30 96, 38 66" fill="none" stroke="url(#imperialGold)" strokeWidth="2.2" strokeDasharray="5 3" opacity="0.75" />
        <path d="M 90 134 C 118 126, 130 96, 122 66" fill="none" stroke="url(#imperialGold)" strokeWidth="2.2" strokeDasharray="5 3" opacity="0.75" />
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
    const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const spinDuration = turbo ? 3200 : 5500;

    useEffect(() => {
        return () => {
            if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
        };
    }, []);

    // Reset needle to 12 o'clock when changing items before spinning
    useEffect(() => {
        if (!spinning && !finished) {
            setStopAngle(0);
        }
    }, [selectedItems, selectedTarget, spinning, finished]);

    const handleUpgrade = async () => {
        if (loadingUpgrade || spinning || selectedItems.length < 1 || !selectedTarget) return;

        setLoadingUpgrade(true);
        setFinished(false);
        setSuccess(false);
        setWonItem(null);

        const payload = {
            selectedItemIds: selectedItems.map((item) => item.identifier),
            targetItemId: selectedTarget._id,
        };
        const targetSnapshot = selectedTarget;

        try {
            const response = await upgradeItem(payload.selectedItemIds, payload.targetItemId);
            sound.play("spin");
            setSpinning(true);

            // Pad stop angle slightly away from the exact boundary so visual outcome is never ambiguous
            const winArc = Math.max(0.01, Math.min(0.99, successRate)) * 360;
            const loseArc = 360 - winArc;
            if (response.success) {
                const pad = Math.min(4, winArc * 0.15);
                setStopAngle(pad + Math.random() * Math.max(0.5, winArc - pad * 2));
            } else {
                const pad = Math.min(4, loseArc * 0.15);
                setStopAngle(winArc + pad + Math.random() * Math.max(0.5, loseArc - pad * 2));
            }
            setLoadingUpgrade(false);

            spinTimerRef.current = setTimeout(() => {
                setSpinning(false);
                setSelectedItems([]);
                setToggleReload(!toggleReload);
                setSuccess(response.success);
                setFinished(true);

                if (response.success) {
                    sound.play("bigWin");
                    coinRainEmitter.trigger(65);
                    setWonItem(response.item || targetSnapshot);
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
    };

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

    const removeSingleOffer = (identifier: string) => {
        if (spinning) return;
        sound.play("chip");
        setSelectedItems((prev) => prev.filter((it) => it.identifier !== identifier));
    };

    const renderPedestal = (items: any[], isTarget: boolean) => {
        const hasItems = items.length > 0;
        const single = items.length === 1;
        const primaryItem = single ? items[0].item || items[0] : null;
        const primaryColor = primaryItem
            ? Rarities.find((r) => String(r.id) === String(primaryItem.rarity))?.color || "#d4af37"
            : "#d4af37";

        return (
            <div
                className="flex flex-col items-center justify-between w-full lg:w-[310px] xl:w-[340px] min-h-[210px] sm:min-h-[260px] lg:h-[360px] p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#1f1911] via-[#14100b] to-[#0a0806] border-2 relative overflow-hidden group transition-all duration-300"
                style={{
                    borderColor: hasItems ? `${primaryColor}70` : "rgba(212,175,55,0.28)",
                    boxShadow: hasItems
                        ? `0 18px 45px rgba(0,0,0,0.85), inset 0 0 36px ${primaryColor}18`
                        : "0 18px 45px rgba(0,0,0,0.8)",
                }}
            >
                <div
                    className="absolute top-0 inset-x-0 h-[2px] pointer-events-none"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${hasItems ? primaryColor : "#d4af37"}, transparent)`,
                    }}
                />

                {/* Card Header */}
                <div className="w-full flex items-center justify-between gap-2 z-10">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#ffe9a8] bg-black/50 border border-[#d4af37]/35 px-3 py-1 rounded-full">
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
                            className="p-1.5 rounded-full bg-black/55 hover:bg-red-500/20 text-[#b9a77a] hover:text-red-400 border border-[#3e3219] hover:border-red-500/40 transition-all"
                        >
                            <AiOutlineClose className="text-sm" />
                        </button>
                    )}
                </div>

                {/* Card Body */}
                {!hasItems ? (
                    <>
                        <div className="my-3 lg:my-auto flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                            {isTarget ? <TargetEmblemSVG /> : <OfferEmblemSVG />}
                        </div>
                        <span className="text-[#a89b82] text-xs sm:text-sm font-semibold text-center px-2 leading-snug">
                            {isTarget ? t("upg.selectObtain") : t("upg.selectUpgrade")}
                        </span>
                    </>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full my-auto max-h-[205px] overflow-y-auto py-2 z-10">
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
                                        title={!isTarget && !spinning ? (es ? "Clic para quitar" : "Click to remove") : it?.name}
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
                                                    boxShadow: `0 6px 20px ${rarityColor}38`,
                                                    borderColor: `${rarityColor}85`,
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
                                                <span className="text-sm font-bold text-[#f5efe0] truncate max-w-[230px]">
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

                        {/* Bottom hint */}
                        <div className="w-full text-center text-[11px] text-[#9b8d6f] font-medium z-10">
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

    return (
        <div className="flex flex-col items-center w-full px-3 sm:px-6 py-4 sm:py-6 gap-5">
            {/* 3-column Forge Stage: Offer | Wheel | Target */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-8 w-full">
                {/* On mobile, place Offer + Target side-by-side above the wheel for compact thumb layout */}
                <div className="hidden lg:flex">{renderPedestal(selectedItems, false)}</div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-[540px] lg:hidden">
                    {renderPedestal(selectedItems, false)}
                    {renderPedestal(selectedTarget ? [selectedTarget] : [], true)}
                </div>

                {/* Center Wheel + Forge CTA */}
                <div className="flex flex-col items-center gap-4">
                    <ClockPointer
                        successRate={successRate}
                        spinning={spinning}
                        success={success}
                        stopAngle={stopAngle}
                        finished={finished}
                        totalDuration={spinDuration}
                    />

                    {/* Central Forge Action Bar */}
                    <div className="flex flex-col items-center gap-2 w-full max-w-[300px]">
                        {hasInvalidRarity && (
                            <span className="text-xs font-bold text-red-400 text-center">
                                {es ? "No podés mejorar a una rareza menor" : "Can't upgrade to a lesser rarity"}
                            </span>
                        )}
                        {isAtCap && !hasInvalidRarity && (
                            <span className="text-[11px] font-bold text-[#ffe9a8] text-center">
                                {es
                                    ? `¡Probabilidad máxima alcanzada (${Math.round((targetCap || 0) * 100)}%)!`
                                    : `Max chance reached (${Math.round((targetCap || 0) * 100)}%)!`}
                            </span>
                        )}

                        <div className="flex items-center gap-2 w-full">
                            <button
                                type="button"
                                onClick={handleUpgrade}
                                disabled={!canForge}
                                className={`flex-1 py-3.5 px-5 rounded-xl font-black uppercase tracking-[0.16em] text-sm sm:text-base transition-all border flex items-center justify-center gap-2 active:scale-[0.98] ${
                                    canForge
                                        ? "bg-gradient-to-r from-[#b8901f] via-[#ffe28a] to-[#b8901f] bg-[length:200%_100%] hover:bg-[position:100%_0] text-[#1a1204] border-[#fff2c2]/70 shadow-[0_8px_28px_rgba(212,175,55,0.4)]"
                                        : "bg-[#1c1710] text-[#7a6f59] border-[#332a1b] cursor-not-allowed"
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

                            {/* Turbo speed toggle */}
                            <button
                                type="button"
                                disabled={spinning}
                                onClick={() => {
                                    sound.play("chip");
                                    setTurbo((v) => !v);
                                }}
                                title={es ? "Modo rápido" : "Turbo speed"}
                                className={`h-[52px] px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center transition-all disabled:opacity-45 ${
                                    turbo
                                        ? "bg-[#2e220a] border-[#ffd966] text-[#ffe9a8] shadow-[0_0_14px_rgba(255,217,102,0.3)]"
                                        : "bg-[#15110b] border-[#3a2f1d] text-[#8a7f63] hover:border-[#d4af37]/60 hover:text-[#ffe9a8]"
                                }`}
                            >
                                <FaBolt className="text-sm" />
                                <span className="text-[9px] uppercase tracking-wider mt-0.5">
                                    {turbo ? "3s" : "5s"}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:flex">
                    {renderPedestal(selectedTarget ? [selectedTarget] : [], true)}
                </div>
            </div>

            {/* Celebratory Won Relic Banner */}
            <AnimatePresence>
                {finished && success && wonItem && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="w-full max-w-[520px] rounded-2xl bg-gradient-to-r from-[#13291b] via-[#1c3824] to-[#13291b] border-2 border-emerald-400/70 shadow-[0_0_35px_rgba(16,185,129,0.3)] p-3.5 sm:p-4 flex items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <img
                                src={wonItem.image}
                                alt={wonItem.name}
                                className="w-14 h-14 rounded-xl object-contain bg-black/50 p-1 border border-emerald-400/60 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                                    <FaCrown className="text-[#ffd966]" />
                                    {t("games.upgradeSuccess")}
                                </span>
                                <span className="text-sm sm:text-base font-bold text-white truncate">
                                    {wonItem.name}
                                </span>
                                <span className="text-[11px] text-emerald-200/80">
                                    {es ? "Agregado a tu inventario" : "Added to your inventory"}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWonItem(null)}
                            className="p-2 rounded-full bg-black/40 text-emerald-200 hover:text-white shrink-0"
                        >
                            <AiOutlineClose />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TopContent;

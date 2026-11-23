import React, { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FaDownload, FaShareAlt, FaTimes, FaWhatsapp } from "react-icons/fa";
import UserContext from "../UserContext";
import {
  buildWinShareText,
  renderWinCardBlob,
  renderWinCardToDataUrl,
  WinCardData,
} from "../utils/shareWinCanvas";
import { buildReferralLink } from "../utils/referral";

interface ShareWinButtonProps {
  gameName: string;
  multiplier: number;
  payout: number;
  compact?: boolean;
  className?: string;
}

const ShareWinButton: React.FC<ShareWinButtonProps> = ({
  gameName,
  multiplier,
  payout,
  compact = false,
  className = "",
}) => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const { userData } = useContext(UserContext);

  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [sharing, setSharing] = useState(false);

  const cardData: WinCardData = {
    gameName,
    multiplier,
    payout,
    username: userData?.username,
    level: userData?.level,
    isEs: es,
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = renderWinCardToDataUrl(cardData);
    setPreviewUrl(url);
    setOpen(true);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = previewUrl || renderWinCardToDataUrl(cardData);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `crixus-win-${multiplier.toFixed(2)}x.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(es ? "¡Tarjeta descargada! Subila a tus historias 🔥" : "Card downloaded! Share it on Stories 🔥", {
      theme: "dark",
      autoClose: 2500,
    });
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSharing(true);
    try {
      const text = buildWinShareText(cardData);
      const url = buildReferralLink(userData?.username);
      const blob = await renderWinCardBlob(cardData);

      if (blob && typeof navigator !== "undefined" && navigator.share) {
        const file = new File([blob], `crixus-win-${multiplier.toFixed(2)}x.png`, {
          type: "image/png",
        });
        const nav = navigator as Navigator & {
          canShare?: (data?: ShareData) => boolean;
        };
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Crixus Games", text });
          return;
        }
        await navigator.share({ title: "Crixus Games", text, url });
        return;
      }

      // Desktop fallback: open WhatsApp directly
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      // ignore user cancel
    } finally {
      setSharing(false);
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(buildWinShareText(cardData))}`;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-[#ffd966]/70 bg-gradient-to-r from-[#2c210b] via-[#3f2f0f] to-[#2c210b] hover:brightness-125 text-[#ffe9a8] font-black uppercase tracking-wider shadow-[0_0_16px_rgba(212,175,55,0.3)] transition-all cursor-pointer ${
          compact ? "px-3 py-1 text-[10px]" : "px-4 py-2 text-xs"
        } ${className}`}
      >
        <FaShareAlt className="text-[#ffd966]" />
        <span>{es ? "Compartir" : "Share Win"}</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[420px] rounded-2xl border-2 border-[#d4af37]/60 bg-gradient-to-b from-[#1e1710] to-[#0f0c08] p-4 sm:p-5 shadow-[0_30px_80px_rgba(0,0,0,0.95)] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ffe9a8]">
                  {es ? "Tarjeta de Gran Victoria" : "Big Win Card"}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="w-8 h-8 p-0 rounded-full bg-[#17120b] border border-[#3a2f1d] text-[#b9a77a] hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <FaTimes className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>

              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Crixus Win Card"
                  className="w-full aspect-square rounded-xl border border-[#d4af37]/40 shadow-lg object-cover"
                />
              )}

              <div className="flex flex-col gap-2">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] hover:brightness-110 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_18px_rgba(34,197,94,0.3)] transition-all"
                >
                  <FaWhatsapp className="text-lg" />
                  <span>{es ? "Compartir por WhatsApp" : "Share on WhatsApp"}</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={sharing}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2a2011] hover:bg-[#3a2c17] border border-[#d4af37]/50 text-[#ffe9a8] font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    <FaShareAlt />
                    <span>{es ? "Historias / App" : "Share App"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#18130d] hover:bg-[#251d13] border border-[#3d301e] text-[#e7ddc8] font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    <FaDownload />
                    <span>{es ? "Descargar PNG" : "Download PNG"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ShareWinButton;

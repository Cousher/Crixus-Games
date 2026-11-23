import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  FaCheck,
  FaCopy,
  FaCrown,
  FaShareAlt,
  FaShieldAlt,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import Monetary from "../../components/Monetary";
import MainButton from "../../components/MainButton";
import {
  claimReferralMilestone,
  getReferralSummary,
} from "../../services/rewards/RewardsServices";
import { translateApiMessage } from "../../services/apiMessageI18n";
import sound from "../../services/sound";
import { coinRainEmitter } from "../../components/CoinRain";
import { buildReferralLink, buildWhatsAppInviteUrl } from "../../utils/referral";

interface ReferralMilestone {
  count: number;
  reward: number;
  titleKey: string;
  claimed: boolean;
  unlocked: boolean;
}

interface ReferralInvitee {
  id: string;
  username: string;
  profilePicture?: string;
  level: number;
  active: boolean;
  joinedAt?: string;
}

interface ReferralSummary {
  referralCode: string;
  activeReferralsCount: number;
  totalReferralsCount: number;
  referralEarningsTotal: number;
  inviteeBonus: number;
  referrerBonus: number;
  inviteeUnlockLevel: number;
  referrerUnlockLevel: number;
  referredByUsername: string | null;
  inviteeBonusClaimed: boolean;
  milestones: ReferralMilestone[];
  invitees: ReferralInvitee[];
}

interface LegionReferralPanelProps {
  onBalanceUpdate: (walletBalance: number) => void;
}

const TITLE_LABELS: Record<string, { es: string; en: string }> = {
  centurion: { es: "Centurión", en: "Centurion" },
  tribune: { es: "Tribuno", en: "Tribune" },
  general: { es: "General de Crixus", en: "General of Crixus" },
  emperor: { es: "Emperador", en: "Emperor" },
};

const LegionReferralPanel: React.FC<LegionReferralPanelProps> = ({ onBalanceUpdate }) => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const [data, setData] = useState<ReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimingCount, setClaimingCount] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await getReferralSummary();
      setData(res);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) return null;

  const inviteLink = buildReferralLink(data.referralCode);
  const whatsappUrl = buildWhatsAppInviteUrl(data.referralCode, es);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      sound.play("click");
      toast.success(es ? "¡Link de Legión copiado!" : "Legion invite link copied!", {
        theme: "dark",
        autoClose: 2200,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(es ? "No se pudo copiar el link" : "Could not copy link", { theme: "dark" });
    }
  };

  const handleNativeShare = async () => {
    const shareText = es
      ? `¡Sumate a mi Legión en Crixus Games! Registrate con mi link y cobrá +$${data.inviteeBonus} al llegar a Nivel ${data.inviteeUnlockLevel}.`
      : `Join my Legion on Crixus Games! Sign up with my link and unlock +$${data.inviteeBonus} at Level ${data.inviteeUnlockLevel}.`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Crixus Games — Legión de Gladiadores",
          text: shareText,
          url: inviteLink,
        });
        return;
      } catch {
        // cancelled or unsupported -> fall back to copy
      }
    }
    await handleCopy();
  };

  const handleClaimMilestone = async (count: number) => {
    setClaimingCount(count);
    try {
      const res = await claimReferralMilestone(count);
      sound.play("bonus");
      coinRainEmitter.trigger(55);
      toast.success(`+$${res.reward.toLocaleString()}`, { theme: "dark" });
      onBalanceUpdate(res.walletBalance);
      await load();
    } catch (error: any) {
      toast.error(
        translateApiMessage(error, es ? "Error al reclamar el hito" : "Could not claim milestone"),
        { theme: "dark" }
      );
    } finally {
      setClaimingCount(null);
    }
  };

  return (
    <section className="relative w-full rounded-2xl bg-gradient-to-b from-[#201810] via-[#15100b] to-[#0e0b08] border border-[#d4af37]/40 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,233,168,0.12)] overflow-hidden">
      {/* Top Imperial Accent Hairline */}
      <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent" />

      <div className="relative p-5 sm:p-6 md:p-8">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-[#2c2318] pb-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3a2810] to-[#1a1108] border border-[#d4af37]/55 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)] shrink-0">
              <FaUsers className="text-xl text-[#ffd966]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-[#f5ead4]">
                {es ? "Legión de Gladiadores" : "Gladiator Legion"}
              </h2>
              <p className="text-xs sm:text-sm text-[#9c8c72]">
                {es
                  ? "Invitá amigos con tu link personal y ganá fichas reales del Coliseo por cada recluta activo."
                  : "Invite friends with your personal link and earn Colosseum chips for every active recruit."}
              </p>
            </div>
          </div>

          {data.referredByUsername && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#241b0f] border border-[#d4af37]/35 text-xs text-[#d8ccb2]">
              <span>{es ? "Tu reclutador:" : "Invited by:"}</span>
              <strong className="text-[#ffe9a8]">@{data.referredByUsername}</strong>
              {data.inviteeBonusClaimed && (
                <span className="text-emerald-400 font-bold">✓ +${data.inviteeBonus}</span>
              )}
            </div>
          )}
        </div>

        {/* 3-Step Visual Explainer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
          {[
            {
              step: "1",
              title: es ? "Compartí tu link" : "Share your link",
              desc: es ? "Mandalo por WhatsApp o redes" : "Send via WhatsApp or socials",
            },
            {
              step: "2",
              title: es
                ? `Amigo Nivel ${data.inviteeUnlockLevel} → +$${data.inviteeBonus}`
                : `Friend Level ${data.inviteeUnlockLevel} → +$${data.inviteeBonus}`,
              desc: es ? "Tu invitado cobra bono extra" : "Your friend unlocks bonus chips",
            },
            {
              step: "3",
              title: es
                ? `Amigo Nivel ${data.referrerUnlockLevel} → +$${data.referrerBonus}`
                : `Friend Level ${data.referrerUnlockLevel} → +$${data.referrerBonus}`,
              desc: es ? "Vos cobrás y sumás hitos" : "You earn & unlock milestones",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#110d09] border border-[#2c2318]"
            >
              <span className="w-7 h-7 rounded-full bg-[#2b200e] border border-[#d4af37]/50 text-[#ffd966] font-mono font-black text-xs flex items-center justify-center shrink-0">
                {s.step}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-[#ffe9a8] truncate">{s.title}</div>
                <div className="text-[11px] text-[#8d7f68] truncate">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Invite Link + WhatsApp / Share CTAs */}
        <div className="relative flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0e0b08] border border-[#d4af37]/25 mb-6">
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#16120c] border border-[#3a2e1c]">
            <span className="text-xs sm:text-sm font-mono text-[#ffe9a8] truncate select-all">
              {inviteLink}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2011] hover:bg-[#3a2c17] border border-[#d4af37]/45 text-xs font-bold text-[#ffe9a8] transition-colors cursor-pointer"
            >
              {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
              <span>{copied ? (es ? "Copiado" : "Copied") : es ? "Copiar" : "Copy"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#22c55e] hover:brightness-110 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(34,197,94,0.28)] transition-all"
            >
              <FaWhatsapp className="text-lg" />
              <span>{es ? "Invitar por WhatsApp" : "Invite on WhatsApp"}</span>
            </a>

            <button
              type="button"
              onClick={handleNativeShare}
              aria-label={es ? "Compartir link" : "Share link"}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#241c11] hover:bg-[#332716] border border-[#d4af37]/45 text-[#ffe9a8] font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <FaShareAlt />
              <span className="hidden sm:inline">{es ? "Compartir" : "Share"}</span>
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-[#120e0a] border border-[#2c2318] p-3.5 text-center">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[#9c8c72] font-bold">
              {es ? "Reclutas Activos" : "Active Recruits"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
              {data.activeReferralsCount}
            </div>
            <div className="text-[10px] text-[#7a6d58]">
              {es ? `Nivel ${data.referrerUnlockLevel}+` : `Level ${data.referrerUnlockLevel}+`}
            </div>
          </div>

          <div className="rounded-xl bg-[#120e0a] border border-[#2c2318] p-3.5 text-center">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[#9c8c72] font-bold">
              {es ? "Total Invitados" : "Total Invited"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#f5ead4] mt-1">
              {data.totalReferralsCount}
            </div>
            <div className="text-[10px] text-[#7a6d58]">
              {es ? "Registrados" : "Signed up"}
            </div>
          </div>

          <div className="rounded-xl bg-[#120e0a] border border-[#2c2318] p-3.5 text-center">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-[#9c8c72] font-bold">
              {es ? "Ganado en Legión" : "Legion Earnings"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#ffe9a8] mt-1">
              <Monetary value={data.referralEarningsTotal} />
            </div>
            <div className="text-[10px] text-[#7a6d58]">
              {es ? "Fichas cobradas" : "Chips earned"}
            </div>
          </div>
        </div>

        {/* Recruitment Milestones */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#d4af37] font-black mb-3 flex items-center gap-2">
            <FaCrown />
            <span>{es ? "Hitos de Reclutamiento" : "Recruitment Milestones"}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.milestones.map((m) => {
              const label = TITLE_LABELS[m.titleKey]?.[es ? "es" : "en"] || m.titleKey;
              const canClaim = m.unlocked && !m.claimed;
              const progressPct = Math.min(100, Math.round((data.activeReferralsCount / m.count) * 100));

              return (
                <div
                  key={m.count}
                  className={`flex flex-col justify-between gap-3 rounded-2xl p-4 border transition-all ${
                    m.claimed
                      ? "bg-[#0f1712] border-emerald-500/40 opacity-80"
                      : canClaim
                        ? "bg-gradient-to-b from-[#2f230e] to-[#151009] border-[#ffd966] shadow-[0_0_22px_rgba(229,188,72,0.22)]"
                        : "bg-[#120e0a] border-[#2c2318]"
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FaShieldAlt
                          className={`text-sm shrink-0 ${
                            m.claimed
                              ? "text-emerald-400"
                              : canClaim
                                ? "text-[#ffd966]"
                                : "text-[#8a7f63]"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wider font-black text-[#ffe9a8] truncate">
                            {label}
                          </div>
                          <div className="text-[11px] text-[#9c8c72]">
                            {m.count}{" "}
                            {es
                              ? m.count === 1
                                ? "amigo activo"
                                : "amigos activos"
                              : m.count === 1
                                ? "active friend"
                                : "active friends"}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-black text-emerald-400 shrink-0">
                        +<Monetary value={m.reward} />
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#090705] overflow-hidden border border-[#2a2116]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.claimed || canClaim
                            ? "bg-emerald-400"
                            : "bg-gradient-to-r from-[#9c7316] to-[#e5bc48]"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <MainButton
                      text={
                        m.claimed
                          ? es
                            ? "Reclamado"
                            : "Claimed"
                          : canClaim
                            ? es
                              ? "Reclamar"
                              : "Claim"
                            : `${Math.min(data.activeReferralsCount, m.count)} / ${m.count}`
                      }
                      onClick={() => handleClaimMilestone(m.count)}
                      type={canClaim ? "success" : "dark"}
                      textSize="text-xs"
                      pulse={canClaim}
                      loading={claimingCount === m.count}
                      disabled={!canClaim || claimingCount === m.count}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recruits List */}
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#9c8c72] font-bold mb-2.5">
            {es ? "Tus Reclutas Recientes" : "Your Recent Recruits"}
          </h3>
          {data.invitees.length === 0 ? (
            <div className="rounded-xl bg-[#100d09] border border-dashed border-[#342a1d] p-5 text-center text-xs sm:text-sm text-[#8d7f68]">
              {es
                ? "Todavía no invitaste amigos. Mandá tu link por WhatsApp y empezá a armar tu Legión."
                : "No recruits yet. Share your link on WhatsApp to start building your Legion."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {data.invitees.map((inv) => {
                const pct = Math.min(100, Math.round((inv.level / data.referrerUnlockLevel) * 100));
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#120e0a] border border-[#2c2318]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-[#241b0e] border border-[#d4af37]/40 text-[#ffe9a8] text-xs font-black flex items-center justify-center shrink-0 uppercase">
                        {(inv.username || "?").slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#f5ead4] truncate">
                          {inv.username}
                        </div>
                        <div className="text-[11px] text-[#9c8c72]">
                          {es ? `Nivel ${inv.level}` : `Level ${inv.level}`}
                        </div>
                      </div>
                    </div>
                    {inv.active ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                        <FaCheck className="text-[9px]" />
                        {es ? "Activo" : "Active"}
                      </span>
                    ) : (
                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#241c11] border border-[#3d301e] text-[#d4af37] text-[11px] font-mono font-bold">
                        {pct}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LegionReferralPanel;

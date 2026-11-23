import { buildReferralLink } from "./referral";

export interface WinCardData {
  gameName: string;
  multiplier: number;
  payout: number;
  username?: string;
  level?: number;
  isEs?: boolean;
}

export function buildWinShareText(data: WinCardData): string {
  const es = data.isEs ?? true;
  const link = buildReferralLink(data.username);
  const multStr = `${data.multiplier.toFixed(2).replace(/\.00$/, "")}x`;
  const payoutStr = `$${Math.floor(data.payout).toLocaleString("es-AR")}`;

  return es
    ? `🏆 ¡Metí un ${multStr} en ${data.gameName} y gané ${payoutStr} en Crixus Games! 🔥\nEntrá gratis con mi link y llevate +$500 extra al llegar a Nivel 3 👇\n${link}`
    : `🏆 Just hit ${multStr} on ${data.gameName} for ${payoutStr} on Crixus Games! 🔥\nPlay free with my link and unlock +$500 bonus at Level 3 👇\n${link}`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function renderWinCardToDataUrl(data: WinCardData): string {
  const es = data.isEs ?? true;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Deep Imperial Background Gradient
  const bg = ctx.createRadialGradient(size / 2, size * 0.42, 60, size / 2, size / 2, size * 0.78);
  bg.addColorStop(0, "#382810");
  bg.addColorStop(0.45, "#19120a");
  bg.addColorStop(1, "#0a0806");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // 2. Subtle Golden Sunburst Rays
  ctx.save();
  ctx.translate(size / 2, size * 0.44);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-22, -620);
    ctx.lineTo(22, -620);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "rgba(212, 175, 55, 0.055)" : "rgba(255, 217, 102, 0.02)";
    ctx.fill();
  }
  ctx.restore();

  // 3. Double Imperial Frame
  ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, 44, 44, size - 88, size - 88, 42);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 233, 168, 0.25)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 64, 64, size - 128, size - 128, 30);
  ctx.stroke();

  // 4. Top Brand Header
  ctx.textAlign = "center";
  ctx.fillStyle = "#d4af37";
  ctx.font = "800 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("★  CRIXUS GAMES · COLISEO IMPERIAL  ★", size / 2, 145);

  // Game Name Pill
  const gameText = data.gameName.toUpperCase();
  ctx.font = "900 32px system-ui, -apple-system, Segoe UI, sans-serif";
  const pillW = Math.min(720, Math.max(340, ctx.measureText(gameText).width + 90));
  drawRoundedRect(ctx, (size - pillW) / 2, 185, pillW, 68, 34);
  ctx.fillStyle = "rgba(212, 175, 55, 0.16)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 217, 102, 0.65)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "#fff3c4";
  ctx.fillText(gameText, size / 2, 231);

  // 5. Giant Multiplier Headline
  const multStr = `${data.multiplier.toFixed(2).replace(/\.00$/, "")}x`;
  const goldGrad = ctx.createLinearGradient(0, 320, 0, 505);
  goldGrad.addColorStop(0, "#fff8d6");
  goldGrad.addColorStop(0.5, "#f3c84c");
  goldGrad.addColorStop(1, "#a67717");

  ctx.save();
  ctx.shadowColor = "rgba(212, 175, 55, 0.6)";
  ctx.shadowBlur = 45;
  ctx.fillStyle = goldGrad;
  ctx.font = "900 185px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(multStr, size / 2, 475);
  ctx.restore();

  // Subtitle
  ctx.fillStyle = "#c9b896";
  ctx.font = "700 30px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(es ? "GRAN VICTORIA EN LA ARENA" : "IMPERIAL ARENA VICTORY", size / 2, 540);

  // 6. Payout Box
  const payoutStr = `+$${Math.floor(data.payout).toLocaleString("es-AR")}`;
  drawRoundedRect(ctx, 170, 585, size - 340, 145, 28);
  const boxGrad = ctx.createLinearGradient(170, 585, 170, 730);
  boxGrad.addColorStop(0, "rgba(16, 185, 129, 0.22)");
  boxGrad.addColorStop(1, "rgba(6, 78, 59, 0.35)");
  ctx.fillStyle = boxGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(52, 211, 153, 0.65)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#6ee7b7";
  ctx.font = "900 84px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(payoutStr, size / 2, 686);

  // 7. Player Badge
  if (data.username) {
    const levelLabel =
      typeof data.level === "number"
        ? ` · ${es ? "NIVEL" : "LEVEL"} ${data.level}`
        : "";
    ctx.fillStyle = "#ffe9a8";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(`@${data.username}${levelLabel}`, size / 2, 800);
  }

  // 8. Bottom Referral CTA Strip
  drawRoundedRect(ctx, 96, 845, size - 192, 138, 24);
  ctx.fillStyle = "rgba(15, 11, 7, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const refUrl = buildReferralLink(data.username).replace(/^https?:\/\//, "");
  ctx.fillStyle = "#d4af37";
  ctx.font = "800 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(
    es
      ? "JUGÁ GRATIS Y COBRÁ +$500 EXTRA EN NIVEL 3"
      : "PLAY FREE & UNLOCK +$500 BONUS AT LEVEL 3",
    size / 2,
    898
  );

  ctx.fillStyle = "#f5ead4";
  ctx.font = "700 28px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(refUrl.slice(0, 48), size / 2, 948);

  return canvas.toDataURL("image/png");
}

export async function renderWinCardBlob(data: WinCardData): Promise<Blob | null> {
  const dataUrl = renderWinCardToDataUrl(data);
  if (!dataUrl) return null;
  const res = await fetch(dataUrl);
  return res.blob();
}

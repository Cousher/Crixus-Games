const REF_STORAGE_KEY = "crixus_ref_code";

export function captureReferralFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get("ref") || "").trim().slice(0, 40);
    if (ref) {
      localStorage.setItem(REF_STORAGE_KEY, ref);
      // Clean the query param without reloading so URLs stay tidy
      params.delete("ref");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
      return ref;
    }
  } catch {
    // ignore storage / URL errors in restricted browsers
  }
  return null;
}

export function getStoredReferral(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(REF_STORAGE_KEY) || "").trim().slice(0, 40);
  } catch {
    return "";
  }
}

export function clearStoredReferral(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function buildReferralLink(username?: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://crixusgames.com";
  if (!username) return origin;
  return `${origin}/?ref=${encodeURIComponent(username)}`;
}

export function buildWhatsAppInviteUrl(username: string, isEs = true): string {
  const link = buildReferralLink(username);
  const text = isEs
    ? `🏛️ ¡Sumate a mi Legión en Crixus Games! Jugá gratis a Crash, Minas, Camino del Gladiador y Tragamonedas. Registrate con mi link y al llegar a Nivel 3 te llevás +$500 extra gratis 🔥👇\n${link}`
    : `🏛️ Join my Legion on Crixus Games! Play Crash, Mines, Gladiator Road & Slots for free. Sign up with my link and unlock +$500 bonus at Level 3 🔥👇\n${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

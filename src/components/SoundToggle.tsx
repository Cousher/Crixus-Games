import { useEffect, useState } from "react";
import { FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import sound from "../services/sound";

/** Navbar button that mutes/unmutes all casino sounds (persisted). */
const SoundToggle = () => {
  const [muted, setMuted] = useState(sound.isMuted());

  useEffect(() => sound.subscribe(setMuted), []);

  return (
    <button
      type="button"
      data-no-sfx
      onClick={() => sound.toggleMuted()}
      aria-label={muted ? "Activar sonido" : "Silenciar"}
      title={muted ? "Activar sonido" : "Silenciar"}
      className={`flex shrink-0 items-center justify-center w-9 h-9 min-w-[36px] rounded-full border transition-all
        ${muted
          ? "border-[#3d362a] text-[#8a7f63] hover:text-white"
          : "border-[#d4af37]/60 text-[#e0b341] shadow-[0_0_12px_rgba(212,175,55,0.35)] hover:shadow-[0_0_18px_rgba(212,175,55,0.6)]"}`}
    >
      {muted ? <FaVolumeMute className="shrink-0 w-[18px] h-[18px]" /> : <FaVolumeUp className="shrink-0 w-[18px] h-[18px]" />}
    </button>
  );
};

export default SoundToggle;

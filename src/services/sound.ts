/**
 * Crixus sound engine.
 *
 * All casino sounds are synthesized in real time with the Web Audio API:
 * no audio files to download, no licensing issues, zero latency.
 * Mute + volume are persisted in localStorage and shared app-wide.
 */

export type SoundName =
  | "click"
  | "chip"
  | "spin"
  | "lever"
  | "reelStop"
  | "wildLand"
  | "anticipation"
  | "win"
  | "bigWin"
  | "coins"
  | "lose"
  | "tick"
  | "countdown"
  | "launch"
  | "cashout"
  | "explode"
  | "gem"
  | "stoneFlip"
  | "boom"
  | "flip"
  | "bonus"
  | "levelUp"
  | "notify"
  | "pump"
  | "pop";

const STORAGE_MUTED = "crixus:soundMuted";
const STORAGE_VOLUME = "crixus:soundVolume";

type Listener = (muted: boolean) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;
  private volume: number;
  private listeners = new Set<Listener>();
  private lastPlayed: Partial<Record<SoundName, number>> = {};

  constructor() {
    const storedMuted = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_MUTED) : null;
    const storedVolume = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_VOLUME) : null;
    this.muted = storedMuted === "true";
    this.volume = storedVolume !== null ? Math.min(1, Math.max(0, Number(storedVolume))) : 0.6;
  }

  /** Lazily create the AudioContext (browsers require a user gesture first). */
  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Call once from a user gesture to unlock audio on iOS/Safari. */
  unlock() {
    this.ensureContext();
  }

  isMuted() {
    return this.muted;
  }

  getVolume() {
    return this.volume;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    localStorage.setItem(STORAGE_MUTED, String(muted));
    this.listeners.forEach((l) => l(muted));
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    if (!this.muted) this.play("chip");
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    localStorage.setItem(STORAGE_VOLUME, String(this.volume));
    if (this.master) this.master.gain.value = this.volume * 0.5;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Light haptic feedback on phones that support it. */
  vibrate(pattern: number | number[]) {
    if (this.muted) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* not supported */
    }
  }

  // ---------- primitives ----------

  private tone(
    freq: number,
    start: number,
    duration: number,
    opts: { type?: OscillatorType; gain?: number; endFreq?: number; attack?: number } = {}
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const { type = "sine", gain: peak = 0.3, endFreq, attack = 0.005 } = opts;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.master!);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(start: number, duration: number, opts: { gain?: number; filter?: number; filterEnd?: number; type?: BiquadFilterType } = {}) {
    const ctx = this.ctx!;
    const { gain: peak = 0.3, filter = 1200, filterEnd, type = "lowpass" } = opts;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const biquad = ctx.createBiquadFilter();
    biquad.type = type;
    biquad.frequency.setValueAtTime(filter, start);
    if (filterEnd) biquad.frequency.exponentialRampToValueAtTime(filterEnd, start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(biquad).connect(gain).connect(this.master!);
    src.start(start);
    src.stop(start + duration + 0.05);
  }

  /** Metallic "coin" ping: two inharmonic partials. */
  private coin(start: number, pitch = 1, gain = 0.18) {
    this.tone(1975 * pitch, start, 0.12, { type: "square", gain: gain * 0.5 });
    this.tone(2637 * pitch, start + 0.05, 0.35, { type: "square", gain: gain * 0.6 });
  }

  // ---------- public API ----------

  /**
   * Play a named sound. `intensity` is optional and used by a few sounds
   * (e.g. the crash tick pitch follows the multiplier).
   */
  play(name: SoundName, intensity = 1) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;

    // throttle very frequent sounds
    const nowMs = performance.now();
    const minGap: Partial<Record<SoundName, number>> = { click: 40, tick: 90, gem: 60, chip: 50 };
    const gap = minGap[name];
    if (gap && nowMs - (this.lastPlayed[name] || 0) < gap) return;
    this.lastPlayed[name] = nowMs;

    const t = ctx.currentTime + 0.01;

    switch (name) {
      case "click":
        this.tone(1800, t, 0.035, { type: "triangle", gain: 0.08 });
        break;

      case "chip": // poker chip clack
        this.noise(t, 0.05, { gain: 0.35, filter: 3500, type: "bandpass" });
        this.tone(900, t, 0.06, { type: "triangle", gain: 0.12, endFreq: 600 });
        break;

      case "spin": // slot reel mechanical whirr
        this.noise(t, 0.14, { gain: 0.22, filter: 950, filterEnd: 1600, type: "bandpass" });
        for (let i = 0; i < 10; i++) {
          this.tone(360 + (i % 2) * 75, t + 0.06 + i * 0.065, 0.035, { type: "triangle", gain: 0.05 });
        }
        break;

      case "lever": // chunky mechanical slot lever pull + spring ratchet
        this.noise(t, 0.09, { gain: 0.28, filter: 1600, filterEnd: 600, type: "bandpass" });
        this.tone(280, t, 0.08, { type: "sawtooth", gain: 0.12, endFreq: 135 });
        this.tone(540, t + 0.09, 0.05, { type: "triangle", gain: 0.1, endFreq: 860 });
        this.vibrate(20);
        break;

      case "reelStop": { // heavy weighted mechanical slam; intensity = column (1, 2, 3)
        const col = Math.min(3, Math.max(1, Math.round(intensity)));
        const base = 135 + (col - 1) * 28;
        this.tone(base, t, 0.14, { type: "sine", gain: 0.44, endFreq: 56 });
        this.tone(base * 2.2, t, 0.06, { type: "triangle", gain: 0.14, endFreq: base * 1.1 });
        this.noise(t, 0.055, { gain: 0.24, filter: 1800 + col * 350, type: "bandpass" });
        this.vibrate(14);
        break;
      }

      case "wildLand": // regal golden lion chime + warm brass resonance
        this.tone(587.33, t, 0.22, { type: "triangle", gain: 0.22 });
        this.tone(880, t + 0.05, 0.28, { type: "sine", gain: 0.2 });
        this.tone(1174.66, t + 0.1, 0.36, { type: "sine", gain: 0.18 });
        this.coin(t + 0.12, 1.18, 0.14);
        this.vibrate([20, 20, 35]);
        break;

      case "anticipation": { // dramatic rising golden tension pulse for Reel 3 near-miss
        for (let i = 0; i < 8; i++) {
          const f = 440 * Math.pow(1.09, i);
          this.tone(f, t + i * 0.095, 0.11, { type: "triangle", gain: 0.09 + i * 0.012 });
          this.tone(f * 1.5, t + i * 0.095, 0.09, { type: "sine", gain: 0.05 + i * 0.006 });
        }
        this.noise(t, 0.78, { gain: 0.12, filter: 600, filterEnd: 2800, type: "bandpass" });
        break;
      }

      case "win": { // short bright arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => this.tone(f, t + i * 0.08, 0.22, { type: "triangle", gain: 0.22 }));
        this.coin(t + 0.32, 1, 0.15);
        break;
      }

      case "bigWin": { // fanfare + coin shower
        const fanfare = [
          [523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36],
          [783.99, 0.52], [1046.5, 0.64], [1318.5, 0.8],
        ];
        fanfare.forEach(([f, d]) => {
          this.tone(f, t + d, 0.35, { type: "sawtooth", gain: 0.1 });
          this.tone(f / 2, t + d, 0.35, { type: "triangle", gain: 0.12 });
        });
        for (let i = 0; i < 24; i++) {
          this.coin(t + 1 + i * 0.06 + Math.random() * 0.03, 0.9 + Math.random() * 0.3, 0.1);
        }
        this.vibrate([60, 40, 60, 40, 120]);
        break;
      }

      case "coins": { // a handful of coins (balance going up)
        const n = Math.min(10, Math.max(3, Math.round(3 * intensity)));
        for (let i = 0; i < n; i++) this.coin(t + i * 0.055, 0.95 + Math.random() * 0.2, 0.09);
        break;
      }

      case "lose":
        this.tone(392, t, 0.18, { type: "triangle", gain: 0.15 });
        this.tone(311.13, t + 0.16, 0.32, { type: "triangle", gain: 0.13, endFreq: 260 });
        break;

      case "tick": { // crash multiplier tick; pitch rises with intensity (= multiplier)
        const f = Math.min(1600, 300 + Math.log2(Math.max(1, intensity)) * 260);
        this.tone(f, t, 0.05, { type: "sine", gain: 0.06 });
        break;
      }

      case "countdown":
        this.tone(880, t, 0.08, { type: "square", gain: 0.06 });
        break;

      case "launch": // rocket ignition
        this.noise(t, 0.9, { gain: 0.25, filter: 300, filterEnd: 2500, type: "lowpass" });
        this.tone(110, t, 0.9, { type: "sawtooth", gain: 0.06, endFreq: 330 });
        break;

      case "cashout": // register "ka-ching"
        this.noise(t, 0.04, { gain: 0.3, filter: 4000, type: "highpass" });
        this.tone(1318.5, t + 0.03, 0.12, { type: "square", gain: 0.12 });
        this.tone(1760, t + 0.1, 0.5, { type: "square", gain: 0.12 });
        this.coin(t + 0.18, 1.1, 0.12);
        this.vibrate(40);
        break;

      case "explode":
        this.noise(t, 0.8, { gain: 0.5, filter: 1800, filterEnd: 80, type: "lowpass" });
        this.tone(120, t, 0.6, { type: "sine", gain: 0.45, endFreq: 30 });
        this.vibrate([80, 30, 80]);
        break;

      case "gem": { // sparkle; pitch climbs with the number of gems found
        const step = Math.min(12, Math.max(0, intensity - 1));
        const base = 880 * Math.pow(2, step / 12);
        this.tone(base, t, 0.18, { type: "sine", gain: 0.2 });
        this.tone(base * 1.5, t + 0.05, 0.25, { type: "sine", gain: 0.12 });
        this.tone(base * 2, t + 0.1, 0.3, { type: "triangle", gain: 0.06 });
        this.vibrate(14);
        break;
      }

      case "stoneFlip": // crisp tactile carved-stone slab lift
        this.noise(t, 0.045, { gain: 0.24, filter: 1400, filterEnd: 600, type: "bandpass" });
        this.tone(240, t, 0.055, { type: "triangle", gain: 0.14, endFreq: 130 });
        break;

      case "boom":
        this.noise(t, 0.6, { gain: 0.55, filter: 1200, filterEnd: 60, type: "lowpass" });
        this.tone(90, t, 0.5, { type: "square", gain: 0.25, endFreq: 30 });
        this.vibrate(150);
        break;

      case "flip": // coin toss whoosh
        for (let i = 0; i < 6; i++) this.tone(2400 + i * 120, t + i * 0.09, 0.04, { type: "square", gain: 0.035 });
        this.noise(t, 0.5, { gain: 0.08, filter: 1500, type: "bandpass" });
        break;

      case "bonus": { // treasure chest opening + coins
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, t + i * 0.07, 0.3, { type: "triangle", gain: 0.18 })
        );
        for (let i = 0; i < 12; i++) this.coin(t + 0.4 + i * 0.05, 0.9 + Math.random() * 0.25, 0.09);
        this.vibrate([40, 30, 40]);
        break;
      }

      case "levelUp": { // ascending power-up
        const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
        scale.forEach((f, i) => this.tone(f, t + i * 0.05, 0.18, { type: "square", gain: 0.07 }));
        [1046.5, 1318.5, 1567.98].forEach((f) => this.tone(f, t + 0.45, 0.8, { type: "triangle", gain: 0.12 }));
        this.vibrate([50, 40, 50, 40, 150]);
        break;
      }

      case "notify":
        this.tone(1318.5, t, 0.1, { type: "sine", gain: 0.12 });
        this.tone(1760, t + 0.09, 0.2, { type: "sine", gain: 0.1 });
        break;

      case "pump": { // elastic air inflation whoosh; pitch rises with pump number
        const step = Math.min(20, Math.max(0, intensity - 1));
        const base = 240 * Math.pow(1.065, step);
        this.noise(t, 0.11, { gain: 0.14, filter: 900 + step * 95, filterEnd: 2200 + step * 110, type: "bandpass" });
        this.tone(base, t, 0.14, { type: "sine", gain: 0.2, endFreq: base * 1.42 });
        this.tone(base * 1.5, t + 0.03, 0.11, { type: "triangle", gain: 0.08, endFreq: base * 2 });
        this.vibrate(15);
        break;
      }

      case "pop": // crisp balloon burst + deep thump
        this.noise(t, 0.09, { gain: 0.65, filter: 3200, filterEnd: 400, type: "bandpass" });
        this.noise(t + 0.01, 0.35, { gain: 0.4, filter: 1400, filterEnd: 90, type: "lowpass" });
        this.tone(240, t, 0.22, { type: "sine", gain: 0.42, endFreq: 42 });
        this.vibrate([70, 25, 90]);
        break;
    }
  }
}

const sound = new SoundEngine();

// Unlock audio and add a subtle click to every button, app-wide.
if (typeof window !== "undefined") {
  const unlock = () => sound.unlock();
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });

  window.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.("button, [role='button'], a.sfx");
      if (btn && !(btn as HTMLButtonElement).disabled && !btn.hasAttribute("data-no-sfx")) {
        sound.play("click");
      }
    },
    { capture: true }
  );
}

export default sound;

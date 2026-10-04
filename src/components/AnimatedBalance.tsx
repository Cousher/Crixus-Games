import { useEffect, useRef, useState } from "react";
import Monetary from "./Monetary";
import sound from "../services/sound";

interface AnimatedBalanceProps {
  value: number;
}

interface FloatingDelta {
  id: number;
  amount: number;
}

/**
 * Wallet balance that counts up/down smoothly, flashes green/red,
 * spawns a floating "+$X" and plays coins when it increases.
 */
const AnimatedBalance: React.FC<AnimatedBalanceProps> = ({ value }) => {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [deltas, setDeltas] = useState<FloatingDelta[]>([]);
  const prev = useRef(value);
  const raf = useRef<number>();
  const initialised = useRef(false);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;

    // first real value: no animation
    if (!initialised.current || !Number.isFinite(from)) {
      initialised.current = Number.isFinite(to);
      setDisplay(to);
      return;
    }

    const diff = to - from;
    if (Math.abs(diff) < 1) {
      setDisplay(to);
      return;
    }

    setFlash(diff > 0 ? "up" : "down");
    if (diff > 0) {
      const id = Date.now() + Math.random();
      setDeltas((d) => [...d, { id, amount: diff }]);
      setTimeout(() => setDeltas((d) => d.filter((x) => x.id !== id)), 1600);
      const ratio = from > 0 ? diff / from : 1;
      sound.play("coins", ratio > 0.5 ? 3 : ratio > 0.1 ? 2 : 1);
    }

    const duration = Math.min(1200, 400 + Math.log10(Math.abs(diff) + 1) * 200);
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + diff * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setTimeout(() => setFlash(null), 250);
    };
    cancelAnimationFrame(raf.current!);
    raf.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(raf.current!);
  }, [value]);

  return (
    <span className="relative inline-flex">
      <span
        className={`transition-all duration-300 tabular-nums ${
          flash === "up"
            ? "text-green-300 scale-110 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]"
            : flash === "down"
              ? "text-red-300"
              : ""
        }`}
      >
        <Monetary value={Math.floor(display)} />
      </span>
      {deltas.map((d) => (
        <span
          key={d.id}
          className="balance-float absolute left-1/2 -translate-x-1/2 top-0 text-green-400 font-bold text-sm whitespace-nowrap pointer-events-none"
        >
          +<Monetary value={Math.floor(d.amount)} />
        </span>
      ))}
    </span>
  );
};

export default AnimatedBalance;

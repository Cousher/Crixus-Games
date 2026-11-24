import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

// result 0 = Cara (lion), result 1 = Cruz (helmet).
// At rotateY === 0deg the ".back" face points at the viewer; at 180deg the ".front" face does,
// so Cara lives on .back and Cruz on .front.
export const CARA_IMG = "/images/coin_cara.webp";
export const CRUZ_IMG = "/images/coin_cruz.webp";

const EDGE_LAYERS = 16;

interface CoinProps {
  result: number | null;
  spinning: boolean;
  /** Shorter toss duration for instant 1v1 duels (defaults to 5s for live global Coin Flip) */
  fast?: boolean;
}

const Coin: React.FC<CoinProps> = ({ result, spinning, fast = false }) => {
  const controls = useAnimation();
  const hasSpunRef = useRef(false);

  useEffect(() => {
    if (spinning) {
      hasSpunRef.current = true;
      controls.set({ rotateY: 0, rotateX: 0, rotateZ: 0, y: 0, scale: 1 });
      if (fast) {
        controls.start({
          rotateY: 1800,
          rotateX: [0, 18, -14, 12, -8, 0],
          y: [0, -86, -40, -64, -18, 0],
          scale: [1, 1.16, 1.08, 1.12, 1.04, 1],
          transition: { duration: 1.5, ease: "linear" },
        });
      } else {
        controls.start({
          rotateY: 3600,
          rotateX: [0, 16, -12, 14, -10, 8, -5, 0],
          y: [0, -96, -26, -78, -18, -52, -10, 0],
          scale: [1, 1.16, 1.03, 1.12, 1.02, 1.08, 1.02, 1],
          transition: { duration: 5, ease: "linear" },
        });
      }
    } else if (result !== null && hasSpunRef.current) {
      // Weighted parabolic descent + crisp metallic altar slam bounce on the exact winning face
      const baseSpin = fast ? 1800 : 3600;
      const targetAngle = result === 0 ? baseSpin + 360 : baseSpin + 540;
      controls.start({
        rotateY: targetAngle,
        rotateX: [8, -4, 2, 0],
        y: [0, -24, 4, -8, 0],
        scale: [1.05, 1.12, 0.96, 1.03, 1],
        transition: {
          duration: fast ? 1.15 : 1.75,
          ease: [0.22, 1, 0.36, 1],
        },
      });
    } else if (result !== null) {
      // Mounted with an already-completed result (e.g. viewing a finished 1v1 Duel)
      controls.set({
        rotateY: result === 0 ? 0 : 180,
        rotateX: 0,
        y: 0,
        scale: 1,
      });
      controls.start({
        rotateY: result === 0 ? [0, 10, 0, -10, 0] : [180, 190, 180, 170, 180],
        y: [0, -6, 0],
        transition: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
      });
    } else {
      // Regal slow levitation on initial mount
      controls.start({
        rotateY: [0, 16, 0, -16, 0],
        rotateX: [0, 4, 0, -4, 0],
        y: [0, -9, 0],
        scale: 1,
        transition: { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
      });
    }
  }, [spinning, result, fast, controls]);

  return (
    <motion.div className="coin" animate={controls}>
      {/* Solid brushed-gold rim thickness stacked across 16 metallic slices */}
      {Array.from({ length: EDGE_LAYERS }).map((_, i) => (
        <div
          key={i}
          className="coin-edge"
          style={{
            transform: `translateZ(${-0.6 + (1.2 * i) / (EDGE_LAYERS - 1)}em)`,
          }}
        />
      ))}
      <div className="face front" style={{ backgroundImage: `url(${CRUZ_IMG})` }} />
      <div className="face back" style={{ backgroundImage: `url(${CARA_IMG})` }} />
    </motion.div>
  );
};

export default Coin;

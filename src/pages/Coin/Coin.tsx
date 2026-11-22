import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

// result 0 = Cara (lion), result 1 = Cruz (helmet).
// at rotateY ≡ 0° the ".back" face points at the viewer, at 180° the ".front" one does,
// so Cara lives on .back and Cruz on .front.
export const CARA_IMG = "/images/coin_cara.webp";
export const CRUZ_IMG = "/images/coin_cruz.webp";

const EDGE_LAYERS = 14;

interface CoinProps {
    result: number | null;
    spinning: boolean;
}

const Coin: React.FC<CoinProps> = ({ result, spinning }) => {
    const controls = useAnimation();
    const hasSpunRef = useRef(false);

    useEffect(() => {
        if (spinning) {
            hasSpunRef.current = true;
            controls.set({ rotateY: 0, y: 0, scale: 1 });
            controls.start({
                rotateY: 3600,
                y: [0, -72, -12, -52, -8, -28, 0],
                scale: [1, 1.07, 1, 1.05, 1, 1.03, 1],
                transition: { duration: 5, ease: "linear" },
            });
        } else if (result !== null && hasSpunRef.current) {
            // Land smoothly on the winning face
            controls.start({
                rotateY: result === 0 ? 3600 + 360 : 3600 + 540,
                y: [0, -14, 0],
                scale: [1, 1.06, 1],
                transition: { duration: 1.9, ease: [0.22, 1, 0.36, 1] },
            });
        } else {
            // Gentle idle levitation on initial mount
            controls.start({
                rotateY: [0, 14, 0, -14, 0],
                y: [0, -8, 0],
                scale: 1,
                transition: { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
            });
        }
    }, [spinning, result, controls]);

    return (
        <motion.div className="coin" animate={controls}>
            {/* Coin thickness: stacked brushed-gold discs between both faces */}
            {Array.from({ length: EDGE_LAYERS }).map((_, i) => (
                <div
                    key={i}
                    className="coin-edge"
                    style={{ transform: `translateZ(${-0.58 + (1.16 * i) / (EDGE_LAYERS - 1)}em)` }}
                />
            ))}
            <div className="face front" style={{ backgroundImage: `url(${CRUZ_IMG})` }} />
            <div className="face back" style={{ backgroundImage: `url(${CARA_IMG})` }} />
        </motion.div>
    );
};

export default Coin;

import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

// result 0 = Cara (lion), result 1 = Cruz (helmet).
// at rotateY ≡ 0° the ".back" face points at the viewer, at 180° the ".front" one does,
// so Cara lives on .back and Cruz on .front.
export const CARA_IMG = '/images/coin_cara.webp';
export const CRUZ_IMG = '/images/coin_cruz.webp';

const EDGE_LAYERS = 12;

interface CoinProps {
    result: number | null;
    spinning: boolean;
}

const Coin: React.FC<CoinProps> = ({ result, spinning }) => {
    const controls = useAnimation();

    useEffect(() => {
        const spinCoin = () => {
            controls.set({ rotateY: 0, y: 0 });
            controls.start({
                rotateY: 3600,
                y: [0, -60, 0, -40, 0, -20, 0],
                transition: { duration: 5, ease: "linear" },
            }); // Fast-spin with a few hops
        };

        const slowSpin = () => {
            controls.start({
                rotateY: result === 0 ? 3600 + 360 : 3600 + 540,
                y: 0,
                transition: { duration: 2, ease: [0.33, 1, 0.68, 1] },
            }); // Slow-spin to the final result
        };

        if (spinning) {
            spinCoin();
        } else {
            slowSpin();
        }
    }, [spinning, result, controls]);

    return (
        <motion.div className="coin" animate={controls}>
            {/* coin thickness: stacked gold discs between both faces */}
            {Array.from({ length: EDGE_LAYERS }).map((_, i) => (
                <div
                    key={i}
                    className="coin-edge"
                    style={{ transform: `translateZ(${-0.6 + (1.2 * i) / (EDGE_LAYERS - 1)}em)` }}
                />
            ))}
            <div className="face front" style={{ backgroundImage: `url(${CRUZ_IMG})` }} />
            <div className="face back" style={{ backgroundImage: `url(${CARA_IMG})` }} />
        </motion.div>
    );
};

export default Coin;

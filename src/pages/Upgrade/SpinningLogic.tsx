import React, { useEffect, useRef } from "react";
import sound from "../../services/sound";

interface SpinningLogicProps {
    stopAngle: number;
    spinning: boolean;
    totalDuration?: number;
}

// Direct DOM-ref requestAnimationFrame rotation -> 0 React re-renders during the spin (60fps on mobile)
const SpinningLogic: React.FC<SpinningLogicProps> = ({
    stopAngle,
    spinning,
    totalDuration = 5500,
}) => {
    const pointerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = pointerRef.current;
        if (!el) return;

        if (spinning) {
            const startTime = performance.now();
            const fullSpins = totalDuration <= 3500 ? 4 : 5;
            const totalDegrees = fullSpins * 360 + stopAngle;
            let rafId = 0;
            let lastSector = -1;

            const spinFrame = (now: number) => {
                const timeElapsed = now - startTime;
                const progress = Math.min(timeElapsed / totalDuration, 1);

                // Smooth quartic ease-out for crisp casino wheel suspense
                const easeOut = 1 - Math.pow(1 - progress, 4);
                const currentDeg = easeOut * totalDegrees;
                el.style.transform = `rotate(${currentDeg}deg)`;

                // Subtle mechanical tick every 30° (12 Roman numeral markers) as the spear slows down
                const sector = Math.floor(currentDeg / 30);
                if (sector !== lastSector && progress > 0.15 && progress < 0.99) {
                    lastSector = sector;
                    if (progress > 0.45 || sector % 2 === 0) {
                        sound.play("tick", 1 + progress * 1.5);
                    }
                }

                if (progress < 1) {
                    rafId = requestAnimationFrame(spinFrame);
                }
            };

            rafId = requestAnimationFrame(spinFrame);
            return () => cancelAnimationFrame(rafId);
        } else if (stopAngle === 0) {
            el.style.transform = "rotate(0deg)";
        }
    }, [stopAngle, spinning, totalDuration]);

    return (
        <div
            ref={pointerRef}
            className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 will-change-transform"
        >
            {/* Golden Gladiator Spear / Needle pointing to the outer ring at 12 o'clock (0 deg) */}
            <svg
                viewBox="0 0 200 200"
                className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(236,168,35,0.85)]"
            >
                <defs>
                    <linearGradient id="spearGoldL" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFF6D6" />
                        <stop offset="45%" stopColor="#F5C451" />
                        <stop offset="100%" stopColor="#B87B14" />
                    </linearGradient>
                    <linearGradient id="spearGoldR" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ECA823" />
                        <stop offset="50%" stopColor="#9A6209" />
                        <stop offset="100%" stopColor="#593602" />
                    </linearGradient>
                </defs>
                {/* Glowing tip indicator on the outer track */}
                <circle
                    cx="100"
                    cy="22"
                    r="4"
                    fill="#FFF6D6"
                    className="drop-shadow-[0_0_8px_#ECA823]"
                />
                {/* Left facet of spearhead */}
                <polygon
                    points="100,16 91,48 97,54 97,96 100,96"
                    fill="url(#spearGoldL)"
                />
                {/* Right facet of spearhead */}
                <polygon
                    points="100,16 109,48 103,54 103,96 100,96"
                    fill="url(#spearGoldR)"
                />
                {/* Spear collar / guard */}
                <polygon
                    points="89,52 100,47 111,52 100,57"
                    fill="#FFF0B3"
                    stroke="#784B06"
                    strokeWidth="0.8"
                />
            </svg>
        </div>
    );
};

export default SpinningLogic;

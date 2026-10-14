import React, { useEffect, useState } from "react";

interface SpinningLogicProps {
    stopAngle: number;
    spinning: boolean;
    totalDuration?: number;
}

const SpinningLogic: React.FC<SpinningLogicProps> = ({
    stopAngle,
    spinning,
    totalDuration = 8000,
}) => {
    const [angle, setAngle] = useState(0);

    useEffect(() => {
        if (spinning) {
            const startTime = performance.now();
            const fullSpins = 5;
            const totalDegrees = fullSpins * 360 + stopAngle;
            let rafId: number;

            const spinFrame = (now: number) => {
                const timeElapsed = now - startTime;
                const progress = Math.min(timeElapsed / totalDuration, 1);

                // Smooth cubic ease-out for casino wheel suspense
                const easeOut = 1 - Math.pow(1 - progress, 3);
                setAngle(easeOut * totalDegrees);

                if (progress < 1) {
                    rafId = requestAnimationFrame(spinFrame);
                }
            };

            rafId = requestAnimationFrame(spinFrame);
            return () => cancelAnimationFrame(rafId);
        } else if (stopAngle === 0) {
            setAngle(0);
        }
    }, [stopAngle, spinning, totalDuration]);

    return (
        <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center z-20"
            style={{
                transform: `rotate(${angle}deg)`,
            }}
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


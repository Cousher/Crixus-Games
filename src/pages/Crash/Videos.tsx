import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";

interface VideosProps {
    animationSrc: string;
    setAnimationSrc: React.Dispatch<React.SetStateAction<string>>;
    falling: string;
    idle: string;
    up: string;
}

const Videos: React.FC<VideosProps> = ({ animationSrc, falling, up }) => {
    const state = animationSrc === up ? "up" : animationSrc === falling ? "falling" : "idle";
    const [rocketLottie, setRocketLottie] = useState<any>(null);
    const [explosionLottie, setExplosionLottie] = useState<any>(null);

    // Fetch premium Lotties for the Rocket and the Explosion
    useEffect(() => {
        fetch('https://assets8.lottiefiles.com/packages/lf20_touohxv0.json')
            .then(res => res.json())
            .then(data => setRocketLottie(data))
            .catch(() => {});
            
        fetch('https://assets2.lottiefiles.com/packages/lf20_a1i8w5e3.json')
            .then(res => res.json())
            .then(data => setExplosionLottie(data))
            .catch(() => {});
    }, []);

    const animations: Record<string, { animate: any; transition: any }> = {
        idle: {
            animate: { y: [0, -12, 0], x: 0, rotate: [0, -2, 2, 0], opacity: 1 },
            transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
        },
        up: {
            animate: { y: -180, x: [0, -3, 3, -2, 2, 0], rotate: [-2, 2, -2], opacity: 1 },
            transition: {
                y: { duration: 15, ease: "easeOut" },
                x: { duration: 0.35, repeat: Infinity, ease: "linear" },
                rotate: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
            },
        },
        falling: {
            animate: { y: -160, rotate: 0, opacity: [1, 1, 0] },
            transition: { duration: 0.7, ease: "easeIn" },
        },
    };

    const { animate, transition } = animations[state];

    return (
        <div className="absolute inset-0 flex justify-center items-end pb-8 pointer-events-none">
            
            {/* Dynamic Flight Trail */}
            {state === "up" && (
                <svg className="absolute bottom-16 w-full h-[400px] left-1/2 -translate-x-1/2 overflow-visible z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <motion.path
                        d="M 50 100 Q 50 40 50 -100"
                        stroke="url(#trail-gradient)"
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.9, 0.5] }}
                        transition={{ duration: 5, ease: "easeOut" }}
                        style={{ filter: "drop-shadow(0 0 15px rgba(250,204,21,0.9))" }}
                    />
                    <defs>
                        <linearGradient id="trail-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="50%" stopColor="#facc15" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                    </defs>
                </svg>
            )}

            <motion.div
                key={state === "idle" ? "idle" : "flight"}
                initial={false}
                animate={animate}
                transition={transition}
                className="z-10 absolute bottom-6 flex items-center justify-center w-[160px] h-[160px]"
            >
                {/* Engine Flame Particle (only when flying) */}
                {state === "up" && (
                    <motion.div 
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-8 h-20 bg-gradient-to-t from-transparent via-orange-500 to-yellow-300 blur-md rounded-full mix-blend-screen z-0"
                        animate={{ scaleY: [1, 1.8, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 0.1, repeat: Infinity }}
                        style={{ transformOrigin: "top" }}
                    />
                )}
                
                {state !== "falling" ? (
                    rocketLottie ? (
                        <Lottie 
                            animationData={rocketLottie} 
                            loop 
                            className="w-[200px] h-[200px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] relative z-10" 
                        />
                    ) : (
                        <img src={animationSrc} className="w-[160px] h-[160px] relative z-10" alt="Crash Object" />
                    )
                ) : (
                    explosionLottie ? (
                        <Lottie 
                            animationData={explosionLottie} 
                            loop={false}
                            className="w-[300px] h-[300px] relative z-20 scale-150" 
                        />
                    ) : (
                        <img src={animationSrc} className="w-[160px] h-[160px] relative z-10" alt="Crash Object" />
                    )
                )}
            </motion.div>
        </div>
    );
};

export default Videos;

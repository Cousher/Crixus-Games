import React from "react";
import { motion } from "framer-motion";

interface VideosProps {
    animationSrc: string;
    setAnimationSrc: React.Dispatch<React.SetStateAction<string>>;
    falling: string;
    idle: string;
    up: string;
}

const Videos: React.FC<VideosProps> = ({ animationSrc, falling, up }) => {
    const state = animationSrc === up ? "up" : animationSrc === falling ? "falling" : "idle";

    const animations: Record<string, { animate: any; transition: any }> = {
        idle: {
            animate: { y: [0, -12, 0], x: 0, rotate: [0, -2, 2, 0], opacity: 1 },
            transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
        },
        up: {
            animate: { y: -160, x: [0, -2, 2, -1, 1, 0], rotate: [-1, 1, -1], opacity: 1 },
            transition: {
                y: { duration: 15, ease: "easeOut" },
                x: { duration: 0.35, repeat: Infinity, ease: "linear" },
                rotate: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
            },
        },
        falling: {
            animate: { y: 320, rotate: 540, opacity: [1, 1, 0] },
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
                        strokeWidth="1.5"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 0.8, 0.4] }}
                        transition={{ duration: 5, ease: "easeOut" }}
                        style={{ filter: "drop-shadow(0 0 10px rgba(250,204,21,0.8))" }}
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
                className="z-10 absolute bottom-6"
            >
                {/* Engine Flame Particle (only when flying) */}
                {state === "up" && (
                    <motion.div 
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4 h-12 bg-gradient-to-t from-transparent via-orange-500 to-yellow-300 blur-sm rounded-full mix-blend-screen"
                        animate={{ scaleY: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 0.1, repeat: Infinity }}
                        style={{ transformOrigin: "top" }}
                    />
                )}
                
                <img
                    src={animationSrc}
                    className="w-[160px] h-[160px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10"
                    alt="Crash Object"
                />
            </motion.div>
        </div>
    );
};

export default Videos;

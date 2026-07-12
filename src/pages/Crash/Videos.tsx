import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VideosProps {
    animationSrc: string;
    setAnimationSrc: React.Dispatch<React.SetStateAction<string>>;
    falling: string;
    idle: string;
    up: string;
}

// High-quality pure SVG Rocket (zero external dependencies)
const RocketSVG = () => (
    <svg viewBox="0 0 100 100" className="w-[120px] h-[120px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-10" style={{ transform: "rotate(45deg)" }}>
        <defs>
            <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
            <linearGradient id="rocketWindow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="rocketFins" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
        </defs>
        {/* Main Body */}
        <path d="M 50 10 C 70 30 70 70 50 90 C 30 70 30 30 50 10 Z" fill="url(#rocketBody)" />
        {/* Fins */}
        <path d="M 50 60 L 80 90 L 60 90 Z" fill="url(#rocketFins)" />
        <path d="M 50 60 L 20 90 L 40 90 Z" fill="url(#rocketFins)" />
        {/* Window */}
        <circle cx="50" cy="45" r="12" fill="url(#rocketWindow)" stroke="#9ca3af" strokeWidth="2" />
        <circle cx="50" cy="45" r="4" fill="#bfdbfe" />
    </svg>
);

const Videos: React.FC<VideosProps> = ({ animationSrc, falling, up }) => {
    const state = animationSrc === up ? "up" : animationSrc === falling ? "falling" : "idle";

    const animations: Record<string, { animate: any; transition: any }> = {
        idle: {
            animate: { y: [0, -12, 0], x: 0, rotate: [0, -2, 2, 0], opacity: 1, scale: 1 },
            transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
        },
        up: {
            animate: { y: -160, x: [0, -4, 4, -2, 2, 0], rotate: [-2, 2, -2], opacity: 1, scale: 1 },
            transition: {
                y: { duration: 15, ease: "easeOut" },
                x: { duration: 0.35, repeat: Infinity, ease: "linear" },
                rotate: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
            },
        },
        falling: {
            animate: { y: -140, rotate: 180, opacity: 0, scale: 0.5 },
            transition: { duration: 0.5, ease: "easeIn" },
        },
    };

    const { animate, transition } = animations[state];

    return (
        <div className="absolute inset-0 flex justify-center items-end pb-8 pointer-events-none">
            
            {/* Dynamic Flight Trail */}
            <AnimatePresence>
                {state === "up" && (
                    <motion.svg 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-16 w-full h-[400px] left-1/2 -translate-x-1/2 overflow-visible z-0" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                    >
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
                    </motion.svg>
                )}
            </AnimatePresence>

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
                        className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-10 h-24 bg-gradient-to-t from-transparent via-orange-500 to-yellow-300 blur-md rounded-full mix-blend-screen z-0"
                        animate={{ scaleY: [1, 1.8, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 0.1, repeat: Infinity }}
                        style={{ transformOrigin: "top" }}
                    />
                )}
                
                {state === "falling" ? (
                    /* Massive Crash Explosion using Framer Motion */
                    <motion.div
                        className="absolute w-40 h-40 flex items-center justify-center"
                        initial={{ scale: 0.5, opacity: 1 }}
                        animate={{ scale: [1, 3, 4], opacity: [1, 0.8, 0] }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <div className="absolute w-full h-full bg-orange-500 rounded-full mix-blend-screen blur-xl" />
                        <div className="absolute w-3/4 h-3/4 bg-yellow-400 rounded-full mix-blend-screen blur-lg" />
                        <div className="absolute w-1/2 h-1/2 bg-white rounded-full mix-blend-screen blur-md" />
                    </motion.div>
                ) : (
                    <RocketSVG />
                )}
            </motion.div>
        </div>
    );
};

export default Videos;

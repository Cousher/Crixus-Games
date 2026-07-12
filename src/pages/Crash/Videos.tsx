import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VideosProps {
    animationSrc: string;
    setAnimationSrc: React.Dispatch<React.SetStateAction<string>>;
    falling: string;
    idle: string;
    up: string;
    multiplier?: number;
}

// High-quality pure SVG Rocket (zero external dependencies)
const RocketSVG = ({ isFlying }: { isFlying: boolean }) => (
    <svg viewBox="0 0 100 100" className="w-[120px] h-[120px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-10 overflow-visible" style={{ transform: "rotate(45deg)" }}>
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
            <linearGradient id="rocketFlame" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="30%" stopColor="#f97316" />
                <stop offset="100%" stopColor="transparent" />
            </linearGradient>
        </defs>
        
        {/* Engine Flame */}
        {isFlying && (
            <motion.ellipse 
                cx="50" cy="115" rx="14" ry="40" 
                fill="url(#rocketFlame)" 
                className="mix-blend-screen"
                style={{ filter: "blur(4px)", transformOrigin: "50% 90%" }}
                animate={{ scaleY: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.1, repeat: Infinity }}
            />
        )}
        
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

const Videos: React.FC<VideosProps> = ({ animationSrc, falling, up, multiplier }) => {
    const state = animationSrc === up ? "up" : animationSrc === falling ? "falling" : "idle";
    const multiplierValue = multiplier || 1;
    
    // Map multiplier (1 to infinity) to progress (0 to 1) logarithmically
    const t_val = state === "idle" ? 0 : 1 - (1 / multiplierValue);
    
    // Calculate Rocket Position (using a quadratic bezier mapping)
    // x starts at 0% (left) and smoothly approaches 100% (right)
    const rocketX = (120 * t_val - 20 * t_val * t_val); 
    
    // y starts at 0% (bottom) and smoothly approaches 80% (top, leaving room for the multiplier text)
    const rocketBottom = 80 * t_val * t_val; 

    // Calculate tangent angle for rotation so the Rocket points along the curve
    const dx = 1200 - 400 * t_val;
    const dy = 800 * t_val;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const rocketRotation = angle - 45; // -45 to compensate for the SVG's native 45deg tilt

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            
            {/* Aviator-Style Graph Curve */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
                <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                        <stop offset="100%" stopColor="rgba(239, 68, 68, 0.0)" />
                    </linearGradient>
                    <clipPath id="curveClip">
                        <rect x="0" y="0" width={`${rocketX}%`} height="100%" />
                    </clipPath>
                </defs>
                
                {state !== "idle" && (
                    <g clipPath="url(#curveClip)">
                        {/* Area under curve */}
                        <path 
                            d="M -10 510 Q 600 510 1000 100 L 1000 510 Z" 
                            fill="url(#curveGradient)" 
                        />
                        {/* Thick red flight line */}
                        <path 
                            d="M -10 510 Q 600 510 1000 100" 
                            fill="none" 
                            stroke="#ef4444" 
                            strokeWidth="8"
                            style={{ filter: "drop-shadow(0 0 10px rgba(239,68,68,0.8))" }}
                        />
                    </g>
                )}
            </svg>

            {/* Dynamic Rocket */}
            <motion.div
                key={state === "idle" ? "idle" : "flight"}
                className="z-10 absolute flex items-center justify-center w-[120px] h-[120px]"
                animate={state === "idle" ? {
                    left: `calc(5% - 60px)`, 
                    bottom: `calc(5% - 60px)`,
                    rotate: rocketRotation,
                    y: [0, -10, 0], // subtle hover while waiting
                    opacity: 1, scale: 1
                } : state === "falling" ? { 
                    left: `calc(${rocketX}% - 60px)`, 
                    bottom: `calc(${rocketBottom}% - 60px)`,
                    rotate: rocketRotation + 120, // spin downwards
                    opacity: 0, scale: 0.5 
                } : { 
                    left: `calc(${rocketX}% - 60px)`, 
                    bottom: `calc(${rocketBottom}% - 60px)`,
                    rotate: rocketRotation,
                    opacity: 1, scale: 1
                }}
                transition={state === "falling" 
                    ? { duration: 0.5, ease: "easeIn" } 
                    : state === "idle" 
                        ? { y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }
                        : { duration: 0.1, ease: "linear" }
                }
            >
                {state === "falling" ? (
                    /* Massive Crash Explosion */
                    <motion.div
                        className="absolute w-40 h-40 flex items-center justify-center pointer-events-none"
                        initial={{ scale: 0.5, opacity: 1 }}
                        animate={{ scale: [1, 3, 5], opacity: [1, 0.8, 0] }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <div className="absolute w-full h-full bg-red-600 rounded-full mix-blend-screen blur-2xl" />
                        <div className="absolute w-3/4 h-3/4 bg-orange-500 rounded-full mix-blend-screen blur-xl" />
                        <div className="absolute w-1/2 h-1/2 bg-yellow-400 rounded-full mix-blend-screen blur-lg" />
                        <div className="absolute w-1/4 h-1/4 bg-white rounded-full mix-blend-screen blur-md" />
                    </motion.div>
                ) : (
                    <RocketSVG isFlying={state === "up"} />
                )}
            </motion.div>
        </div>
    );
};

export default Videos;

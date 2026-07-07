import React from "react";
import { motion } from "framer-motion";

interface VideosProps {
    animationSrc: string;
    setAnimationSrc: React.Dispatch<React.SetStateAction<string>>;
    falling: string;
    idle: string;
    up: string;
}

// Historically this component chained <video>/GIF clips via their `ended`
// events. The gladiator theme swapped those for static SVGs, which never
// fire `ended` and never move — so the motion now lives here, driven by
// framer-motion according to the game state.
const Videos: React.FC<VideosProps> = ({ animationSrc, falling, up }) => {
    const state =
        animationSrc === up ? "up" : animationSrc === falling ? "falling" : "idle";

    const animations: Record<string, { animate: any; transition: any }> = {
        // betting window: gentle hover
        idle: {
            animate: { y: [0, -12, 0], x: 0, rotate: [0, -2, 2, 0], opacity: 1 },
            transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
        },
        // flight: slow climb with a nervous vibration
        up: {
            animate: { y: -130, x: [0, -3, 3, -2, 2, 0], rotate: [-2, 2, -2], opacity: 1 },
            transition: {
                y: { duration: 7, ease: "easeOut" },
                x: { duration: 0.35, repeat: Infinity, ease: "linear" },
                rotate: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
            },
        },
        // crash: tumble down and fade (Crash.tsx resets to idle ~700ms later)
        falling: {
            animate: { y: 320, rotate: 540, opacity: [1, 1, 0.15] },
            transition: { duration: 0.7, ease: "easeIn" },
        },
    };

    const { animate, transition } = animations[state];

    return (
        <div className="absolute bottom-6 flex w-full justify-center pointer-events-none">
            <motion.img
                // idle remounts fresh at ground level; up->falling keeps the same
                // element so the coin falls from wherever it was flying
                key={state === "idle" ? "idle" : "flight"}
                src={animationSrc}
                initial={false}
                animate={animate}
                transition={transition}
                className="w-[160px] h-[160px]"
                alt=""
            />
        </div>
    );
};

export default Videos;

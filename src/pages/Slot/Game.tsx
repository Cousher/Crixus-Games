import React from "react";
import { motion } from "framer-motion";
import SlotColumn from "./SlotColumn";
import { SlotProps } from "./Types";

interface SlotMachineProps {
    grid: string[];
    isSpinning: boolean;
    data: SlotProps | null;
    winningLines: string[];
}

interface PaylineGeom {
    id: string;
    num: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    nodes: [number, number][];
}

const PAYLINE_GEOM: PaylineGeom[] = [
    { id: "Horizontal 1", num: 1, x1: 16, y1: 50, x2: 284, y2: 50, nodes: [[50, 50], [150, 50], [250, 50]] },
    { id: "Horizontal 2", num: 2, x1: 16, y1: 150, x2: 284, y2: 150, nodes: [[50, 150], [150, 150], [250, 150]] },
    { id: "Horizontal 3", num: 3, x1: 16, y1: 250, x2: 284, y2: 250, nodes: [[50, 250], [150, 250], [250, 250]] },
    { id: "Diagonal 1", num: 4, x1: 20, y1: 20, x2: 280, y2: 280, nodes: [[50, 50], [150, 150], [250, 250]] },
    { id: "Diagonal 2", num: 5, x1: 20, y1: 280, x2: 280, y2: 20, nodes: [[50, 250], [150, 150], [250, 50]] },
];

const Game: React.FC<SlotMachineProps> = ({ grid, isSpinning, data, winningLines }) => {
    const hasWin = !isSpinning && winningLines.length > 0;
    const activeSet = new Set(hasWin ? winningLines : []);

    const renderPaylinePip = (lineId: string, label: string, topClass: string) => {
        const active = activeSet.has(lineId);
        return (
            <div
                key={lineId}
                title={lineId}
                className={`absolute left-1/2 -translate-x-1/2 ${topClass} w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-black transition-all duration-300 z-20 ${
                    active
                        ? "bg-gradient-to-b from-[#fff5cc] via-[#ffd966] to-[#b8860b] text-[#1a1204] scale-125 shadow-[0_0_12px_rgba(255,217,102,0.95)] ring-1 ring-white"
                        : "bg-[#1a140a] text-[#b89531]/80 border border-[#6e5415] shadow-inner"
                }`}
            >
                {label}
            </div>
        );
    };

    const renderColumn = (side: "left" | "right") => (
        <div className="relative flex flex-col items-center justify-between h-[340px] w-5 sm:w-7 md:w-8 shrink-0 z-10 bg-gradient-to-r from-[#6d5314] via-[#e6ca6a] to-[#5a420c] border-x border-[#3e2e09] shadow-[inset_0_0_10px_rgba(0,0,0,0.45)]">
            {/* Classical fluted grooves */}
            <div className="absolute inset-y-3 left-[22%] w-[9%] bg-black/25 rounded-full pointer-events-none" />
            <div className="absolute inset-y-3 left-[46%] w-[9%] bg-black/20 rounded-full pointer-events-none" />
            <div className="absolute inset-y-3 left-[70%] w-[9%] bg-black/25 rounded-full pointer-events-none" />

            {/* Top capital */}
            <div className="w-[125%] h-3.5 bg-gradient-to-b from-[#ffe9a8] via-[#c79d2e] to-[#6b5012] rounded-b-sm border-b border-[#2b1f05] shadow-md z-10" />

            {/* Payline number pips embedded into the pillars */}
            {side === "left" ? (
                <>
                    {renderPaylinePip("Diagonal 1", "4", "top-[7%]")}
                    {renderPaylinePip("Horizontal 1", "1", "top-[16%]")}
                    {renderPaylinePip("Horizontal 2", "2", "top-1/2 -translate-y-1/2")}
                    {renderPaylinePip("Horizontal 3", "3", "bottom-[16%]")}
                    {renderPaylinePip("Diagonal 2", "5", "bottom-[7%]")}
                </>
            ) : (
                <>
                    {renderPaylinePip("Diagonal 2", "5", "top-[7%]")}
                    {renderPaylinePip("Horizontal 1", "1", "top-[16%]")}
                    {renderPaylinePip("Horizontal 2", "2", "top-1/2 -translate-y-1/2")}
                    {renderPaylinePip("Horizontal 3", "3", "bottom-[16%]")}
                    {renderPaylinePip("Diagonal 1", "4", "bottom-[7%]")}
                </>
            )}

            {/* Bottom base plinth */}
            <div className="w-[125%] h-3.5 bg-gradient-to-t from-[#ffe9a8] via-[#c79d2e] to-[#6b5012] rounded-t-sm border-t border-[#2b1f05] shadow-md z-10" />
        </div>
    );

    const renderBeam = (position: "top" | "bottom") => (
        <div
            className={`w-full h-9 md:h-10 z-20 relative flex items-center justify-center bg-gradient-to-r from-[#1e170c] via-[#3e3018] to-[#1e170c] border-y-[2px] border-[#d4af37] shadow-[0_6px_18px_rgba(0,0,0,0.85)] ${
                position === "top" ? "rounded-t-xl" : "rounded-b-xl"
            }`}
        >
            {/* Metallic highlight sheen */}
            <div className="absolute inset-x-3 top-1 h-[1px] bg-gradient-to-r from-transparent via-[#ffe9a8]/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-3 bottom-1 h-[1px] bg-gradient-to-r from-transparent via-[#8a6b18]/60 to-transparent pointer-events-none" />

            {/* Engraved Roman rivets + central crest */}
            <div className="flex w-full items-center justify-between px-4 sm:px-7">
                {[0, 1, 2].map((i) => (
                    <div
                        key={`l-${i}`}
                        className="w-2 h-2 rounded-full bg-gradient-to-br from-[#fff2c2] to-[#7a5b14] shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    />
                ))}
                <div className="px-3 py-0.5 rounded-full bg-[#120e08] border border-[#d4af37]/40 text-[9px] md:text-[10px] font-bold tracking-[0.25em] uppercase text-[#e6ca6a]/90">
                    {position === "top" ? "V · LINEAE" : "CRIXUS"}
                </div>
                {[0, 1, 2].map((i) => (
                    <div
                        key={`r-${i}`}
                        className="w-2 h-2 rounded-full bg-gradient-to-br from-[#fff2c2] to-[#7a5b14] shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col justify-center items-center w-full max-w-[404px] mx-auto relative">
            {renderBeam("top")}

            <div className="flex relative items-stretch w-full justify-center">
                {renderColumn("left")}

                {/* 3x3 Reel Viewport */}
                <motion.div
                    className="flex flex-1 min-h-[340px] max-h-[340px] relative z-0 overflow-hidden bg-[#070605]"
                    animate={{
                        boxShadow: isSpinning
                            ? [
                                  "inset 0px 0px 36px rgba(0,0,0,0.9), inset 0px 0px 14px rgba(236,168,35,0.45)",
                                  "inset 0px 0px 36px rgba(0,0,0,0.9), inset 0px 0px 28px rgba(236,168,35,0.8)",
                                  "inset 0px 0px 36px rgba(0,0,0,0.9), inset 0px 0px 14px rgba(236,168,35,0.45)",
                              ]
                            : data?.totalPayout && data.totalPayout > 0
                                ? "inset 0px 0px 36px rgba(0,0,0,0.85), inset 0px 0px 44px rgba(255,215,0,0.45)"
                                : "inset 0px 0px 36px rgba(0,0,0,0.92)",
                    }}
                    transition={{ duration: isSpinning ? 0.5 : 0.8, repeat: isSpinning ? Infinity : 0 }}
                >
                    {[
                        { line: [0, 3, 6] },
                        { line: [1, 4, 7] },
                        { line: [2, 5, 8] },
                    ].map((col, index) => (
                        <div className="flex flex-1 relative" key={index}>
                            <SlotColumn
                                symbols={[grid[col.line[0]], grid[col.line[1]], grid[col.line[2]]]}
                                isSpinning={isSpinning}
                                position={index}
                                winningLines={winningLines}
                            />
                            {index !== 2 && (
                                <div className="absolute right-0 inset-y-0 w-[2px] bg-gradient-to-b from-[#3e2e09] via-[#d4af37]/75 to-[#3e2e09] z-10 pointer-events-none" />
                            )}
                        </div>
                    ))}

                    {/* 3D Cylindrical top & bottom depth shadows */}
                    <div
                        className="absolute inset-x-0 top-0 h-10 pointer-events-none z-20"
                        style={{
                            background:
                                "linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 100%)",
                        }}
                    />
                    <div
                        className="absolute inset-x-0 bottom-0 h-10 pointer-events-none z-20"
                        style={{
                            background:
                                "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 100%)",
                        }}
                    />

                    {/* Crisp SVG Winning Paylines Overlay */}
                    {hasWin && (
                        <svg
                            viewBox="0 0 300 300"
                            preserveAspectRatio="none"
                            className="absolute inset-0 w-full h-full pointer-events-none z-30"
                        >
                            <defs>
                                <filter id="slotGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {PAYLINE_GEOM.filter((g) => activeSet.has(g.id)).map((g, idx) => (
                                <g key={g.id}>
                                    {/* Outer warm golden glow */}
                                    <motion.line
                                        x1={g.x1}
                                        y1={g.y1}
                                        x2={g.x2}
                                        y2={g.y2}
                                        stroke="#f59e0b"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeOpacity="0.45"
                                        filter="url(#slotGoldGlow)"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.35, delay: idx * 0.08 }}
                                    />
                                    {/* Main golden beam */}
                                    <motion.line
                                        x1={g.x1}
                                        y1={g.y1}
                                        x2={g.x2}
                                        y2={g.y2}
                                        stroke="#ffd966"
                                        strokeWidth="4.5"
                                        strokeLinecap="round"
                                        filter="url(#slotGoldGlow)"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.35, delay: idx * 0.08 }}
                                    />
                                    {/* White hot core */}
                                    <motion.line
                                        x1={g.x1}
                                        y1={g.y1}
                                        x2={g.x2}
                                        y2={g.y2}
                                        stroke="#fffbeb"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.35, delay: idx * 0.08 }}
                                    />
                                    {/* Glowing anchor sparks on each winning cell */}
                                    {g.nodes.map(([cx, cy], nIdx) => (
                                        <motion.circle
                                            key={nIdx}
                                            cx={cx}
                                            cy={cy}
                                            r="5"
                                            fill="#fffbeb"
                                            stroke="#f59e0b"
                                            strokeWidth="2.5"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                                            transition={{ duration: 0.35, delay: idx * 0.08 + nIdx * 0.06 }}
                                        />
                                    ))}
                                </g>
                            ))}
                        </svg>
                    )}
                </motion.div>

                {renderColumn("right")}
            </div>

            {renderBeam("bottom")}
        </div>
    );
};

export default Game;

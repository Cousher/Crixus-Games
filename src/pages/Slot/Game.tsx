import React from 'react';
import { motion } from "framer-motion";
import SlotColumn from './SlotColumn';
import { SlotProps } from './Types';

interface SlotMachineProps {
    grid: string[];
    isSpinning: boolean;
    data: SlotProps | null;
    winningLines: any[];
    loadedImages: number;
    setLoadedImages: (value: number) => void;
}

const Game: React.FC<SlotMachineProps> = ({ grid, isSpinning, data, winningLines, loadedImages, setLoadedImages }) => {

    // Roman column style sidebars
    const renderSidebar = (index: number) => {
        return (
            <div className={`relative flex items-center justify-center h-[340px] w-4 md:w-8 -mb-4 z-10 bg-gradient-to-b from-[#b89531] via-[#e6ca6a] to-[#8a6b18] border-x border-[#5c4710] shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_10px_20px_rgba(0,0,0,0.8)]`}>
                {/* Fluting details (column vertical grooves) */}
                <div className="absolute inset-y-0 left-[20%] w-[10%] bg-black/20"></div>
                <div className="absolute inset-y-0 left-[45%] w-[10%] bg-black/20"></div>
                <div className="absolute inset-y-0 left-[70%] w-[10%] bg-black/20"></div>
                {/* Column cap top/bottom */}
                <div className="absolute top-0 w-[120%] h-4 bg-gradient-to-r from-[#d4af37] to-[#8a6b18] rounded-b-sm border-b border-[#3e3219] shadow-md -translate-x-[10%]"></div>
                <div className="absolute bottom-4 w-[120%] h-4 bg-gradient-to-r from-[#8a6b18] to-[#d4af37] rounded-t-sm border-t border-[#3e3219] shadow-md -translate-x-[10%]"></div>
            </div>
        )
    }

    // Heavy gold/stone top and bottom bars
    const renderBottomBar = (index: number) => {
        return (
            <div className={`w-full md:w-[416px] h-12 z-20 relative flex items-center justify-center bg-gradient-to-r from-[#2a2315] via-[#4a3b1f] to-[#2a2315] border-y-[3px] border-[#d4af37] shadow-[0_5px_15px_rgba(0,0,0,0.8)] ${index === 0 ? "rounded-t-xl mb-[-2px]" : "rounded-b-xl mt-[-2px]"}`}>
                {/* Gold accent line */}
                <div className="absolute inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-[#ffe9a8] to-transparent opacity-40"></div>
                {/* Roman studs/rivets */}
                <div className="flex w-full justify-between px-6 opacity-80">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-gradient-to-br from-[#ffe9a8] to-[#8a6b18] shadow-[1px_1px_2px_rgba(0,0,0,0.8),inset_1px_1px_1px_rgba(255,255,255,0.8)]"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col justify-center items-center relative">
            {renderBottomBar(0)}
            <div className="flex relative items-center">
                {renderSidebar(0)}
                <motion.div 
                    className="flex w-full md:min-w-[330px] min-h-[340px] relative z-0 border-y-2 border-[#1a1103] overflow-hidden"
                    style={{
                        background: 'linear-gradient(to bottom, #050505 0%, #151515 20%, #151515 80%, #050505 100%)',
                        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9)'
                    }}
                    animate={{
                        boxShadow: isSpinning 
                            ? ["inset 0px 0px 40px rgba(0,0,0,0.8), inset 0px 0px 15px #ECA823", "inset 0px 0px 40px rgba(0,0,0,0.8), inset 0px 0px 30px #ECA823", "inset 0px 0px 40px rgba(0,0,0,0.8), inset 0px 0px 15px #ECA823"]
                            : data?.totalPayout && data?.totalPayout > 0 
                                ? "inset 0px 0px 40px rgba(0,0,0,0.8), inset 0px 0px 60px rgba(212,175,55,0.4)" // Changed win glow to gold instead of bright green to match theme
                                : "inset 0px 0px 40px rgba(0,0,0,0.8), inset 0px 0px 10px rgba(0,0,0,0.2)"
                    }}
                    transition={{ duration: isSpinning ? 0.5 : 1, repeat: isSpinning ? Infinity : 0 }}
                >
                    {[{
                        line: [0, 3, 6],
                    }, {
                        line: [1, 4, 7],
                    }, {
                        line: [2, 5, 8],
                    }
                    ].map(
                        (line, index) => (
                            <div className='flex relative w-full' key={index}>
                                <SlotColumn symbols={[grid[line.line[0]], grid[line.line[1]], grid[line.line[2]]]}
                                    isSpinning={isSpinning} position={index} winningLines={winningLines} />
                                {
                                    /* Inner vertical separators between slot columns */
                                    index !== 2 && (
                                        <div className="absolute right-0 h-full w-[3px] bg-gradient-to-b from-transparent via-[#d4af37]/60 to-transparent z-10"></div>
                                    )
                                }
                            </ div>

                        )
                    )}
                </motion.div>
                {renderSidebar(1)}
            </div >
            {renderBottomBar(1)}
        </div >
    );
};

export default Game;


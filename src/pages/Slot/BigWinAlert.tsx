import React, { useState, useEffect } from 'react';
import Monetary from '../../components/Monetary';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BigWinAlertProps {
    value: number;
}

const BigWinAlert: React.FC<BigWinAlertProps> = ({ value }) => {
    const [animatedValue, setAnimatedValue] = useState(0);
    const [lottieData, setLottieData] = useState<any>(null);

    useEffect(() => {
        // Fetch a premium coin explosion Lottie animation
        fetch('https://assets2.lottiefiles.com/packages/lf20_a1i8w5e3.json')
            .then(res => res.json())
            .then(data => setLottieData(data))
            .catch(() => console.error("Failed to load Lottie"));

        setTimeout(() => {
            animateValue();
        }, 1500); // Start counter animation slightly after the Lottie explosion starts
    }, [value]);

    const animateValue = () => {
        let start = 0;
        const end = Math.round(value);
        const timer = setInterval(() => {
            start += value / 100;
            setAnimatedValue(start);
            if (start >= end) {
                setAnimatedValue(end);
                clearInterval(timer);
            }
        }, 30);
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='absolute z-50 flex items-center justify-center bg-black/60 w-screen h-[110vh] backdrop-blur-sm'
            >
                <div className='flex flex-col items-center justify-center absolute top-32 w-full max-w-[800px] h-[600px]'>
                    {/* The Lottie Explosion */}
                    {lottieData && (
                        <div className="absolute inset-0 z-0 pointer-events-none w-full h-full">
                            <Lottie 
                                animationData={lottieData} 
                                loop={false} 
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    )}
                    
                    {/* The Monetary Counter */}
                    <motion.div 
                        initial={{ scale: 0, y: 100 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.5 }}
                        className='flex flex-col items-center justify-center font-bold p-4 z-10 gap-2 mt-20'
                    >
                        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 uppercase tracking-widest drop-shadow-[0_5px_15px_rgba(234,179,8,0.5)]">
                            BIG WIN!
                        </h1>
                        <span 
                            className='text-[#FFED08] text-6xl md:text-8xl mt-4 drop-shadow-2xl' 
                            style={{ textShadow: '6px 6px 0 #A93400, -6px -6px 0 #A93400, 6px -6px 0 #A93400, -6px 6px 0 #A93400' }}
                        >
                            <Monetary value={animatedValue} />
                        </span>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BigWinAlert;

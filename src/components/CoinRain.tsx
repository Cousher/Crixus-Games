import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// Global emitter to trigger the rain from anywhere in the app without prop drilling
class RainEmitter {
  listeners: ((amount: number) => void)[] = [];
  subscribe(fn: (amount: number) => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }
  trigger(amount = 50) {
    this.listeners.forEach(fn => fn(amount));
  }
}
export const coinRainEmitter = new RainEmitter();

const CoinRain = () => {
  const [coins, setCoins] = useState<{ id: number, x: number, delay: number, duration: number, scale: number, rotation: number, xOffset: number }[]>([]);

  useEffect(() => {
    return coinRainEmitter.subscribe((amount) => {
      const newCoins = Array.from({ length: amount }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100, // vw
        xOffset: (Math.random() - 0.5) * 200, // drift left or right
        delay: Math.random() * 0.8,
        duration: 1.5 + Math.random() * 2,
        scale: 0.5 + Math.random() * 0.8,
        rotation: Math.random() * 360,
      }));
      setCoins(prev => [...prev, ...newCoins]);
      
      // Cleanup after max duration
      setTimeout(() => {
        setCoins(prev => prev.filter(c => !newCoins.find(nc => nc.id === c.id)));
      }, 5000);
    });
  }, []);

  if (coins.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <AnimatePresence>
        {coins.map(coin => (
          <motion.div
            key={coin.id}
            initial={{ 
                y: -100, 
                x: `calc(${coin.x}vw - 1rem)`, 
                rotateY: 0, 
                rotateZ: coin.rotation, 
                scale: coin.scale, 
                opacity: 1 
            }}
            animate={{ 
              y: "110vh", 
              x: `calc(${coin.x}vw - 1rem + ${coin.xOffset}px)`,
              rotateY: 1080, // 3d spinning effect
              rotateZ: coin.rotation + (Math.random() > 0.5 ? 360 : -360),
              opacity: [1, 1, 1, 0] 
            }}
            transition={{ 
              duration: coin.duration, 
              delay: coin.delay, 
              ease: "easeIn"
            }}
            className="absolute top-0 left-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#ffd966] via-[#ECA823] to-[#8a7322] border-2 border-[#fff7cc] shadow-[0_0_15px_rgba(236,168,35,0.8)] flex items-center justify-center transform-style-3d"
          >
            <span className="text-[#6d5111] font-black text-sm drop-shadow-sm">$</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CoinRain;

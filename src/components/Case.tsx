import { useState } from "react";
import { RotatingLines } from "react-loader-spinner";
import Monetary from "./Monetary";

interface CaseProps {
  id: string;
  title: string;
  image: string;
  price: number;
}

const Case: React.FC<CaseProps> = ({ id, title, image, price }) => {
  const [hover, setHover] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  return (
    <div
      className="group flex flex-col w-64 items-center rounded-2xl transition-all duration-300 cursor-pointer bg-gradient-to-b from-[#1a1511] to-[#0a0807] border-2 border-gray-800/80 hover:border-[#ECA823]/60 relative overflow-hidden"
      key={id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        boxShadow: hover ? `0px 10px 40px rgba(236,168,35,.2), inset 0px 0px 20px rgba(236,168,35,.1)` : "0px 10px 20px rgba(0,0,0,.5)",
        transform: hover ? "translateY(-8px) scale(1.02)" : "scale(1)",
      }}
    >
      {/* Glow effect inside card */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#ECA823]/0 to-[#ECA823]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {!loaded && (
        <div className="flex w-full h-64 items-center justify-center">
          <RotatingLines
            strokeColor="#ECA823"
            strokeWidth="5"
            animationDuration="0.75"
            width="40px"
            visible={true}
          />
        </div>
      )}
      
      <div className={`relative w-full flex justify-center items-center h-40 md:h-64 mt-4 ${loaded ? '' : 'hidden'}`}>
        {/* Spotlight / Pedestal effect behind image */}
        <div className="absolute bottom-10 w-32 h-8 bg-[#ECA823] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full pointer-events-none" />
        <img loading="lazy" decoding="async"
          src={image}
          alt={title}
          className="w-2/3 md:w-5/6 object-contain z-10 drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)] group-hover:drop-shadow-[0_20px_25px_rgba(236,168,35,0.4)] transition-all duration-300"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <div className="flex flex-col w-full px-4 pb-6 pt-2 items-center relative z-10 border-t border-gray-800/60 bg-black/20">
        <div className="font-black text-xl text-gray-200 uppercase tracking-widest mt-2 group-hover:text-white transition-colors">{title}</div>
        <div className="mt-3 font-bold text-lg text-[#25D160] bg-green-900/30 px-6 py-1.5 rounded-full border border-green-500/30 shadow-[0_0_10px_rgba(37,209,96,0.1)] group-hover:shadow-[0_0_15px_rgba(37,209,96,0.3)] transition-all">
          <Monetary value={price}/>
        </div>
      </div>
    </div>
  );
};

export default Case;


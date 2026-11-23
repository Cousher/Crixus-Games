interface TitleProps {
  title: string;
  subtitle?: string;
}

const Title: React.FC<TitleProps> = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-8 px-4 text-center">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="h-[2px] w-8 sm:w-14 bg-gradient-to-r from-transparent to-[#d4af37]" />
        <span className="w-2 h-2 rotate-45 bg-[#ffd966] shadow-[0_0_10px_rgba(255,217,102,0.8)] shrink-0" />
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-[0.18em] gold-text">
          {title}
        </h2>
        <span className="w-2 h-2 rotate-45 bg-[#ffd966] shadow-[0_0_10px_rgba(255,217,102,0.8)] shrink-0" />
        <span className="h-[2px] w-8 sm:w-14 bg-gradient-to-l from-transparent to-[#d4af37]" />
      </div>
      {subtitle && (
        <p className="text-xs sm:text-sm text-[#9b8d6f] mt-1.5 tracking-wide">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default Title;

import { TailSpin } from "react-loader-spinner";
import { motion } from "framer-motion";

interface MainButtonProps {
  text: string | JSX.Element;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  submit?: boolean;
  icon?: any;
  iconPosition?: "left" | "right";
  type?: "button" | "danger" | "success" | "warning" | "info" | "dark";
  pulse?: boolean;
  textSize?: string;
}

const MainButton: React.FC<MainButtonProps> = ({
  text,
  onClick,
  disabled,
  loading,
  submit,
  icon,
  iconPosition = "left",
  type = "button",
  pulse,
  textSize,
}) => {
  const colorClasses = {
    button:
      "bg-gradient-to-r from-[#8f1818] via-[#b82020] to-[#8f1818] hover:brightness-110 border border-[#d4af37]/45 text-[#fff5d6] shadow-[0_6px_18px_rgba(155,28,28,0.35)]",
    danger:
      "bg-gradient-to-r from-red-700 to-red-600 hover:brightness-110 border border-red-400/40 text-white",
    success:
      "bg-gradient-to-r from-[#15803d] via-[#16a34a] to-[#15803d] hover:brightness-110 border border-emerald-400/45 text-white shadow-[0_6px_18px_rgba(22,163,74,0.3)]",
    warning:
      "bg-gradient-to-r from-[#b8901f] via-[#e5bc48] to-[#b8901f] hover:brightness-110 border border-[#fff2c2]/60 text-[#1a1204]",
    info: "bg-blue-700 hover:bg-blue-600 border border-blue-400/40 text-white",
    dark: "bg-[#1a150f] hover:bg-[#241d14] border border-[#3a2f1d] text-[#c8bba0]",
  };

  const pulseClass = pulse ? "cta-pulse" : "";

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ scale: disabled ? 1 : 1.015 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`btn-shine flex items-center justify-center w-full min-h-[42px] px-4 py-2 ${colorClasses[type]} rounded-xl font-extrabold tracking-wide transition-all cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : pulseClass
      } ${textSize ? textSize : "text-sm sm:text-base"}`}
      onClick={onClick}
      disabled={disabled}
      type={submit ? "submit" : "button"}
    >
      {loading ? (
        <TailSpin
          height="20"
          width="20"
          color="currentColor"
          ariaLabel="loading"
          radius="1"
        />
      ) : (
        <>
          {icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
          {text}
          {icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};

export default MainButton;

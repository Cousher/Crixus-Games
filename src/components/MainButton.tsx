import { TailSpin } from "react-loader-spinner";
import { motion } from "framer-motion";

interface MainButton {
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

const MainButton: React.FC<MainButton> = ({
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
    button: "bg-[#9B1C1C] hover:bg-[#7d1414] focus:ring-[#D4AF37]",
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
    warning: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
    info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    dark: "bg-gray-800 hover:bg-gray-900 focus:ring-gray-500",
  };

  const pulseClass = pulse ? "animate-bounce " : "";

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`btn-shine flex items-center justify-center w-full h-10 ${colorClasses[type]} 
      focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md
      text-white font-medium ${disabled ? "opacity-50 cursor-not-allowed" : pulseClass} ${
        textSize ? textSize : "md:text-lg"
      }`}
      onClick={onClick}
      disabled={disabled}
      type={submit ? "submit" : "button"}
    >
      {loading ? (
        <TailSpin
          height="20"
          width="20"
          color="#fff"
          ariaLabel="tail-spin-loading"
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


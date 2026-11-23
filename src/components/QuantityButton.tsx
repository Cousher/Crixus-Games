interface QuantityButtonProps {
    quantity: number;
    setQuantity: (quantity: number) => void;
    disabled?: boolean;
}

const QuantityButton: React.FC<QuantityButtonProps> = ({ quantity, setQuantity, disabled }) => {
    const handleIncrement = () => {
        if (quantity < 5 && !disabled) {
            setQuantity(quantity + 1);
        }
    };

    const handleDecrement = () => {
        if (quantity > 1 && !disabled) {
            setQuantity(quantity - 1);
        }
    };

    const btnBase =
        "w-10 h-10 p-0 flex items-center justify-center font-black text-lg text-[#ffe9a8] hover:bg-[#2a2010] transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer select-none";

    return (
        <div className="inline-flex items-center rounded-xl overflow-hidden border border-[#d4af37]/45 bg-[#120e09] shadow-inner">
            <button
                type="button"
                className={btnBase}
                onClick={handleDecrement}
                disabled={disabled || quantity <= 1}
                aria-label="Disminuir cantidad"
            >
                −
            </button>
            <span className="w-9 text-center font-mono font-black text-sm text-[#fff3c4] tabular-nums select-none">
                {quantity}x
            </span>
            <button
                type="button"
                className={btnBase}
                onClick={handleIncrement}
                disabled={disabled || quantity >= 5}
                aria-label="Aumentar cantidad"
            >
                +
            </button>
        </div>
    );
};

export default QuantityButton;

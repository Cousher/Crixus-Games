import { useEffect } from "react";
import { IoMdClose } from "react-icons/io";

interface ModalProps {
  children: JSX.Element;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  width?: string;
}

const Modal: React.FC<ModalProps> = ({ children, open, setOpen, width = "600px" }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-[999] p-3 sm:p-4"
      id="wrapped"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="max-h-[90vh] w-full flex flex-col overflow-y-auto rounded-2xl border border-[#d4af37]/40 bg-gradient-to-b from-[#1f1912] via-[#15110c] to-[#0f0c08] shadow-[0_30px_80px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,233,168,0.12)] relative"
        style={{ maxWidth: width }}
      >
        {/* Top Imperial Accent Hairline */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          className="absolute top-3 right-3 z-10 w-8 h-8 p-0 rounded-full bg-[#130f0a] border border-[#d4af37]/30 text-[#c8bba0] hover:text-[#ffe9a8] hover:border-[#ffd966] flex items-center justify-center transition-colors cursor-pointer"
          onClick={() => setOpen(false)}
          aria-label="Cerrar ventana"
        >
          <IoMdClose className="w-4 h-4 shrink-0" />
        </button>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 text-[#f5ead4]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

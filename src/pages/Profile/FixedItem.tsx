import Rarities from "../../components/Rarities";
import { RiDoubleQuotesL } from "react-icons/ri";
import { putFixDescription } from "../../services/users/UserServices";
import { useState } from "react";
import { BiEditAlt } from "react-icons/bi";


interface IfixedItem {
    fixedItem: any;
    isSameUser: boolean;
    setRefresh?: React.Dispatch<React.SetStateAction<boolean>>;
}

const FixItem: React.FC<IfixedItem> = ({ fixedItem, isSameUser, setRefresh }) => {
    const [description, setDescription] = useState<string>(
        fixedItem ? fixedItem.description : ""
    );
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isHovering, setIsHovering] = useState<boolean>(false);

    const updateFixDescription = async (description: string) => {
        try {
            await putFixDescription(description);
            setRefresh && setRefresh((prev) => !prev);

        } catch (error) {
            console.log(error);
        }
    };

    const rarityColor = Rarities.find((rarity) => rarity.id == fixedItem.rarity)?.color || "#d4af37";

    const TextArea = () => {
        return (
            <div className="flex flex-col items-center justify-center gap-2">
                <textarea
                    className="w-36 h-16 rounded-xl bg-[#110d09] border border-[#d4af37]/60 p-2 text-xs text-[#efe6cf] resize-none outline-none"
                    maxLength={50}
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                    }}
                />
                <button
                    type="button"
                    className="bg-gradient-to-r from-[#a67c1e] to-[#d4af37] text-black font-extrabold text-xs rounded-lg px-3 py-1"
                    onClick={() => {
                        updateFixDescription(description);
                        setIsEditing(false);
                    }}
                >
                    Guardar
                </button>
            </div>
        );
    };

    return (
        <div
            className="flex p-3 rounded-xl border border-[#33281b] w-full h-36 relative overflow-hidden"
            style={{
                backgroundImage: `linear-gradient(270deg, ${rarityColor}33 0%, rgba(17,13,9,0.95) 85%)`,
            }}
        >
            <div className="flex items-center justify-between gap-3 px-2 w-full">
                <div className="flex-1 min-w-0">
                    {fixedItem.description ? (
                        <div className="flex items-center justify-center gap-1">
                            <RiDoubleQuotesL className="text-lg text-[#d4af37] shrink-0" />
                            {isEditing ? (
                                TextArea()
                            ) : (
                                <div
                                    className="max-w-[150px] overflow-hidden flex items-center gap-1 transition-all"
                                    onMouseEnter={() => setIsHovering(true)}
                                    onMouseLeave={() => setIsHovering(false)}
                                >
                                    <span className="text-center text-xs italic text-[#efe6cf] line-clamp-3">
                                        {fixedItem.description ? description : "Sin descripción"}
                                    </span>

                                    {isSameUser && isHovering && (
                                        <BiEditAlt
                                            className="text-lg text-[#ffe9a8] cursor-pointer shrink-0"
                                            onClick={() => setIsEditing(true)}
                                        />
                                    )}
                                </div>
                            )}
                            <RiDoubleQuotesL className="text-lg text-[#d4af37] rotate-180 shrink-0" />
                        </div>
                    ) : (
                        isSameUser && (
                            <div className="flex items-center justify-center gap-1 text-xs text-[#a39475]">
                                <RiDoubleQuotesL className="text-lg text-[#d4af37]" />
                                {isEditing ? (
                                    TextArea()
                                ) : (
                                    <span
                                        className="text-center flex items-center gap-1 cursor-pointer hover:text-[#ffe9a8]"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Editar nota <BiEditAlt />
                                    </span>
                                )}
                                <RiDoubleQuotesL className="text-lg text-[#d4af37] rotate-180" />
                            </div>
                        )
                    )}
                </div>
                <div className="flex flex-col items-center justify-center shrink-0">
                    <img
                        loading="lazy"
                        decoding="async"
                        src={fixedItem.image}
                        alt={fixedItem.name}
                        className="w-20 h-20 object-contain rounded drop-shadow-[0_8px_12px_rgba(0,0,0,0.85)]"
                    />
                    <p className="text-xs pt-1 font-extrabold text-[#f5ead4] truncate max-w-[120px]">
                        {fixedItem.name}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FixItem;
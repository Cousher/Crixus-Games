import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { Link } from "react-router-dom";

interface AvatarProps {
    image: string;
    id: string;
    size: "small" | "medium" | "large" | "extra-large";
    loading?: boolean;
    level: number;
    showLevel?: boolean;
}

const FALLBACK_AVATAR = "/images/logo-crixus-v2.jpg";

// Refined Imperial Rank metallic tiers (replaces acid neon #FF00FF / #0066FF)
function getTierStyle(level: number) {
    if (level >= 100) {
        return { border: "#ffd966", bg: "#8a6210", text: "#fff8db" }; // Sovereign Gold
    }
    if (level >= 60) {
        return { border: "#e63946", bg: "#7f1d1d", text: "#ffe4e6" }; // Imperial Crimson
    }
    if (level >= 35) {
        return { border: "#d4af37", bg: "#5c4310", text: "#fff3c4" }; // Gladiator Gold
    }
    if (level >= 20) {
        return { border: "#a855f7", bg: "#4c1d95", text: "#f3e8ff" }; // Praetorian Amethyst
    }
    if (level >= 10) {
        return { border: "#10b981", bg: "#065f46", text: "#d1fae5" }; // Legion Emerald
    }
    return { border: "#cd7f32", bg: "#4a2a12", text: "#fde6c4" }; // Arena Bronze
}

const Avatar: React.FC<AvatarProps> = ({
    image,
    loading,
    id,
    size,
    level = 0,
    showLevel = false,
}) => {
    const [loaded, setLoaded] = useState<boolean>(false);
    const [imgSrc, setImgSrc] = useState<string>(image || FALLBACK_AVATAR);

    const tier = getTierStyle(level);

    let sizeClasses = "w-10 h-10";
    let skeletonSize = 40;
    let levelClasses = "min-w-[20px] h-5 px-1 text-[10px] -bottom-1 -right-1";

    switch (size) {
        case "small":
            sizeClasses = "w-9 h-9 sm:w-10 sm:h-10";
            skeletonSize = 40;
            levelClasses = "min-w-[19px] h-[19px] px-1 text-[10px] -bottom-1 -right-1";
            break;
        case "medium":
            sizeClasses = "w-12 h-12";
            skeletonSize = 48;
            levelClasses = "min-w-[22px] h-5 px-1 text-[10px] -bottom-1 -right-1";
            break;
        case "large":
            sizeClasses = "w-24 h-24";
            skeletonSize = 96;
            levelClasses = "min-w-[28px] h-7 px-1.5 text-xs bottom-0 right-0";
            break;
        case "extra-large":
            sizeClasses = "w-32 h-32 sm:w-36 sm:h-36";
            skeletonSize = 144;
            levelClasses = "min-w-[30px] h-7 px-2 text-xs bottom-1 right-1";
            break;
    }

    const effectiveSrc = image ? (imgSrc === FALLBACK_AVATAR && image !== FALLBACK_AVATAR ? image : imgSrc) : FALLBACK_AVATAR;

    return (
        <div className="inline-flex items-center justify-center shrink-0">
            {loading ? (
                <Skeleton
                    circle={true}
                    height={skeletonSize}
                    width={skeletonSize}
                    highlightColor="#241d15"
                    baseColor="#16120d"
                />
            ) : (
                <Link
                    to={`/profile/${id}`}
                    className="relative inline-flex items-center justify-center rounded-full group"
                    aria-label={`Perfil nivel ${level}`}
                >
                    {!loaded && (
                        <Skeleton
                            circle={true}
                            height={skeletonSize}
                            width={skeletonSize}
                            highlightColor="#241d15"
                            baseColor="#16120d"
                        />
                    )}

                    <img
                        src={effectiveSrc}
                        alt="Avatar del jugador"
                        className={`${sizeClasses} rounded-full object-cover border-2 aspect-square transition-transform duration-200 group-hover:scale-105 shadow-[0_0_12px_rgba(0,0,0,0.65)] ${
                            loaded ? "" : "hidden"
                        }`}
                        style={{ borderColor: tier.border }}
                        onLoad={() => setLoaded(true)}
                        onError={() => {
                            if (imgSrc !== FALLBACK_AVATAR) setImgSrc(FALLBACK_AVATAR);
                            setLoaded(true);
                        }}
                    />

                    {showLevel && (
                        <span
                            className={`absolute rounded-full font-black font-mono tabular-nums flex justify-center items-center border shadow-md leading-none ${levelClasses}`}
                            style={{
                                backgroundColor: tier.bg,
                                borderColor: tier.border,
                                color: tier.text,
                            }}
                        >
                            {level}
                        </span>
                    )}
                </Link>
            )}
        </div>
    );
};

export default Avatar;

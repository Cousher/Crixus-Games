import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface CountdownProps {
    nextBonus: any;
    color?: string;
    bold?: boolean;
    compact?: boolean;
}

const formatRemaining = (nextBonus: any) => {
    if (!nextBonus) return "00:00";
    const diffMs = new Date(nextBonus).getTime() - Date.now();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return "00:00";
    const totalSeconds = Math.ceil(diffMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const Countdown: React.FC<CountdownProps> = ({
    nextBonus,
    color = "#ffe9a8",
    bold = true,
    compact = false,
}) => {
    const [untilNextBonus, setUntilNextBonus] = useState<string>(() => formatRemaining(nextBonus));
    const { t } = useTranslation();

    useEffect(() => {
        setUntilNextBonus(formatRemaining(nextBonus));
        const interval = setInterval(() => {
            setUntilNextBonus(formatRemaining(nextBonus));
        }, 1000);
        return () => clearInterval(interval);
    }, [nextBonus]);

    if (compact) {
        return <span className="font-mono tabular-nums">{untilNextBonus}</span>;
    }

    return (
        <div className="text-sm">
            {untilNextBonus !== "00:00" ? (
                <p style={{ color, fontWeight: bold ? "bold" : "normal" }}>
                    {t("rewards.nextBonusIn", { time: untilNextBonus })}
                </p>
            ) : (
                <p style={{ color, fontWeight: bold ? "bold" : "normal" }}>
                    {t("rewards.bonusAvailable")}
                </p>
            )}
        </div>
    );
};

export default Countdown;

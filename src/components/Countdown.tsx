import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CountdownProps {
    nextBonus: any;
    color?: string;
    bold?: boolean;
}

const Countdown: React.FC<CountdownProps> = ({ nextBonus, color = "#2d2b49", bold = true }) => {
    const [untilNextBonus, setUntilNextBonus] = useState<string>("8:00");
    const { t } = useTranslation();

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const bonusTime = new Date(nextBonus).getTime();
            const difference = bonusTime - now;
            const seconds = Math.floor(difference / 1000);
            const result = new Date(seconds * 1000).toISOString().substring(14, 19)
            setUntilNextBonus(result);
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [nextBonus]);

    return (
        <div className='text-sm w-[160px]'>
            {untilNextBonus !== "00:00" ? (
                <p style={{
                    color: color,
                    fontWeight: bold ? "bold" : "normal"
                }}>{t("rewards.nextBonusIn", { time: untilNextBonus })}</p>
            ) : (
                <p style={{
                    color: color,
                    fontWeight: bold ? "bold" : "normal"
                }}>{t("rewards.bonusAvailable")}</p>
            )}
        </div>
    );
};

export default Countdown;
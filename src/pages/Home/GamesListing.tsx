import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Title from "../../components/Title";

interface GameListingProps {
    name: string;
    description?: string;
}

type Badge = "hot" | "live" | "new";

const games: { id: string; title: string; tkey: string; image: string; link: string; badge?: Badge; taglineKey: string }[] = [
    { id: "bigbass", title: "Big Bass Imperial", tkey: "nav.bigbass", image: "/images/tiles/bigbass_v2.webp", link: "/bigbass", badge: "live", taglineKey: "ux.tagBigBass" },
    { id: "balloon", title: "Globo Imperial", tkey: "nav.balloon", image: "/images/tiles/balloon_v2.webp", link: "/balloon", badge: "new", taglineKey: "ux.tagBalloon" },
    { id: "road", title: "Gladiator Road", tkey: "nav.road", image: "/images/tiles/road_v2.webp", link: "/road", badge: "live", taglineKey: "ux.tagRoad" },
    { id: "crash", title: "Crash", tkey: "nav.crash", image: "/images/tiles/crash_v2.webp", link: "/crash", badge: "hot", taglineKey: "ux.tagCrash" },
    { id: "slot", title: "Slot", tkey: "nav.slots", image: "/images/tiles/slot_v2.webp", link: "/slot", badge: "hot", taglineKey: "ux.tagSlot" },
    { id: "mines", title: "Mines", tkey: "nav.mines", image: "/images/tiles/mines_v2.webp", link: "/mines", badge: "hot", taglineKey: "ux.tagMines" },
    { id: "coinflip", title: "CoinFlip", tkey: "nav.coinflip", image: "/images/tiles/coinflip_v2.webp", link: "/coinflip", badge: "live", taglineKey: "ux.tagCoin" },
    { id: "upgrade", title: "Upgrade", tkey: "nav.upgrade", image: "/images/tiles/upgrade_v2.webp", link: "/upgrade", taglineKey: "ux.tagUpgrade" },
];

const badgeStyles: Record<Badge, string> = {
    hot: "bg-gradient-to-r from-orange-500 to-red-600 text-white",
    live: "bg-green-500 text-black",
    new: "bg-gradient-to-r from-[#b8901f] to-[#ffd966] text-black",
};

const GameListing: React.FC<GameListingProps> = ({ name, description }) => {
    const { t, i18n } = useTranslation();
    const es = (i18n.language || "es").startsWith("es");

    return (
        <section className="w-full flex flex-col gap-2 py-6 sm:py-8 items-center" key={name}>
            <div className="flex flex-col items-center justify-center w-full max-w-[1440px] px-4">
                <Title
                    title={name}
                    subtitle={
                        description ||
                        (es
                            ? "Elegí tu desafío en la arena · Provably Fair y optimizado para celular"
                            : "Choose your arena challenge · Provably Fair and mobile optimized")
                    }
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-5 w-full">
                    {games.map((item, i) => (
                        <Link
                            to={item.link}
                            key={item.id}
                            className="group game-card card-rise relative flex flex-col rounded-2xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                            style={{ animationDelay: `${i * 70}ms` }}
                        >
                            <div className="relative overflow-hidden rounded-xl border-2 border-[#d4af37]/45 group-hover:border-[#ffd966] bg-[#0b0908] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] transition-colors duration-300">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    loading="lazy"
                                    decoding="async"
                                    width={512}
                                    height={696}
                                    className="w-full aspect-[256/348] object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                                />
                                {/* shine sweep */}
                                <span className="game-card-shine" aria-hidden="true" />
                                {/* play overlay */}
                                <div className="absolute inset-0 flex items-end justify-center pb-6 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="px-5 py-2 rounded-full bg-gradient-to-r from-[#b8901f] to-[#ffd966] text-black font-extrabold text-sm tracking-wide shadow-[0_0_20px_rgba(212,175,55,0.6)] translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                                        ▶ {t("home.play")}
                                    </span>
                                </div>
                                {item.badge && (
                                    <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase shadow-lg ${badgeStyles[item.badge]}`}>
                                        {item.badge === "live" && <span className="inline-block w-1.5 h-1.5 mr-1 mb-[1px] rounded-full bg-black animate-pulse" />}
                                        {t(`ux.badge_${item.badge}`)}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col items-center pt-2">
                                <span className="text-white font-bold text-base md:text-lg">{t(item.tkey)}</span>
                                <span className="text-[11px] md:text-xs text-[#b9a77a] text-center">{t(item.taglineKey)}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default GameListing;

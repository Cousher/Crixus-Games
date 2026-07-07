import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Title from "../../components/Title";

interface GameListingProps {
    name: string;
    description?: string;
}

const GameListing: React.FC<GameListingProps> = ({
    name,
    description,
}) => {
  const { t } = useTranslation();

    const games = [
        {
            id: "1",
            title: "Crash", tkey: "nav.crash",
            image: "/images/tiles/crash.svg",
            link: "/crash"
        },
        {
            id: "2",
            title: "CoinFlip", tkey: "nav.coinflip",
            image: "/images/tiles/coinflip.svg",
            link: "/coinflip"
        }, {
            id: "3",
            title: "Upgrade", tkey: "nav.upgrade",
            image: "/images/tiles/upgrade.svg",
            link: "/upgrade"
        },
        {
            id: "4",
            title: "Slot", tkey: "nav.slots",
            image: "/images/tiles/slot.svg",
            link: "/slot"
        },
    ]
    return (
        <div className="w-full flex flex-col gap-4 py-10 items-center" key={name}>
            <div className="flex flex-col items-center justify-center max-w-[1600px]">
                <Title title={name} />
                {description && <div className="text">{description}</div>}
                {
                    <div className="flex flex-col md:flex-row items-center w-full justiy-center gap-8 flex-wrap">
                        {
                            games.map((item: any) => (
                                <Link to={item.link} key={item.id}>
                                    <div className="flex flex-col card-hover card-rise cursor-pointer rounded-xl p-1">
                                        <img src={item.image} alt={item.title} className="w-[256px] h-[348px] object-contain" />
                                        <div className="text text-center">{t("home.play")} {t(item.tkey)}</div>

                                    </div>
                                </Link>
                            ))

                        }
                    </div>
                }
            </div>
        </div>
    );
};

export default GameListing;



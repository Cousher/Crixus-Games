import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import CaseListing from "./CaseListing";
import GameListing from "./GamesListing";
import Leaderboard from "./Leaderboard";
import HomeHero from "./HomeHero";
import { getCases } from "../../services/cases/CaseServices";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";

const Home = () => {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const discordURL = import.meta.env.VITE_DISCORD_INVITE;

  useEffect(() => {
    const getNewCases = async () => {
      setLoading(true);
      try {
        const response = await getCases();
        setCases(response || []);
      } catch {
        setCases([]);
        toast.error(t("toast.connError"));
      }
      setLoading(false);
    };
    getNewCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex justify-center pb-8">
      <div className="flex flex-col w-full max-w-[1600px]">
        <HomeHero />

        <GameListing name={t("home.ourGames")} />

        {loading ? (
          <div className="w-full flex justify-center px-4 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-[920px]">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  height={280}
                  borderRadius={16}
                  highlightColor="#14110c"
                  baseColor="#221d16"
                />
              ))}
            </div>
          </div>
        ) : (
          <CaseListing
            name={t("home.newCases")}
            cases={cases.length > 6 ? cases.slice(0, 6) : cases}
          />
        )}

        {discordURL && (
          <div className="flex items-center justify-center w-full px-4 py-4">
            <div className="w-full max-w-[960px] rounded-2xl border border-[#5865F2]/40 bg-gradient-to-r from-[#1a1826] via-[#171422] to-[#1a1826] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_14px_35px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  {es ? "¿Querés sumarte a la comunidad de Crixus?" : "Want to join the Crixus community?"}
                </span>
                <span className="text-xs sm:text-sm text-[#b9b4d4] mt-0.5">
                  {es
                    ? "Enterate de eventos, sorteos y novedades en nuestro Discord oficial."
                    : "Get events, giveaways and updates on our official Discord."}
                </span>
              </div>
              <a
                href={discordURL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5 group"
              >
                <svg
                  className="w-5 h-5 fill-current group-hover:scale-110 transition-transform"
                  viewBox="0 0 127.14 96.36"
                >
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-23.28-3.28-47.56-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
                <span>{es ? "Unirme al Discord" : "Join Discord"}</span>
              </a>
            </div>
          </div>
        )}

        <Leaderboard />
      </div>
    </div>
  );
};

export default Home;

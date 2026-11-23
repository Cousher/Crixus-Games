import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { FaShieldAlt, FaCrown } from "react-icons/fa";
import Modal from "./Modal";
import TermsOfPrivacy from "./modalsChilden/TermsOfPrivacy";
import UserAgreement from "./modalsChilden/UserAgreement";
import HowToPlay from "./modalsChilden/HowToPlay";
import AboutTheMarket from "./modalsChilden/AboutTheMarket";
import HowGamesWork from "./modalsChilden/HowGamesWork";
import ContactUs from "./modalsChilden/ContactUs";
import FAQ from "./modalsChilden/FAQ";
import Artists from "./modalsChilden/Artists";

function Footer() {
  const { t, i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<JSX.Element>(<></>);

  const navigate = useNavigate();

  const handleModalInfo = (content: JSX.Element) => {
    setModalContent(content);
    setShowModal(true);
  };

  const sections = [
    {
      title: t("footer.games"),
      links: [
        { title: t("road.title"), onClick: () => navigate("/road") },
        { title: t("nav.crash"), onClick: () => navigate("/crash") },
        { title: t("nav.slots"), onClick: () => navigate("/slot") },
        { title: t("nav.mines"), onClick: () => navigate("/mines") },
        { title: t("nav.coinflip"), onClick: () => navigate("/coinflip") },
        { title: t("nav.upgrade"), onClick: () => navigate("/upgrade") },
      ],
    },
    {
      title: t("footer.main"),
      links: [
        { title: t("nav.market"), onClick: () => navigate("/marketplace") },
        { title: t("nav.rewards"), onClick: () => navigate("/rewards") },
        { title: t("footer.howToPlay"), onClick: () => handleModalInfo(<HowToPlay />) },
        { title: t("footer.aboutMarket"), onClick: () => handleModalInfo(<AboutTheMarket />) },
        { title: t("footer.howGamesWork"), onClick: () => handleModalInfo(<HowGamesWork />) },
      ],
    },
    {
      title: t("footer.aboutUs"),
      links: [
        { title: t("footer.termsPrivacy"), onClick: () => handleModalInfo(<TermsOfPrivacy />) },
        { title: t("footer.userAgreement"), onClick: () => handleModalInfo(<UserAgreement />) },
        { title: t("footer.artists"), onClick: () => handleModalInfo(<Artists />) },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        { title: t("footer.contactUs"), onClick: () => handleModalInfo(<ContactUs />) },
        { title: t("footer.faq"), onClick: () => handleModalInfo(<FAQ />) },
      ],
    },
  ];

  return (
    <footer className="relative w-full bg-gradient-to-b from-[#130f0b] via-[#0c0a08] to-[#080706] text-white mt-4">
      {/* Top Imperial Golden Hairline */}
      <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/65 to-transparent" />

      <Modal open={showModal} setOpen={setShowModal}>
        {modalContent}
      </Modal>

      <div className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6">
          {/* Brand Column */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left gap-3.5">
            <Link to="/" className="group inline-flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-md opacity-25 group-hover:opacity-55 transition-opacity" />
                <img
                  src="/images/logo-crixus-v2.jpg"
                  alt="Crixus Games"
                  loading="lazy"
                  className="relative w-14 h-14 object-cover rounded-full border-2 border-[#d4af37]/65 shadow-[0_0_18px_rgba(212,175,55,0.35)]"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-black uppercase tracking-[0.14em] gold-text">
                  Crixus Games
                </span>
                <span className="text-[10px] uppercase tracking-[0.24em] text-[#9b8d6f] font-bold">
                  {es ? "El Coliseo del Casino Social" : "Imperial Social Casino"}
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-[#a89b82] leading-relaxed max-w-sm">
              {es
                ? "Entrá a la arena: abrí cofres imperiales, forjá reliquias y probá tu suerte en juegos Provably Fair con fichas virtuales."
                : "Enter the arena: open imperial chests, forge relics and test your luck in Provably Fair games with virtual coins."}
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18130c] border border-[#d4af37]/30 text-[10px] font-bold uppercase tracking-wider text-[#e6ca6a]">
                <FaShieldAlt className="text-[#d4af37]" />
                Provably Fair
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18130c] border border-[#d4af37]/30 text-[10px] font-bold uppercase tracking-wider text-[#c8bba0]">
                <FaCrown className="text-[#d4af37]" />
                {es ? "Fichas virtuales" : "Virtual coins"}
              </span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
            {sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-2.5">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ffe9a8] pb-1.5 border-b border-[#d4af37]/20 w-fit">
                  {section.title}
                </span>
                <div className="flex flex-col gap-1.5">
                  {section.links.map((link) => (
                    <button
                      key={link.title}
                      type="button"
                      onClick={link.onClick}
                      className="text-left text-xs sm:text-sm text-[#b9a77a] hover:text-[#ffe9a8] bg-transparent border-none p-0 font-medium transition-colors w-fit"
                    >
                      {link.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-9 pt-5 border-t border-[#d4af37]/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7d725c]">
          <span>Crixus Games © {new Date().getFullYear()}</span>
          <span className="text-center sm:text-right">
            {es
              ? "Entretenimiento social con monedas virtuales · Sin apuestas con dinero real"
              : "Social entertainment with virtual currency · No real-money wagering"}
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

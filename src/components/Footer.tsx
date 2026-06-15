import Modal from "./Modal";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TermsOfPrivacy from "./modalsChilden/TermsOfPrivacy"
import UserAgreement from "./modalsChilden/UserAgreement"
import HowToPlay from "./modalsChilden/HowToPlay"
import AboutTheMarket from "./modalsChilden/AboutTheMarket"
import HowGamesWork from "./modalsChilden/HowGamesWork";
import ContactUs from "./modalsChilden/ContactUs";
import FAQ from "./modalsChilden/FAQ";
import Artists from "./modalsChilden/Artists";

function Footer() {
  const { t } = useTranslation();
  // Toggle modal
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<JSX.Element>(<></>);

  const navigate = useNavigate();

  const handleModalInfo = (content: JSX.Element) => {
    setModalContent(content);
    setShowModal(true);
  }

  const sections = [
    {
      title: t("footer.main"),
      links: [
        {
          title: t("footer.howToPlay"),
          onClick: () => handleModalInfo(<HowToPlay />),
        },
        {
          title: t("footer.aboutMarket"),
          onClick: () => handleModalInfo(<AboutTheMarket />),
        },
        {
          title: t("footer.howGamesWork"),
          onClick: () => handleModalInfo(<HowGamesWork />),
        },
      ],
    },
    {
      title: t("footer.aboutUs"),
      links: [
        {
          title: t("footer.termsPrivacy"),
          onClick: () => handleModalInfo(<TermsOfPrivacy />),
        },
        {
          title: t("footer.userAgreement"),
          onClick: () => handleModalInfo(<UserAgreement />),
        },
        {
          title: t("footer.artists"),
          onClick: () => handleModalInfo(<Artists />),
        }
      ],
    },
    {
      title: t("footer.games"),
      links: [
        {
          title: t("nav.crash"),
          onClick: () => navigate("/crash"),
        },
        {
          title: t("nav.coinflip"),
          onClick: () => navigate("/coinflip"),
        },
        {
          title: t("nav.slots"),
          onClick: () => navigate("/slot"),
        },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        {
          title: t("footer.contactUs"),
          onClick: () => handleModalInfo(<ContactUs />),
        },
        {
          title: t("footer.faq"),
          onClick: () => handleModalInfo(<FAQ />),
        },
      ],
    }, {
      title: t("footer.paymentForms"),
      children: <div className="flex flex-col items-start gap-2">
        <img src="/images/PIX_Logo2.webp" alt="PIX" />
        <img src="/images/cards.webp" alt="cards">

        </img>
      </div>
    }
  ];

  return (
    <footer className="flex flex-col items-center justify-center w-full py-6 text-white bg-[#0b0b0e] ">
      <Modal open={showModal} setOpen={setShowModal}>
        {modalContent}
      </Modal>

      <div className="flex flex-col items-center justify-center gap-2 p-1">
        <Link to="/">
          <div className="flex items-center ">
            <img
              src="/images/logo.svg"
              alt="logo"
              className="w-36 h-24 object-contain"
            />

          </div>
        </Link>
        <span className="font-bold hidden md:flex">
          CRIXUS GAMES
        </span>
      </div>

      <div className="flex flex-col w-10/12 mt-2">
        <div className="w-full h-[1px] bg-gray-500 opacity-10" />
        <div className="flex flex-col md:flex-row mt-4">
          {
            sections.map((section, index) => (
              <div key={index} className="flex flex-col w-full gap-2 my-2">
                <span className="font-bold text-xl">{section.title}</span>
                <div className="flex flex-col gap-1">
                  {
                    section.links && section.links.map((link, index) => (
                      <span
                        key={index}
                        onClick={link.onClick}
                        className="cursor-pointer hover:underline text-sm"
                      >
                        {link.title}
                      </span>
                    ))
                  }
                </div>
                {section.children}
              </div>
            ))
          }
        </div>
      </div>

      <div className="w-full mt-4 flex flex-col items-center justify-center gap-3">
        <div className="w-full h-[1px] bg-gray-500 opacity-10" />
        <span className="text-sm text-center">
          Crixus Games © {new Date().getFullYear()}
        </span>
      </div>


    </footer>
  );
}

export default Footer;


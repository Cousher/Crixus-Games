import { useTranslation } from "react-i18next";

const Row = ({ title, content }: { title: string, content: string }) => (
  <div className="mb-2">
    <span className="font-bold">{title}: </span>
    <span className="ml-2 text-justify">{content}</span>
  </div>
);

const AboutTheMarket = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const heading = es ? "Sobre el Mercado de Crixus Games" : "About the Crixus Games Market";
  const intro = es
    ? "Explorá el mercado virtual de Crixus Games, donde podés comprar y vender ítems del juego con otros jugadores. Acá te explicamos cómo funciona."
    : "Explore the virtual marketplace at Crixus Games, where you can buy and sell in-game items with other players. Read on to understand how the market works.";
  const rows = es ? [
    { title: '1. Publicar ítems', content: 'Los jugadores pueden publicar sus ítems a la venta, fijando precios según la rareza y la demanda de cada uno.' },
    { title: '2. Comprar ítems', content: 'Recorré el mercado para descubrir distintos ítems disponibles. Elegí según tus preferencias, estrategia y objetivos.' },
    { title: '3. Vender ítems', content: 'Vendé tus ítems repetidos o que no querés para ganar moneda del juego (K₽). Poné precios competitivos para atraer compradores.' },
    { title: '4. Economía del mercado', content: 'La economía del mercado se mueve por la rareza de los ítems y la demanda de los jugadores. Seguí las tendencias y ajustá tu estrategia.' },
    { title: '5. Interacción entre jugadores', content: 'Interactuá con otros jugadores a través del mercado. Negociá precios, hacé tratos y construí una economía próspera.' },
    { title: '6. Transparencia', content: 'El mercado funciona con transparencia. Compradores y vendedores ven la información relevante de cada transacción.' },
  ] : [
    { title: '1. Item Listing', content: 'Players can list their in-game items for sale on the market, setting prices based on the rarity and demand for each item.' },
    { title: '2. Buying Items', content: 'Browse the market to discover a variety of items available for purchase. Choose items based on your preferences, strategy, and in-game goals.' },
    { title: '3. Selling Items', content: 'Sell your unwanted or duplicate items on the market to earn in-game currency (K₽). Set competitive prices to attract potential buyers.' },
    { title: '4. Market Economy', content: "The market's economy is driven by the rarity of items and player demand. Keep an eye on trends and adjust your strategies accordingly." },
    { title: '5. Player Interactions', content: 'Engage with other players through the market. Negotiate prices, make deals, and build a thriving in-game economy together.' },
    { title: '6. Transparency', content: 'The market operates with transparency. Sellers and buyers can view relevant information about each transaction.' },
  ];

  return (
    <div className="flex flex-col text-sm text-white">
      <span className="font-bold text-lg mb-4">{heading}</span>
      <span className="mb-2">{intro}</span>
      {rows.map((s, i) => <Row key={i} title={s.title} content={s.content} />)}
    </div>
  );
};

export default AboutTheMarket;


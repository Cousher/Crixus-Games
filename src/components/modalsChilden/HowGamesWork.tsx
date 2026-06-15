import { useTranslation } from "react-i18next";

const Game = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-8">
    <span className="text-xl font-bold mb-2">{title}</span>
    <p className="text-justify">{description}</p>
  </div>
);

const HowGamesWork = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const heading = es ? "Cómo funcionan los juegos" : "How Games Work";
  const intro = es ? "¡Bienvenido a la sección de juegos! Acá tenés un resumen de cómo funciona cada uno:" : "Welcome to the gaming section! Here's a brief overview of how each game works:";
  const outro = es ? "¡Disfrutá los juegos y buena suerte!" : "Enjoy playing the games and good luck!";
  const games = es ? [
    { title: "Cara o Cruz", description: "En Cara o Cruz, apostás a cara o cruz. El juego arranca automáticamente y, tras unos segundos, se revela el resultado. Si acertás, ganás el doble (2X)." },
    { title: "Crash", description: "En Crash, un multiplicador crece con el tiempo. Apostás y podés retirar en cualquier momento antes de que el juego explote. Si retirás a tiempo, cobrás según el multiplicador del momento." },
    { title: "Tragamonedas", description: "En Tragamonedas girás los rodillos con distintos símbolos. Las combinaciones dan premios variados. El gato es el símbolo de mayor pago y reemplaza a cualquier otro." },
    { title: "Mejorar ítems", description: "Mejorar te permite elegir varios ítems de tu inventario e intentar subirlos a una rareza mayor. La probabilidad de éxito se calcula según los ítems elegidos y la rareza objetivo." },
  ] : [
    { title: "Coin Flip Game", description: "In the Coin Flip game, players can place bets on either heads or tails. After a brief period, the result is revealed. If a player's choice matches the result, they win a 2X payout." },
    { title: "Crash Game", description: "The Crash Game features a multiplier that grows over time. Players can cash out at any point before the game crashes, receiving a payout based on the current multiplier." },
    { title: "Slot Game", description: "In the Slot Game, players spin a slot machine with various symbols. Different combinations result in varying payouts. The cat symbol is the highest paying and can substitute for any other symbol." },
    { title: "Upgrade Items", description: "The Upgrade feature allows users to select items from their inventory and attempt to upgrade them to a higher rarity. The success rate depends on the selected items and the target rarity." },
  ];

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{heading}</h2>
      <p className="mb-4">{intro}</p>
      {games.map((g, i) => <Game key={i} title={g.title} description={g.description} />)}
      <p className="text-lg">{outro}</p>
    </div>
  );
};

export default HowGamesWork;


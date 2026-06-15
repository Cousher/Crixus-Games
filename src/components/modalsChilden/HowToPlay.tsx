import { useTranslation } from "react-i18next";

const Row = ({ title, content }: { title: string, content: string }) => (
  <div className="mb-2">
    <span className="font-bold">{title}: </span>
    <span className="ml-2 text-justify">{content}</span>
  </div>
);

const HowToPlay = () => {
  const { i18n } = useTranslation();
  const es = (i18n.language || "es").startsWith("es");

  const heading = es ? "Cómo jugar en Crixus Games" : "How to Play at Crixus Games";
  const rows = es ? [
    { title: '1. Iniciá sesión', content: 'Ingresá a tu cuenta para empezar a jugar. Si no tenés una cuenta, registrate primero.' },
    { title: '2. Saldo inicial', content: 'Al ingresar, recibís un saldo inicial de K₽1000.' },
    { title: '3. Bono cada 8 minutos', content: 'Cada 8 minutos recibís un bono. El monto se calcula como K₽200 multiplicado por el 10% de tu nivel actual.' },
    { title: '4. Abrí cajas', content: 'Explorá el sistema de cajas. Abrir cajas te da ítems del juego; la rareza del ítem afecta su valor.' },
    { title: '5. Jugá', content: 'Jugá a Crash y Cara o Cruz para aumentar tu saldo. Jugar suma a tu nivel: ganás 5XP por cada K₽1 apostado.' },
    { title: '6. Comprá y vendé ítems', content: 'Visitá el Mercado para comprar y vender ítems. Creá una economía según la rareza y la demanda.' },
  ] : [
    { title: '1. Log In', content: "Sign in to your account to start playing. If you don't have an account, you may need to register." },
    { title: '2. Starting Balance', content: 'Upon logging in, you will receive an initial balance of K₽1000.' },
    { title: '3. Bonus Every 8 Minutes', content: 'Every 8 minutes, you receive a bonus. The bonus amount is calculated as K₽200 multiplied by 10% of your current level.' },
    { title: '4. Open Cases', content: 'Explore the case system. Opening cases can reward you with various in-game items. The rarity of items may affect their value.' },
    { title: '5. Play Games', content: 'Engage in live games like Crash and Coin Flip to increase your balance. You win 5XP for every K₽1 spent.' },
    { title: '6. Buy and Sell Items', content: 'Visit the Marketplace to buy and sell items. Create an economy based on the rarity of items and market demand.' },
  ];

  return (
    <div className="flex flex-col text-sm text-white">
      <span className="font-bold text-lg mb-4">{heading}</span>
      {rows.map((s, i) => <Row key={i} title={s.title} content={s.content} />)}
    </div>
  );
};

export default HowToPlay;


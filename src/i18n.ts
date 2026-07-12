import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  es: {
    translation: {
      nav: { market: "Mercado", coinflip: "Cara o Cruz", crash: "Crash", upgrade: "Mejorar", slots: "Tragamonedas", mines: "Minas", rewards: "Recompensas", signIn: "Ingresar", back: "Volver", liveDrop: "DROPS EN VIVO", claimBonus: "Reclamar Bono" },
      auth: { signInTitle: "Iniciá sesión en tu cuenta", email: "Correo electrónico", password: "Contraseña", forgot: "¿Olvidaste tu contraseña?", signIn: "Ingresar", orCreate: "O creá una cuenta", orLogin: "O iniciá sesión", nickname: "Usuario", signUp: "Registrarse", invalid: "Correo o contraseña inválidos." },
      home: { goToPage: "Ir a la página", leaderboard: "Clasificación", rank: "Puesto", name: "Nombre", winnings: "Ganancias", newCases: "NUEVAS CAJAS", ourGames: "NUESTROS JUEGOS", play: "Jugar" },
      banner: { crashTitle: "JUEGO CRASH", crashDesc: "¡No te quemes, volá alto! Probá tu suerte ahora.", upgradeTitle: "NUEVO JUEGO MEJORAR", upgradeDesc: "A lo grande o a casa. Probá tu suerte ahora." },
      rarity: { "1": "Común", "2": "Raro", "3": "Épico", "4": "Ultra Raro", "5": "Único" },
      upg: { selectUpgrade: "Seleccioná un ítem que quieras mejorar", selectObtain: "Seleccioná un ítem que quieras obtener", upgradeItems: "MEJORAR ÍTEMS", newest: "Más nuevos", oldest: "Más antiguos", rarityHL: "Rareza: de mayor a menor", rarityLH: "Rareza: de menor a mayor", page: "Página:" },
      market: { marketplace: "MERCADO", sellItem: "Vender un ítem", announced: "publicados", startingAt: "Desde", itemListings: "Publicaciones del ítem", noListings: "No hay publicaciones para este ítem.", searchByName: "Buscar por nombre", rarity: "Rareza", sortBy: "Ordenar por", price: "Precio", ascending: "Ascendente", descending: "Descendente", sellItemTitle: "Vender un ítem", priceInKP: "Precio en KP", sellItemBtn: "Vender ítem", confirmPurchase: "Confirmar compra", cancel: "Cancelar", confirm: "Confirmar", confirmBuy: "¿Seguro que querés comprar {{name}} por {{price}} KP?" },
      profile: { noItems: "Sin ítems", itsYou: "¡Sos vos!" },
      toast: { loginAgain: "Iniciá sesión de nuevo, por favor", insufficientFunds: "Saldo insuficiente", connError: "Error al conectar con el servidor", purchaseSuccess: "¡Compra exitosa!", priceRange: "El precio debe estar entre 0 y 1.000.000", itemListed: "¡Ítem publicado para la venta!" },
      mines: {
        title: "MINAS", mines: "Minas", bet: "Apuesta", start: "Empezar partida", cashout: "Retirar",
        next: "Próximo", boom: "¡BOOM! Perdiste la apuesta", cashedOut: "Retiraste", resume: "Partida en curso recuperada",
        pickTile: "Elegí una casilla para empezar", fairness: "Hash de la ronda (provably fair)", seed: "Seed revelada"
      },
      rewards: {
        title: "RECOMPENSAS", daily: "Bono diario", day: "Día", claim: "Reclamar", claimed: "Reclamado",
        nextBonusIn: "Próximo bono en {{time}}", bonusAvailable: "¡Bono disponible ahora!",
        streakDesc: "Volvé todos los días para que el bono crezca. Si faltás un día, la racha vuelve a empezar.",
        missions: "Misiones del día", missionsDesc: "Se renuevan todos los días. Completalas jugando.",
        levelTitle: "Recompensas por nivel", levelDesc: "Cada nivel que subís te paga fichas. Nivel actual:",
        nothingPending: "Nada pendiente por ahora, ¡seguí jugando!", claimedToday: "Ya reclamaste hoy, volvé mañana",
        missionComplete: "¡Misión completada!",
        m_bet_total: "Apostá K₽{{target}} en total",
        m_case_open: "Abrí {{target}} cajas",
        m_crash_2x: "Cobrá {{target}} rondas de Crash en 2x o más",
        m_coinflip_win: "Ganá {{target}} veces en Cara o Cruz",
        m_slot_win: "Ganá {{target}} tiradas en Tragamonedas",
        m_mines_cashout: "Retirá {{target}} partidas de Minas",
        m_upgrade_try: "Intentá {{target}} mejoras de ítems"
      },
      games: {
        multiplier: "Multiplicador:", gameHistory: "Historial:", totalBets: "Apuestas totales", user: "Usuario",
        bet: "Apuesta", payout: "Pago", profit: "Ganancia", placeBetValue: "Ingresá el valor de la apuesta",
        placeBet: "Apostar", cashOut: "Retirar", youreIn: "¡Estás dentro!", waitNextRound: "Esperá la próxima ronda",
        maxBet: "La apuesta máxima es 1M", notEnough: "Saldo insuficiente", cashedOutAt: "Retiraste en", enterGame: "Entrar al juego",
        chooseSide: "Elegí un lado", heads: "Cara", tails: "Cruz", spinning: "Girando...", nextGameIn: "Próximo juego en:",
        loading: "Cargando...", upgrade: "Mejorar", upgradeSuccess: "¡Mejora exitosa!", upgradeFailed: "Mejora fallida",
        inventory: "Inventario", clearCase: "Limpiar caja", searchItems: "Buscar ítems...", allRarities: "Todas las rarezas",
        noItems: "No se encontraron ítems", getOneItem: "Conseguí un ítem", clear: "Limpiar", rarity: "Rareza", signInToPlay: "Iniciá sesión para jugar",
        howItWorks: "¿Cómo funciona?", spin: "Girar", autoCashout: "Retiro automático (x)", openCase: "Abrir caja - ", itemsInCase: "Ítems en esta caja"
      },
      footer: {
        main: "Principal", howToPlay: "Cómo jugar", aboutMarket: "Sobre el mercado", howGamesWork: "Cómo funcionan los juegos",
        aboutUs: "Sobre nosotros", termsPrivacy: "Privacidad", userAgreement: "Acuerdo de usuario", artists: "Artistas",
        games: "Juegos", support: "Soporte", contactUs: "Contáctanos", faq: "Preguntas frecuentes", paymentForms: "Métodos de pago"
      }
    }
  },
  en: {
    translation: {
      nav: { market: "Market", coinflip: "Coin Flip", crash: "Crash", upgrade: "Upgrade", slots: "Slots", mines: "Mines", rewards: "Rewards", signIn: "Sign In", back: "Back", liveDrop: "LIVE DROP", claimBonus: "Claim Bonus" },
      auth: { signInTitle: "Sign in to your account", email: "Email address", password: "Password", forgot: "Forgot your password?", signIn: "Sign in", orCreate: "Or create an account", orLogin: "Or Login", nickname: "Nickname", signUp: "Sign up", invalid: "Invalid email or password." },
      home: { goToPage: "Go to page", leaderboard: "Leaderboard", rank: "Rank", name: "Name", winnings: "Winnings", newCases: "NEW CASES", ourGames: "OUR GAMES", play: "Play" },
      banner: { crashTitle: "CRASH GAME", crashDesc: "Don't burn, fly high! Try your luck now!", upgradeTitle: "NEW UPGRADE GAME", upgradeDesc: "Go big or go home. Try your luck now!" },
      rarity: { "1": "Common", "2": "Rare", "3": "Epic", "4": "Ultra Rare", "5": "Unique" },
      upg: { selectUpgrade: "Select an item that you want to upgrade", selectObtain: "Select an item that you want to obtain", upgradeItems: "Upgrade Items", newest: "Newest", oldest: "Oldest", rarityHL: "Rarity: high to low", rarityLH: "Rarity: low to high", page: "Page:" },
      market: { marketplace: "Marketplace", sellItem: "Sell an item", announced: "announced", startingAt: "Starting at", itemListings: "Item Listings", noListings: "There are no listings for this item.", searchByName: "Search by name", rarity: "Rarity", sortBy: "Sort By", price: "Price", ascending: "Ascending", descending: "Descending", sellItemTitle: "Sell an Item", priceInKP: "Price in KP", sellItemBtn: "Sell Item", confirmPurchase: "Confirm Purchase", cancel: "Cancel", confirm: "Confirm", confirmBuy: "Are you sure you want to buy {{name}} for {{price}} KP?" },
      profile: { noItems: "No items", itsYou: "It's you!" },
      toast: { loginAgain: "Please, login again", insufficientFunds: "Insufficient funds", connError: "Error while connecting to the server", purchaseSuccess: "Purchase successful!", priceRange: "Price must be between 0 and 1.000.000", itemListed: "Item listed for sale!" },
      mines: {
        title: "MINES", mines: "Mines", bet: "Bet", start: "Start game", cashout: "Cash Out",
        next: "Next", boom: "BOOM! You lost your bet", cashedOut: "Cashed out", resume: "Active game resumed",
        pickTile: "Pick a tile to start", fairness: "Round hash (provably fair)", seed: "Revealed seed"
      },
      rewards: {
        title: "REWARDS", daily: "Daily bonus", day: "Day", claim: "Claim", claimed: "Claimed",
        nextBonusIn: "Next bonus in {{time}}", bonusAvailable: "Bonus available now!",
        streakDesc: "Come back every day and the bonus grows. Miss a day and the streak resets.",
        missions: "Daily missions", missionsDesc: "New missions every day. Complete them by playing.",
        levelTitle: "Level rewards", levelDesc: "Every level you gain pays out. Current level:",
        nothingPending: "Nothing pending right now, keep playing!", claimedToday: "Already claimed today, come back tomorrow",
        missionComplete: "Mission complete!",
        m_bet_total: "Wager K₽{{target}} in total",
        m_case_open: "Open {{target}} cases",
        m_crash_2x: "Cash out {{target}} Crash rounds at 2x or more",
        m_coinflip_win: "Win {{target}} Coin Flips",
        m_slot_win: "Win {{target}} slot spins",
        m_mines_cashout: "Cash out {{target}} Mines games",
        m_upgrade_try: "Attempt {{target}} item upgrades"
      },
      games: {
        multiplier: "Multiplier:", gameHistory: "Game History:", totalBets: "Total Bets", user: "User",
        bet: "Bet", payout: "Payout", profit: "Profit", placeBetValue: "Place the bet value",
        placeBet: "Place Bet", cashOut: "Cash Out", youreIn: "You're in!", waitNextRound: "Wait for next round",
        maxBet: "Max bet is 1M", notEnough: "Not enough money", cashedOutAt: "Cashed Out at", enterGame: "Enter the Game",
        chooseSide: "Choose a side", heads: "Heads", tails: "Tails", spinning: "Spinning...", nextGameIn: "Next game in:",
        loading: "Loading...", upgrade: "Upgrade", upgradeSuccess: "Upgrade Success", upgradeFailed: "Upgrade Failed",
        inventory: "Inventory", clearCase: "Clear case", searchItems: "Search items...", allRarities: "All rarities",
        noItems: "No items found", getOneItem: "Get one Item", clear: "Clear", rarity: "Rarity", signInToPlay: "Sign in to play",
        howItWorks: "How it works?", spin: "Spin", autoCashout: "Auto cash out (x)", openCase: "Open case - ", itemsInCase: "Items in this case"
      },
      footer: {
        main: "Main", howToPlay: "How to play", aboutMarket: "About the market", howGamesWork: "How games work",
        aboutUs: "About us", termsPrivacy: "Terms of Privacy", userAgreement: "User Agreement", artists: "Artists",
        games: "Games", support: "Support", contactUs: "Contact Us", faq: "FAQ", paymentForms: "Payment Methods"
      }
    }
  }
};

let saved = "es";
try { saved = localStorage.getItem("lang") || "es"; } catch (e) { saved = "es"; }

i18n.use(initReactI18next).init({ resources, lng: saved, fallbackLng: "es", interpolation: { escapeValue: false } });

export default i18n;


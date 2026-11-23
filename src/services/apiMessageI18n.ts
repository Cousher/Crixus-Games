import i18n from "../i18n";

// Centralized translator for English messages returned by the backend API
// (errors, rate-limit notices, and action confirmations) so that every toast
// and alert respects the active UI language without modifying backend contracts.
const ES_MAP: Record<string, string> = {
  // Bonus & Rewards
  "bonus not yet available": "¡El bono todavía no está disponible!",
  "daily bonus limit reached, come back tomorrow": "Alcanzaste el límite diario de bonos, volvé mañana",
  "daily reward already claimed": "Ya reclamaste la recompensa diaria hoy",
  "missions expired, refresh the page": "Las misiones expiraron, recargá la página",
  "mission not found": "Misión no encontrada",
  "already claimed": "Ya fue reclamada",
  "mission not completed yet": "Todavía no completaste esta misión",
  "no level rewards to claim": "No tenés recompensas de nivel para reclamar",
  "invalid milestone": "Hito de reclutamiento inválido",
  "milestone not unlocked yet": "Todavía no desbloqueaste este hito",

  // Auth & Users
  "email already registered": "Ese correo ya está registrado",
  "username already registered": "Ese nombre de usuario ya está en uso",
  "invalid profile picture": "Foto de perfil inválida",
  "email not found": "Correo electrónico no encontrado",
  "invalid credentials": "Correo o contraseña inválidos",
  "error in google authentication": "Error al iniciar sesión con Google",
  "google email is not verified": "Tu correo de Google no está verificado",
  "this email is registered with a password. please sign in with your password": "Ese correo está registrado con contraseña. Iniciá sesión con tu contraseña.",
  "username must be 3-24 characters (letters, numbers, spaces, . _ -)": "El usuario debe tener entre 3 y 24 caracteres válidos",
  "no authorization header provided": "Tenés que iniciar sesión para continuar",
  "no authorization token provided": "Tenés que iniciar sesión para continuar",
  "invalid authorization": "Sesión inválida, iniciá sesión nuevamente",
  "token is not valid": "Tu sesión expiró, iniciá sesión nuevamente",
  "session has been revoked": "Tu sesión fue cerrada, iniciá sesión nuevamente",
  "password login is not enabled for this account": "Esta cuenta usa inicio de sesión con Google",
  "password updated": "¡Contraseña actualizada! Se cerraron las demás sesiones",
  "access denied": "Acceso denegado",
  "user not found": "Usuario no encontrado",
  "invalid user id": "ID de usuario inválido",
  "invalid image format": "Formato de imagen inválido",
  "profile picture updated": "¡Foto de perfil actualizada!",
  "transfer alias updated": "¡Alias de transferencia guardado!",
  "invalid transfer alias (6-30 characters: letters, numbers, dots or hyphens)": "Alias inválido (entre 6 y 30 caracteres: letras, números, puntos o guiones)",
  "invalid description": "Descripción inválida",
  "no fixed item selected": "No hay ningún ítem fijado",
  "invalid item identifier": "Identificador de ítem inválido",
  "file size must be less than 3mb": "El archivo debe pesar menos de 3 MB",
  "file type must be jpeg, jpg or png": "El archivo debe ser JPEG, JPG o PNG",

  // Friends
  "you can't add yourself": "No podés agregarte a vos mismo",
  "you are already friends": "Ya son amigos",
  "this user already sent you a request": "Este usuario ya te envió una solicitud",
  "request already sent": "Ya enviaste una solicitud",
  "friend request sent": "Solicitud de amistad enviada",
  "no pending request from this user": "No hay ninguna solicitud pendiente de este usuario",
  "friend request accepted": "Solicitud de amistad aceptada",
  "friend request declined": "Solicitud de amistad rechazada",
  "request declined": "Solicitud rechazada",
  "friend removed": "Amigo eliminado",

  // Economy & Games (Cases, Slots, Mines, Upgrade)
  "insufficient balance": "Saldo insuficiente",
  "invalid bet amount": "Monto de apuesta inválido",
  "invalid mines count": "Cantidad de minas inválida",
  "game start already in progress": "Ya se está iniciando una partida",
  "you already have an active game": "Ya tenés una partida activa",
  "invalid tile": "Casilla inválida",
  "no active game or tile already revealed": "No hay partida activa o la casilla ya fue revelada",
  "no active game to cash out (reveal at least one tile)": "Revelá al menos una casilla antes de retirar",
  "no active game to cash out (advance at least one step)": "Avanzá al menos un paso antes de retirar",
  "no active game to cash out (inflate at least once)": "Inflá el globo al menos una vez antes de retirar",
  "wait for next round": "Esperá la próxima ronda",
  "you already joined this round": "Ya entraste a esta ronda",
  "invalid difficulty": "Dificultad inválida",
  "invalid mode": "Modo inválido",
  "action already in progress": "Ya hay una acción en curso",
  "no active game": "No tenés ninguna partida activa",
  "case not found": "Caja no encontrada",
  "quantity to open must be an integer": "La cantidad de cajas debe ser un número entero",
  "you can only open up to 5 cases at a time": "Solo podés abrir hasta 5 cajas a la vez",
  "you need to open at least 1 case": "Tenés que abrir al menos 1 caja",
  "no items selected": "No seleccionaste ningún ítem",
  "you can select up to 20 items at a time": "Podés seleccionar hasta 20 ítems a la vez",
  "no target item selected": "No seleccionaste un ítem objetivo",
  "items no longer available": "Los ítems ya no están disponibles",
  "all items must be from the same case": "Todos los ítems deben ser de la misma caja",
  "you can't upgrade to a lesser rarity": "No podés mejorar a una rareza menor",
  "invalid side": "Elegí Cara o Cruz",
  "you have too many open duels": "Ya tenés demasiados duelos abiertos",
  "duel not found": "Duelo no encontrado",
  "duel is no longer open": "Este duelo ya fue aceptado o cerrado",
  "duel has expired": "Este duelo ya expiró",
  "you can't join your own duel": "No podés aceptar tu propio duelo",
  "duel cannot be cancelled": "Este duelo ya no se puede cancelar",

  // Marketplace
  "invalid item": "Ítem inválido",
  "invalid price": "Precio inválido",
  "you must be at least level 5 to sell items": "Necesitás ser al menos nivel 5 para vender ítems",
  "you must be at least level 10 to buy items": "Necesitás ser al menos nivel 10 para comprar ítems",
  "you can't buy your own listing": "No podés comprar tu propia publicación",
  "item not found in inventory": "Ítem no encontrado en tu inventario",
  "item not found": "Ítem no encontrado",
  "item no longer available": "Este ítem ya no está disponible",
  "item removed": "Publicación eliminada",
  "item purchased": "¡Ítem comprado!",

  // Rate limits & generic errors
  "too many attempts, please try again later": "Demasiados intentos, probá de nuevo más tarde",
  "too many requests, slow down": "Demasiadas solicitudes, esperá un momento",
  "too many requests, please try again later": "Demasiadas solicitudes, intentá más tarde",
  "too many game actions, please slow down": "Vas muy rápido, esperá un segundo",
  "too many friend requests, please try again later": "Demasiadas solicitudes de amistad, probá más tarde",
  "server error": "Error del servidor",
  "internal server error": "Error interno del servidor",
  "something went wrong": "Algo salió mal",
  "an error occurred": "Ocurrió un error",
  "network error": "Error de conexión con el servidor",
  "invalid format. please try again": "Formato inválido. Intentá de nuevo.",
};

const extractMessage = (input: unknown): string => {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    const err = input as any;
    const fromResponse =
      err?.response?.data?.message ||
      err?.response?.data?.errors?.[0]?.msg ||
      err?.message;
    if (typeof fromResponse === "string") return fromResponse;
  }
  return "";
};

export const translateApiMessage = (
  input: unknown,
  fallback?: string,
  lang?: string
): string => {
  const activeLang = lang ?? i18n.language ?? "es";
  const isEs = activeLang.startsWith("es");
  const raw = extractMessage(input).trim();

  if (!raw) {
    return fallback ?? (isEs ? "Ocurrió un error" : "Something went wrong");
  }

  if (!isEs) {
    return raw;
  }

  const normalized = raw.replace(/[!.\s]+$/g, "").toLowerCase();
  if (ES_MAP[normalized]) {
    return ES_MAP[normalized];
  }

  // Dynamic marketplace rarity price band error
  const priceBandMatch = raw.match(
    /^Price must be between \$(\d+) and \$(\d+) for this rarity$/i
  );
  if (priceBandMatch) {
    const min = Number(priceBandMatch[1]).toLocaleString("es-AR");
    const max = Number(priceBandMatch[2]).toLocaleString("es-AR");
    return `El precio para esta rareza debe estar entre $${min} y $${max}`;
  }

  return raw;
};

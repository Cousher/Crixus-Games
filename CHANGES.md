# Crixus Games — Mejoras v2

Resumen de todos los cambios aplicados sobre el proyecto original. Objetivo:
loop de retención diario, un juego nuevo, equidad verificable y economía balanceada.

## 1. Sistema de Recompensas (nuevo) — página `/rewards`

### Bono diario con racha
- Un reclamo por día (día calculado en UTC-3). Días consecutivos hacen crecer
  el premio: 500 → 750 → 1.000 → 1.500 → 2.000 → 3.000 → 5.000 (día 7+ mantiene el máximo).
- Faltar un día reinicia la racha. Convive con el refill de 8 minutos existente.

### Misiones diarias
- Cada día se sortean 3 misiones de un pool de 7 (apostar K₽2.000, abrir 5 cajas,
  cobrar 3 crash ≥2x, ganar 4 coinflips, ganar 5 tiradas de slot, retirar 3 mines,
  intentar 2 upgrades). Recompensas de 400 a 700 fichas por misión.
- El progreso se trackea automáticamente desde todos los juegos. Al completar
  una misión aparece un toast global en tiempo real (socket `missionComplete`).
- Se reclaman desde la página de Recompensas, con barras de progreso.

### Recompensas por nivel
- Cada nivel alcanzado paga 500 + 250 × nivel, reclamable de una sola vez
  (acumulativo si hay varios niveles pendientes).

**Archivos**: `backend/utils/missions.js`, `backend/routes/rewardsRoutes.js`,
`backend/models/User.js` (campos nuevos), `src/pages/Rewards/`, `src/services/rewards/`.
Todos los reclamos son atómicos (findOneAndUpdate condicionado) — sin dobles pagos por requests concurrentes.

## 2. Mines (juego nuevo) — página `/mines`

- Grilla 5×5, cantidad de minas configurable (3/5/10/15/20/24), multiplicador
  creciente por casilla segura, retiro en cualquier momento.
- **Edge del 1%** (RTP ~99% en toda configuración, verificado por tests).
- **Provably fair**: antes de la ronda se muestra `sha256(seed:minas_ordenadas)`;
  al terminar se revela la seed para verificar que las minas no se movieron.
- Las partidas viven en **Mongo, no en memoria**: un reinicio del servidor
  (típico en Render free tier) no come la apuesta — la partida se retoma al recargar.
- Revelado de casillas y retiro atómicos (a prueba de doble click / requests duplicadas).

**Archivos**: `backend/games/mines.js`, `backend/models/MinesGame.js`,
endpoints en `backend/routes/gamesRoutes.js`, `src/pages/Mines/`.

## 3. Crash — rebalance y mejoras

- **Auto-cashout server-side**: el jugador fija un multiplicador objetivo al
  apostar y el servidor lo cobra exacto aunque su pestaña se cuelgue.
- **Se eliminó el 3% extra de crash instantáneo** que se apilaba sobre la fórmula.
  RTP con cashout en 2x: 96,1% → **99,1%** (verificado con 1M de simulaciones).
- **Provably fair**: el hash de la seed se publica ANTES de abrir apuestas
  (`crash:hash`) y la seed se revela al terminar (`crash:reveal`). El punto de
  crash se deriva determinísticamente de la seed.
- **Historial persistente**: el servidor guarda los últimos 20 crash points y
  los envía a cada conexión (`crash:history`) — ya no se pierde al recargar.

## 4. Coin Flip — economía y ritmo

- Pago **1,95x** (antes 2x exacto = edge 0%). Sin ningún drenaje, las fichas se
  inflaban y los ítems perdían valor; ahora la economía tiene un sumidero suave (2,5%).
- Ciclo más corto: ventana de apuestas de 14s → **10s** (countdown del frontend sincronizado).
- Resultado con `crypto.randomInt` en lugar de `Math.random`.

## 5. RNG unificado

`Math.random()` reemplazado por el módulo `crypto` en **Coin Flip, Slot y
Upgrade** (Crash y Cases ya lo usaban). Mismo estándar de aleatoriedad en todo el casino.

## 6. Tests

- 12 tests unitarios nuevos (`mines.test.js`, `missions.test.js`): RTP de mines
  acotado en todas las configuraciones, hash de fairness determinístico,
  racha/niveles/sorteo de misiones. **Suite completa: 38/38 en verde.**
- Nota: los tests de integración requieren descargar el binario de MongoDB
  (mongodb-memory-server); corren normalmente en tu máquina con `npm run test:integration`.

## 7. Frontend

- Rutas `/mines` y `/rewards` + links en Navbar y Sidebar.
- Traducciones ES/EN completas para todo lo nuevo (`src/i18n.ts`).
- Input de auto-cashout en el panel del Crash.
- Toast global al completar una misión.
- `npm run build` (tsc + vite) compila sin errores.

## Cómo desplegar

1. Backend y frontend no requieren pasos de migración: los campos nuevos del
   modelo User tienen defaults, y los usuarios existentes los adquieren solos.
2. `npm install` en raíz y en `/backend` (sin dependencias nuevas).
3. Deploy normal. La primera visita de cada usuario a `/rewards` sortea sus misiones del día.

## Ideas para la próxima iteración (no incluidas)

- **Case battles** (2 jugadores abren la misma caja, el mayor valor se lleva todo) — el juego social por excelencia del género.
- **Rain en el chat**: fichas gratis periódicas para los conectados.
- Regalos de fichas/ítems entre amigos y ranking solo-amigos.
- Free spins / scatter en la slot y eventos de tiempo limitado (caja de 72hs, fin de semana 2x XP).

const GROWTH = 0.06; // multiplier growth per second

// multiplier grows exponentially with time, capped at the crash point
const multiplierAt = (elapsedSeconds, crashPoint) =>
  Math.min(Math.exp(elapsedSeconds * GROWTH), crashPoint);

const crashPointFromRandom = (h) => {
  const e = 2 ** 32;
  const result = Math.floor((97 * e) / (e - h)) / 100;
  return Math.max(1.00, result);
};

module.exports = { GROWTH, multiplierAt, crashPointFromRandom };

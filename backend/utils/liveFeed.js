const crypto = require("crypto");

// In-memory ring buffer of recent notable wins across the entire casino.
// Broadcast live over Socket.io and served via GET /games/live-feed so the
// Home page always feels alive without hammering MongoDB.
const MAX_FEED_ITEMS = 25;
const recentWins = [];

function recordLiveWin(io, entry) {
  if (!entry || !entry.username || !entry.game) return null;

  const payout = Number(entry.payout) || 0;
  const multiplier = Number(entry.multiplier) || 0;
  const itemRarity = entry.itemRarity ? String(entry.itemRarity) : null;

  // Keep the ticker exciting: log meaningful wins (>=1.9x or >=$200 payout, or R3+ item)
  const isNotable =
    payout >= 200 ||
    multiplier >= 1.9 ||
    (itemRarity && Number(itemRarity) >= 3);
  if (!isNotable) return null;

  const item = {
    id: crypto.randomBytes(6).toString("hex"),
    username: String(entry.username).slice(0, 32),
    game: String(entry.game), // "crash" | "mines" | "road" | "slot" | "coinflip" | "duel" | "case"
    multiplier: multiplier > 0 ? Math.round(multiplier * 100) / 100 : null,
    payout: Math.round(payout * 100) / 100,
    itemName: entry.itemName ? String(entry.itemName).slice(0, 64) : null,
    itemRarity,
    createdAt: new Date().toISOString(),
  };

  recentWins.unshift(item);
  if (recentWins.length > MAX_FEED_ITEMS) {
    recentWins.length = MAX_FEED_ITEMS;
  }

  if (io) {
    io.emit("liveFeed:win", item);
  }
  return item;
}

function getRecentWins(limit = 20) {
  return recentWins.slice(0, Math.min(MAX_FEED_ITEMS, Math.max(1, limit)));
}

function clearRecentWins() {
  recentWins.length = 0;
}

module.exports = {
  recordLiveWin,
  getRecentWins,
  clearRecentWins,
};

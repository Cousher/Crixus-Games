const mongoose = require("mongoose");

// Active Mines rounds live in Mongo (not in memory) so a server restart can't
// eat a stake mid-game: the player just resumes where they left off.
const MinesGameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  bet: { type: Number, required: true },
  minesCount: { type: Number, required: true },
  // mine positions (0..24). Never sent to the client while the round is live.
  mines: { type: [Number], required: true },
  revealed: { type: [Number], default: [] },
  active: { type: Boolean, default: true, index: true },
  // provably fair: hash = sha256(`${serverSeed}:${sortedMines.join(",")}`) is
  // shown before the round; the seed is revealed when the round ends.
  serverSeed: { type: String, required: true },
  hash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MinesGame", MinesGameSchema);

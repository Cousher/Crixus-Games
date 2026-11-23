const mongoose = require("mongoose");

// Active Crixus Balloon ("Globo Imperial") rounds persist in MongoDB so a page
// refresh or server restart can never lose a player's stake mid-round.
const BalloonGameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  bet: { type: Number, required: true },
  mode: {
    type: String,
    enum: ["bronze", "gold", "emperor"],
    required: true,
  },
  maxPumps: { type: Number, required: true },
  currentPump: { type: Number, default: 0 },
  // 1-indexed pump number where the balloon bursts, or maxPumps + 1 if it survives all pumps.
  // NEVER exposed to the client while active === true.
  popAt: { type: Number, required: true },
  active: { type: Boolean, default: true, index: true },
  // Provably fair commitment: sha256(`${serverSeed}:${mode}:${popAt}`)
  serverSeed: { type: String, required: true },
  hash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BalloonGame", BalloonGameSchema);

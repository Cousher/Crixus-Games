const mongoose = require("mongoose");

// Active Gladiator Road (Chicken Road - Crixus edition) rounds live in Mongo
// so a refresh or server restart can never eat a player's stake mid-run.
const RoadGameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  bet: { type: Number, required: true },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard", "hardcore"],
    required: true,
  },
  totalSteps: { type: Number, required: true },
  currentStep: { type: Number, default: 0 },
  // 1-indexed step where the fire trap erupts, or totalSteps + 1 if the full road is clear.
  // NEVER sent to the client while active === true.
  crashStep: { type: Number, required: true },
  active: { type: Boolean, default: true, index: true },
  // Provably fair: hash = sha256(`${serverSeed}:${difficulty}:${crashStep}`)
  serverSeed: { type: String, required: true },
  hash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RoadGame", RoadGameSchema);

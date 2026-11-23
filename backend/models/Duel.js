const mongoose = require("mongoose");

const DuelSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    creatorUsername: { type: String, required: true },
    creatorAvatar: { type: String, default: "" },
    creatorLevel: { type: Number, default: 0 },
    creatorSide: {
      type: String,
      enum: ["heads", "tails"],
      required: true,
    },
    betAmount: {
      type: Number,
      required: true,
    },
    opponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    opponentUsername: { type: String, default: "" },
    opponentAvatar: { type: String, default: "" },
    opponentLevel: { type: Number, default: 0 },
    resultSide: {
      type: String,
      enum: ["heads", "tails", null],
      default: null,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    winnerUsername: { type: String, default: "" },
    payout: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["open", "completed", "cancelled", "expired"],
      default: "open",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Duel", DuelSchema);

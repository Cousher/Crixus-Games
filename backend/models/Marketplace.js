// models/Marketplace.js
const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const MarketplaceSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
    },
    uniqueId: {
      type: String,
      default: () => randomUUID(),
    },
    price: {
      type: Number,
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    itemImage: {
      type: String,
      required: true,
    },
    rarity: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

MarketplaceSchema.index({ itemName: 1 });
MarketplaceSchema.index({ rarity: 1 });
MarketplaceSchema.index({ price: 1 });

module.exports = mongoose.model("Marketplace", MarketplaceSchema);

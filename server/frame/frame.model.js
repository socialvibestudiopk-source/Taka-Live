const mongoose = require("mongoose");

const frameSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    coin_price: { type: Number, default: 0 },
    rarity: { type: String, enum: ["common", "rare", "epic", "legendary"], default: "common" },
    animation: { type: String, default: "frame-pulse" },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Frame", frameSchema);

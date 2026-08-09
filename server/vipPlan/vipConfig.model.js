const mongoose = require("mongoose");

const VIPConfigSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["COMING_SOON", "PUBLISHED", "DISABLED"], default: "COMING_SOON" },
    comingSoonMessage: { type: String, default: "Exclusive VIP experiences are coming soon." },
    comingSoonSupportingText: { type: String, default: "Premium identities, frames, headwear, nameplates and exclusive rewards are being prepared." },
    allowPurchase: { type: Boolean, default: false },
    activeLevels: { type: Array, default: [1, 2, 3, 4, 5, 6] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("VIPConfig", VIPConfigSchema);

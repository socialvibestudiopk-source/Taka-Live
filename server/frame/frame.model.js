const mongoose = require("mongoose");

const frameSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    image: { type: String, default: "" }, // Cloudinary URL
    coin_price: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["VIP", "EVENT", "OFFICIAL", "ROLE_BASED", "ACHIEVEMENT", "FESTIVAL", "PREMIUM"],
      default: "PREMIUM"
    },
    rarity: { type: String, enum: ["common", "rare", "epic", "legendary"], default: "common" },
    is_animated: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    role_required: { type: String, default: null }, // If type is ROLE_BASED
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Frame", frameSchema);

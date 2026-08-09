const mongoose = require("mongoose");

const VIPAssetSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    type: { type: String, enum: ["IDENTITY", "FRAME", "HEADWEAR", "NAMEPLATE", "BADGE", "BUBBLE", "ENTRANCE_EFFECT", "PROFILE_DECORATION", "CHAT_EFFECT", "CARD", "BACKGROUND", "ANIMATION"], required: true },
    image: { type: String, default: "" },
    animation: { type: String, default: "" }, // URL for Lottie/SVGA
    vipLevel: { type: Number, required: true },
    duration: { type: Number, default: 30 }, // in days, 0 for permanent
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("VIPAsset", VIPAssetSchema);

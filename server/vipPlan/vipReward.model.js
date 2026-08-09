const mongoose = require("mongoose");

const VIPRewardSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    type: { type: String, default: "ASSET" }, // ASSET, COIN, DIAMOND, etc.
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: "VIPAsset", default: null },
    image: { type: String, default: "" },
    animation: { type: String, default: "" },
    vipLevel: { type: Number, required: true },
    duration: { type: Number, default: 30 },
    status: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("VIPReward", VIPRewardSchema);

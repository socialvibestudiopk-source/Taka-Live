const mongoose = require("mongoose");

const VIPPlanSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    validity: Number,
    validityType: String, // day, month, year
    dollar: Number,
    rupee: Number,
    tag: String,
    level: { type: Number, default: 1 }, // VIP Level (1-6)
    badgeId: { type: mongoose.Schema.Types.ObjectId, ref: "Badge", default: null },
    frameId: { type: mongoose.Schema.Types.ObjectId, ref: "Frame", default: null },
    entranceEffectId: { type: mongoose.Schema.Types.ObjectId, ref: "EntranceEffect", default: null },
    dailyBonus: { type: Number, default: 0 },
    productKey: String,
    isAutoRenew: { type: Boolean, default: false },
    isDelete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("VIPPlan", VIPPlanSchema);

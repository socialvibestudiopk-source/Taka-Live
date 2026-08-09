const mongoose = require("mongoose");

const roleAssetRuleSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["OWNER", "OFFICIAL", "MANAGER", "SUPER_ADMIN", "BD_LEADER", "BD", "AGENCY", "HOST", "COINS_SELLER"],
      required: true
    },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    autoAssign: { type: Boolean, default: true },
    autoEquip: { type: Boolean, default: true },
    duration: { type: Number, default: 0 }, // 0 for permanent as long as role exists
    status: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

roleAssetRuleSchema.index({ role: 1, assetId: 1 }, { unique: true });

module.exports = mongoose.model("RoleAssetRule", roleAssetRuleSchema);

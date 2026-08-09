const mongoose = require("mongoose");

const assetInventorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    assetType: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    source: {
        type: String,
        enum: ["OWNER_GIFT", "OWNER_ASSIGNMENT", "ROLE_AUTO_ASSIGN", "STORE_PURCHASE", "VIP_REWARD", "SYSTEM_REWARD", "OTHER"],
        default: "OTHER"
    },
    roleAssigned: { type: String, default: null }, // Role name if assigned via role
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    assignedAt: { type: Date, default: Date.now },
    expiration: { type: Date, default: null }, // null means permanent
    equipped: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

assetInventorySchema.index({ userId: 1, assetId: 1 }, { unique: true });
assetInventorySchema.index({ userId: 1, equipped: 1 });

module.exports = mongoose.model("AssetInventory", assetInventorySchema);

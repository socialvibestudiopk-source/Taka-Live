const mongoose = require("mongoose");

const assetAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    actorRole: { type: String },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    action: {
        type: String,
        enum: [
            "ASSET_CREATED", "ASSET_UPDATED", "ASSET_DELETED",
            "ASSET_ASSIGNED", "ASSET_GIFTED", "ASSET_EQUIPPED",
            "ASSET_UNEQUIPPED", "ROLE_ASSET_RULE_CREATED",
            "ROLE_ASSET_RULE_UPDATED", "ROLE_ASSET_RULE_DISABLED",
            "ASSET_REMOVED"
        ],
        required: true
    },
    details: { type: String },
    previousState: { type: Object },
    newState: { type: Object },
    timestamp: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("AssetAuditLog", assetAuditLogSchema);

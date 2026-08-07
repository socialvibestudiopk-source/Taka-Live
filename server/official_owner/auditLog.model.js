const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    officialId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: String, // e.g., "BAN_USER", "ADJUST_WALLET", "UPDATE_SETTING"
    module: String, // e.g., "USER_MGMT", "FINANCE", "SYSTEM"
    targetId: { type: mongoose.Schema.Types.ObjectId },
    details: {
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    },
    ip: String,
    device: String,
    browser: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("OfficialAuditLog", auditLogSchema);

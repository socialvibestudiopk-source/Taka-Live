const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: String, // e.g., "BAN_USER", "ADD_COINS"
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    device: String,
    details: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    action: String, // e.g., "BAN_USER", "UPDATE_SETTING"
    targetId: mongoose.Schema.Types.ObjectId,
    targetModel: String,
    details: Object,
    ip: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);

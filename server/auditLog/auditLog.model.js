const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    action: { type: String, default: "" }, // e.g. "Update User Wallet", "Ban User"
    details: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);

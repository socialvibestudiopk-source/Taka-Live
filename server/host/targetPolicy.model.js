const mongoose = require("mongoose");

const targetPolicySchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    revenueTarget: { type: Number, default: 0 },
    hourTarget: { type: Number, default: 0 },
    frequency: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY"], default: "MONTHLY" },
    status: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("TargetPolicy", targetPolicySchema);

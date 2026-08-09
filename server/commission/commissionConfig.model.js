const mongoose = require("mongoose");

const commissionConfigSchema = new mongoose.Schema(
  {
    role: { type: String, required: true }, // e.g. "agency", "bd", "bd_leader", "host"
    commissionType: { type: String, enum: ["PERCENTAGE", "FIXED_AMOUNT", "TIERED"], default: "PERCENTAGE" },
    rate: { type: Number, default: 0 }, // percentage or fixed amount
    minimumThreshold: { type: Number, default: 0 },
    maximumThreshold: { type: Number, default: null },
    currency: { type: String, default: "USD" },
    status: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date, default: null },
    version: { type: Number, default: 1 },
    reason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("CommissionConfig", commissionConfigSchema);

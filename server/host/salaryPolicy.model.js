const mongoose = require("mongoose");

const salaryPolicySchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Optional user-specific policy
    type: { type: String, enum: ["FIXED", "PERFORMANCE", "TARGET", "COMMISSION", "HYBRID"], default: "COMMISSION" },
    baseSalary: { type: Number, default: 0 },
    minimumWork: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("SalaryPolicy", salaryPolicySchema);

const mongoose = require("mongoose");

const commissionTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    sourceType: { type: String, enum: ["HOST_WORK", "AGENCY_WORK", "BD_TEAM_WORK", "RECHARGE"], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId }, // e.g. Reference to Wallet record or Host history
    grossAmount: { type: Number, default: 0 },
    qualifyingAmount: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    commissionVersion: { type: Number },
    configId: { type: mongoose.Schema.Types.ObjectId, ref: "CommissionConfig" },
    status: {
        type: String,
        enum: ["PENDING", "ELIGIBLE", "APPROVED", "REJECTED", "ON_HOLD", "PAID", "CANCELLED", "REVERSED"],
        default: "PENDING"
    },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    notes: { type: String },
    paymentReference: { type: String }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("CommissionTransaction", commissionTransactionSchema);

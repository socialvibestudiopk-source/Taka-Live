const mongoose = require("mongoose");

const agencyApplicationSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "DECLINED", "CANCELLED"],
        default: "PENDING"
    },
    declineReason: { type: String },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Agency Owner
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("AgencyApplication", agencyApplicationSchema);

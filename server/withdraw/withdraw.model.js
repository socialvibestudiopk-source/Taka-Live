const mongoose = require("mongoose");

const withdrawSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rCoin: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }, // Monetary value
    paymentGateway: String,
    paymentDetails: String,
    status: { type: Number, enum: [0, 1, 2], default: 0 }, // 0: Pending, 1: Approved, 2: Rejected
    date: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Withdraw", withdrawSchema);

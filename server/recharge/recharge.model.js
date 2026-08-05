const mongoose = require("mongoose");

const rechargeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    coin: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    paymentGateway: String,
    transactionId: String,
    status: { type: Number, enum: [0, 1, 2], default: 0 }, // 0: Pending, 1: Success, 2: Failed
    date: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Recharge", rechargeSchema);

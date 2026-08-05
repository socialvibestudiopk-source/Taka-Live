const mongoose = require("mongoose");

const luckyDrawSchema = new mongoose.Schema(
  {
    name: String,
    coinPrice: { type: Number, default: 0 },
    prizes: [{
        itemType: { type: String, enum: ["COIN", "DIAMOND", "FRAME", "BADGE", "TAG", "VIP"] },
        itemId: mongoose.Schema.Types.ObjectId, // if item like frame
        amount: Number, // if coin
        probability: Number, // 0-100
        image: String
    }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("LuckyDraw", luckyDrawSchema);

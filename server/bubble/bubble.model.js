const mongoose = require("mongoose");

const bubbleSchema = new mongoose.Schema(
  {
    image: String,
    name: String,
    coin: { type: Number, default: 0 },
    isVip: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Bubble", bubbleSchema);

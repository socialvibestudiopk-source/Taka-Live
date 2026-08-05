const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema(
  {
    image: String,
    name: { type: String, default: "" },
    type: { type: Number, enum: [0, 1], default: 0 }, // 0: Normal, 1: VIP
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Badge", badgeSchema);

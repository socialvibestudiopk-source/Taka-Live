const mongoose = require("mongoose");

const entranceEffectSchema = new mongoose.Schema(
  {
    image: String, // SVGA/GIF
    name: String,
    coin: { type: Number, default: 0 },
    isVip: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("EntranceEffect", entranceEffectSchema);

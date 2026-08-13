const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    image: String,
    coin: Number,
    type: { type: Number, enum: [0, 1, 2], default: 0 }, //0 : image , 1 : gif, 2: svga
    category: { type: mongoose.Schema.Types.ObjectId, ref: "GiftCategory" },
    svga_file: { type: String, default: null }, // If type is 2
    isLucky: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Gift", giftSchema);

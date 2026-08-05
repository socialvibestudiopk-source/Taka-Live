const mongoose = require("mongoose");

const frameSchema = new mongoose.Schema(
  {
    image: String,
    name: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Frame", frameSchema);

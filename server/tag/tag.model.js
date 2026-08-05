const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    image: String,
    name: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Tag", tagSchema);

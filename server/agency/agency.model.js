const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, unique: true },
    password: { type: String },
    code: { type: String, unique: true },
    image: { type: String, default: "" },
    commission: { type: Number, default: 0 },
    isBlock: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Agency", agencySchema);

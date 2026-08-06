const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bdId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // Business Development link
    code: { type: String, unique: true },
    commission: { type: Number, default: 0 }, // Agency percentage
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Agency", agencySchema);

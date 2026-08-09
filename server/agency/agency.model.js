const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, default: "" },
    bio: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bdId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Assigned Business Developer
    whatsappNumber: { type: String },
    country: { type: String },
    code: { type: String, unique: true },
    hostCount: { type: Number, default: 0 },
    activeHostCount: { type: Number, default: 0 },
    totalWork: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Agency", agencySchema);

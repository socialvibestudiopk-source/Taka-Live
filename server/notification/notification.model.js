const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    image: { type: String, default: "" },
    type: { type: String, default: "" }, // e.g. "ROLE_INVITATION"
    itemId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ID of the related object (e.g. Invitation ID)
    date: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);

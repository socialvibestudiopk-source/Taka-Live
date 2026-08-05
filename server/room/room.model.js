const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    roomImage: String,
    roomWelcomeMsg: String,
    category: String,
    password: { type: String, default: "" },
    isLocked: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    seats: { type: Number, default: 8 },
    activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    revenue: { type: Number, default: 0 },
    isLive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Room", roomSchema);

const mongoose = require("mongoose");

const agencyInvitationSchema = new mongoose.Schema(
  {
    bdId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUserUniqueId: { type: Number },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"],
      default: "PENDING"
    },
    message: { type: String, default: "Invite to become an Agency" },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("AgencyInvitation", agencyInvitationSchema);

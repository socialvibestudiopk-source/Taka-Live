const mongoose = require("mongoose");

const bdInvitationSchema = new mongoose.Schema(
  {
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"],
      default: "PENDING"
    },
    message: { type: String, default: "Invite to become a Business Developer" },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("BDInvitation", bdInvitationSchema);

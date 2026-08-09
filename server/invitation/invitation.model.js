const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["OFFICIAL", "MANAGER", "SUPER_ADMIN", "BD_LEADER", "BD", "AGENCY", "HOST", "COINS_SELLER"],
      required: true
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Target User
    name: { type: String }, // Display name for invitation
    contact: { type: String }, // Phone or Email

    // For BD/Agency/Host relationships
    bdLeaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bdId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },

    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // Admin/Owner who sent it
    senderRole: { type: String },

    message: { type: String, default: "" },
    commission: { type: Number, default: 0 },
    region: { type: String, default: null },

    status: { type: String, enum: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED", "REJECTED"], default: "PENDING" },
    expiryDate: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Invitation", invitationSchema);

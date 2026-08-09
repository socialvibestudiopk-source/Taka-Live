const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
    type: {
      type: String,
      enum: ["FRAME", "BADGE", "VEHICLE", "BUBBLE", "MEDAL", "TAG", "NAMEPLATE", "THEME", "MODEL"],
      required: true
    },
    category: {
      type: String,
      enum: ["STORE", "MANAGEMENT", "VIP", "OFFICIAL", "MANAGER", "SUPER_ADMIN", "BD_LEADER", "BD", "AGENCY", "HOST", "SPECIAL", "MODEL"],
      default: "STORE"
    },
    price: { type: Number, default: 0 },
    duration: { type: Number, default: 30 }, // Days, 0 for permanent

    // Requirements
    minLevel: { type: Number, default: 0 },
    vipRequired: { type: Boolean, default: false },
    roleRequired: { type: String, default: null }, // If specific role needed

    // Status
    isActive: { type: Boolean, default: true },
    isOfficial: { type: Boolean, default: false }, // System-assigned
    displayOrder: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Asset", assetSchema);

const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    image: { type: String, default: "" }, // Cloudinary URL
    type: {
      type: String,
      enum: ["OFFICIAL", "VERIFIED", "HOST", "AGENCY", "STAFF", "VIP", "LEVEL", "ACHIEVEMENT", "EVENT"],
      default: "ACHIEVEMENT"
    },
    is_animated: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    role_required: { type: String, default: null }, // Link to app role
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Badge", badgeSchema);

const mongoose = require("mongoose");

const familySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    image: { type: String, default: "" },
    description: { type: String, default: "Welcome to our family!" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    totalDiamonds: { type: Number, default: 0 }, // Gift contribution
    is_active: { type: Boolean, default: true },
    uniqueId: { type: Number, unique: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Family", familySchema);

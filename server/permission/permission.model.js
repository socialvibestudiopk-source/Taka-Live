const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. "users.ban"
    description: { type: String },
    category: { type: String }, // e.g. "Users", "Finance"
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Permission", permissionSchema);
